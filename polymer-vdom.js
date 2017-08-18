var Evolution;
(function (Evolution) {
    function eventProxy(e) {
        const action = this._listeners[e.type];
        return action.call(this, e);
    }
    class Builder {
        static setPropOrAttr(element, name, value, isSvg) {
            if (name === 'class' || name === 'className') {
                element.setAttribute('class', value || '');
                if (!isSvg)
                    element.className = value || '';
            }
            else if (name === 'key' || name === 'children') {
            }
            else if (name === 'style') {
                if (!value || typeof value === 'string')
                    element.style.cssText = value || '';
                else
                    for (const rule in value) {
                        let ruleValue = value[rule];
                        if (typeof ruleValue === 'number' &&
                            !Builder.nonPxStyleProps.has(rule) &&
                            ruleValue > 0)
                            ruleValue = `${ruleValue}px`;
                        element.style[rule] = ruleValue;
                    }
            }
            else if (name === 'dangerouslySetInnerHTML') {
                if (value)
                    element.innerHTML = value.__html || '';
            }
            else if (name[0] == 'o' && name[1] == 'n') {
                name = name.toLowerCase().substring(2);
                if (value && typeof value === 'function')
                    element.addEventListener(name, eventProxy);
                else
                    element.removeEventListener(name, eventProxy);
                (element._listeners || (element._listeners = {}))[name] = value;
            }
            else if (name !== 'list' && name !== 'type' && !isSvg && name in element) {
                try {
                    element[name] = value == null ? '' : value;
                }
                catch (e) { }
                if (value == null || value === false)
                    element.removeAttribute(name);
            }
            else {
                const hypenatedAttrName = name.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`);
                if (value == null || value === false)
                    element.removeAttribute(hypenatedAttrName);
                else
                    element.setAttribute(hypenatedAttrName, value);
            }
        }
        static createFromType(type, isSvg) {
            if (typeof type === 'function')
                return new type();
            if (isSvg)
                return document.createElementNS('http://www.w3.org/2000/svg', type);
            return document.createElement(type);
        }
        static removeElement(remove, from) {
            from.removeChild(remove);
            const listeners = remove._listeners;
            if (listeners) {
                for (const evtName in listeners)
                    remove.removeEventListener(evtName, eventProxy);
                remove._listeners = undefined;
            }
            Builder.removeChildren(remove);
        }
        static removeChildren(ele) {
            let node = ele.lastChild;
            while (node) {
                let next = node.previousSibling;
                Builder.removeElement(node, ele);
                node = next;
            }
        }
        static replaceElement(element, replaces, parent) {
            parent.replaceChild(element, replaces);
            Builder.removeElement(replaces, parent);
        }
        static addChildren(ele, children) {
            for (const child of children)
                ele.appendChild((typeof child === 'string' || typeof child === 'number') ?
                    document.createTextNode(child) :
                    Builder.diffVirt(child, ele));
            return children.length;
        }
        static diffChildren(ele, children) {
            const fc = ele.firstChild;
            if (fc == null)
                return Builder.addChildren(ele, children);
            const sourceLen = children.length;
            if (sourceLen === 0)
                return Builder.removeChildren(ele) || 0;
            if (children.length === 1 &&
                fc.nextSibling == null) {
                const child = children[0];
                if (typeof child === 'string' || typeof child === 'number') {
                    if (fc.splitText !== undefined) {
                        if (fc.nodeValue != child)
                            fc.nodeValue = child;
                    }
                    else
                        Builder.replaceElement(document.createTextNode(child), fc, ele);
                }
                else if (Builder.tagMatch(child, fc))
                    Builder.diffVirt(child, ele, fc);
                else
                    Builder.replaceElement(Builder.diffVirt(child, ele), fc, ele);
                return 1;
            }
            const mergeChildren = ele.childNodes;
            const mergeLen = mergeChildren.length;
            const mergeLookup = {};
            const mergeUnKeyed = [];
            let keyCount = 0;
            for (let i = 0; i < mergeLen; i++) {
                const target = mergeChildren[i];
                const key = target['key'];
                if (key) {
                    keyCount++;
                    mergeLookup[key] = target;
                }
                else
                    mergeUnKeyed[i] = target;
            }
            let zipPoint = 0;
            for (let i = 0; i < sourceLen; i++) {
                const child = children[i];
                let target;
                if (keyCount && typeof child !== 'string' && typeof child !== 'number') {
                    const key = child.props ? child.props['key'] : null;
                    if (key) {
                        target = mergeLookup[key];
                        if (target) {
                            mergeLookup[key] = undefined;
                            keyCount--;
                        }
                    }
                }
                if (!target && zipPoint < mergeUnKeyed.length) {
                    for (let j = zipPoint; j < mergeUnKeyed.length; j++) {
                        const unkeyed = mergeUnKeyed[j];
                        if (unkeyed !== undefined && Builder.tagMatch(child, unkeyed)) {
                            target = unkeyed;
                            mergeUnKeyed[j] = undefined;
                            if (j === zipPoint)
                                zipPoint++;
                            break;
                        }
                    }
                }
                if (!target) {
                    const newNode = (typeof child === 'string' || typeof child === 'number') ?
                        document.createTextNode(child) :
                        Builder.diffVirt(child, ele);
                    const original = mergeChildren[i];
                    if (!original)
                        ele.appendChild(newNode);
                    else
                        ele.insertBefore(newNode, original);
                }
                else if (typeof child === 'string' || typeof child === 'number') {
                    if (target.nodeValue != child)
                        target.nodeValue = child;
                }
                else
                    Builder.diffVirt(child, ele, target);
            }
            if (keyCount) {
                for (let i in mergeLookup) {
                    const unused = mergeLookup[i];
                    if (unused)
                        Builder.removeElement(unused, ele);
                }
            }
            for (const unused of mergeUnKeyed)
                if (unused)
                    Builder.removeElement(unused, ele);
            return sourceLen;
        }
        static tagMatch(source, target) {
            if (!target)
                return false;
            if (typeof source === 'string' || typeof source === 'number')
                return target.splitText !== undefined;
            if (typeof source.type === 'function')
                return false;
            if (!target.nodeName)
                return false;
            return target.nodeName.toLowerCase() === source.type.toLowerCase();
        }
        static diffVirt(element, root, merge) {
            const isSvg = element.type === 'svg' || (!!root && (root instanceof SVGElement));
            const domEle = merge || Builder.createFromType(element.type, isSvg);
            if (element.props) {
                domEle['key'] = element.props.key;
                if (element.props.children) {
                    const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
                    if (merge)
                        Builder.diffChildren(domEle, children);
                    else
                        Builder.addChildren(domEle, children);
                }
                for (const prop in element.props)
                    Builder.setPropOrAttr(domEle, prop, element.props[prop], isSvg);
            }
            return domEle;
        }
        static render(element, root, merge) {
            if (merge) {
                if (!root)
                    throw new Error(`Cannot merge a node in a disconnected DOM`);
                else if (!Builder.tagMatch(element, merge))
                    throw new Error(`Cannot merge ${element.type} with ${merge.nodeName}`);
            }
            else if (root && element.props && element.props['key']) {
                const rootChildren = root.childNodes;
                const key = element.props['key'];
                for (let i = 0; i < rootChildren.length; i++) {
                    const child = rootChildren[i];
                    if (child &&
                        child['key'] === key &&
                        Builder.tagMatch(element, child)) {
                        merge = child;
                        break;
                    }
                }
            }
            const isSvg = element.type === 'svg' || (!!root && (root instanceof SVGElement));
            const domEle = Builder.diffVirt(element, root, merge);
            if (root && !merge)
                root.appendChild(domEle);
            return domEle;
        }
        static createElement(tag, properties = null, ...children) {
            const result = {
                type: tag.toLowerCase(),
                render: root => Builder.render(result, root)
            };
            const c = [];
            if (children)
                for (const v of children) {
                    if (!v)
                        continue;
                    if (Array.isArray(v))
                        c.push(...v);
                    else
                        c.push(v);
                }
            if (properties || c.length > 0) {
                if (typeof properties === 'string') {
                    c.push(properties);
                    result.props = {};
                }
                else
                    result.props = properties || {};
                if (c.length > 0)
                    result.props.children = c;
            }
            return result;
        }
    }
    Builder.nonPxStyleProps = new Set(['boxFlex', 'boxFlexGroup', 'columnCount', 'fillOpacity', 'flex', 'flexGrow', 'flexPositive', 'flexShrink', 'flexNegative', 'fontWeight', 'lineClamp', 'lineHeight', 'opacity', 'order', 'orphans', 'strokeOpacity', 'widows', 'zIndex', 'zoom']);
    Evolution.Builder = Builder;
})(Evolution || (Evolution = {}));
const h = Evolution.Builder.createElement;
var Evolution;
(function (Evolution) {
    class PolymerVdom extends Polymer.Element {
        render(vdom) {
            return vdom.render(this.shadowRoot || this.attachShadow({ mode: 'open' }));
        }
    }
    Evolution.PolymerVdom = PolymerVdom;
})(Evolution || (Evolution = {}));
