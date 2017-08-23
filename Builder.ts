namespace Evolution {

    /** Generic event proxy that fires an event from a _listeners collection.
     * This allows us to unsubscribe from an event without access to the original handler.
     * @param {Event} e The event firing.
     * @returns The result of the event fired. */
    function eventProxy(e: Event) {
        const action = this._listeners[e.type];
        return action.call(this, e);
    }

    /** Utility methods for DOM manipulation. */
    export class Builder {

        /** Set of style properties that shouldn't get a ...px suffix if passed as a number */
        static readonly nonPxStyleProps = new Set(['boxFlex', 'boxFlexGroup', 'columnCount', 'fillOpacity', 'flex', 'flexGrow', 'flexPositive', 'flexShrink', 'flexNegative', 'fontWeight', 'lineClamp', 'lineHeight', 'opacity', 'order', 'orphans', 'strokeOpacity', 'widows', 'zIndex', 'zoom']);

        /** Set the DOM property or attribute, with handling for special cases and events.
         * @param {HTMLElement|SVGElement} element The element to set properties against.
         * @param {string} name The name of the property to set.
         * camelCase properties will be converted to slug-case if set to attributes.
         * @param value The value to set.
         * @param {boolean} isSvg Whether to treat this as an SVG */
        private static setPropOrAttr(element: HTMLElement | SVGElement, name: string, value: any, isSvg: boolean): void {
            if (name === 'class' || name === 'className') {
                // CSS class name
                element.setAttribute('class', value || '');
                if (!isSvg)
                    element.className = value || '';
            }
            else if (name === 'key' || name === 'children') {
                // Ignore, set on creation/in DOM and not changed here 
            }
            else if (name === 'style') {
                // Style rules
                if (!value || typeof value === 'string')
                    element.style.cssText = value || '';
                else
                    for (const rule in value) {
                        let ruleValue = value[rule];
                        if (typeof ruleValue === 'number' &&
                            !Builder.nonPxStyleProps.has(rule) &&
                            ruleValue > 0)
                            ruleValue = `${ruleValue}px`;

                        (element.style as any)[rule] = ruleValue;
                    }
            }
            else if (name === 'dangerouslySetInnerHTML') {
                // Workaround to set inner text, best avoided
                if (value) element.innerHTML = value.__html || '';
            }
            else if (name[0] == 'o' && name[1] == 'n' && name.length > 2) {
                // Starts with on, handle Preact onclick or Polymer on-click
                // Note that React's onClick will fail, but case senstitive events will fail otherwise
                name = name.substring(name[2] == '-' ? 3 : 2);
                if (value && typeof value === 'function')
                    element.addEventListener(name, eventProxy);
                else
                    element.removeEventListener(name, eventProxy);

                // In order to be able to remove the reference to the event listener we need to have the subscriber
                ((element as any)._listeners || ((element as any)._listeners = {}))[name] = value;
            }
            else if (name !== 'list' && name !== 'type' && !isSvg && name in element) {
                // If not SVG and a property of the element
                try {
                    // Set a property
                    (element as any)[name] = value == null ? '' : value;
                }
                catch (e) { } // May throw for certain name-value combinations

                if (value == null || value === false)
                    element.removeAttribute(name);
            }
            else {
                // Otherwise add attributes in the element with setAttribute, and fix camelCase variables to camel-case (as attr are case-insensitive while property names don't like hyphens)
                const hypenatedAttrName = name.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`);
                if (value == null || value === false)
                    element.removeAttribute(hypenatedAttrName);
                else
                    element.setAttribute(hypenatedAttrName, value);
            }
        }

        /** Create an instance of an element given the type
         * @param type Either string element name, or class function to call with new keyword.
         * @param isSvg Is this element or its parent an SVG element, ignored if the type is a class.
         * @returns Result of the new declaration or the created element. */
        private static createFromType(type: string | { new(): HTMLElement | SVGElement }, isSvg: boolean): HTMLElement | SVGElement {
            if (typeof type === 'function')
                return new type();

            if (isSvg)
                return document.createElementNS('http://www.w3.org/2000/svg', type);

            return document.createElement(type);
        }

        /** Remove an element from the DOM.
         * @param {Node} remove The node to remove.
         * @param {Node} from The node to remove it from. */
        private static removeElement(remove: Node, from: Node): void {
            from.removeChild(remove);

            // Tidy up events, in case they hold on to the node removed from the DOM
            const listeners = (remove as any)._listeners;
            if (listeners) {
                for (const evtName in listeners)
                    remove.removeEventListener(evtName, eventProxy);

                (remove as any)._listeners = undefined;
            }

            // Tidy children
            Builder.removeChildren(remove);
        }

        /** Remove all the children from a node
         * @param {Node} ele The element to clear children from. */
        private static removeChildren(ele: Node): void {
            // Iterate backwards as it causes less reflow
            let node = ele.lastChild;
            while (node) {
                let next = node.previousSibling;
                Builder.removeElement(node, ele);
                node = next;
            }
        }

        /** Replace an element in the DOM with a new one, and tidy up.
         * @param {Node} element The new element to add
         * @param {Node} replaces The old element to replace and remove.
         * @param {Node} parent The parent of the old element. */
        private static replaceElement(element: Node, replaces: Node, parent: Node): void {
            parent.replaceChild(element, replaces);
            Builder.removeElement(replaces, parent);
        }

        /** Render and add virtual children to a node.
         * @param {Node} ele The element to add the children to.
         * @param children The children to add.
         * @returns {number} The number of children added. */
        private static addChildren(ele: Node, children: (string | number | JSX.Element)[]): number {
            // Not diffing, just add everything
            for (const child of children)
                ele.appendChild((typeof child === 'string' || typeof child === 'number') ?
                    document.createTextNode(child as string) :
                    Builder.diffVirt(child, ele));

            return children.length;
        }

        /** Compare virtual and DOM content, add where missing or mismatched and update where changed.
         * This tries to keep DOM changes to a minimum, and will match by key property or similar tags in sequence.
         * This follows the same [pattern as React]{@link https://facebook.github.io/react/docs/reconciliation.html}
         * @param {Node} ele The element in the DOM to compare and update the children of.
         * @param children The children to add.
         * @returns {number} The number of children added or merged. */
        private static diffChildren(ele: Node, children: (string | number | JSX.Element)[]): number {

            // Simple case: merge target has no children
            const fc = ele.firstChild;
            if (fc == null)
                return Builder.addChildren(ele, children);

            // Simple case: no source children, but target has content - clear it
            const sourceLen = children.length;
            if (sourceLen === 0)
                return Builder.removeChildren(ele) || 0;

            // Fast case: single child to compare in both collections
            if (children.length === 1 &&        // One vDOM child
                fc.nextSibling == null) {       // One target merge child
                const child = children[0];

                // New value is a string or number
                if (typeof child === 'string' || typeof child === 'number') {
                    // If it's a text node update directly
                    if ((fc as any).splitText !== undefined) {
                        // Change the value of the text node, if different
                        if (fc.nodeValue != child)
                            fc.nodeValue = child as string;
                    }
                    else
                        // Otherwise replace what's there with a new text node.
                        Builder.replaceElement(document.createTextNode(child as string), fc, ele);
                }
                else if (Builder.tagMatch(child, fc))
                    // Tags match, merge the child info with the existing element
                    Builder.diffVirt(child, ele, fc);
                else
                    // No tag match and not text, create a new element and replace the old one
                    Builder.replaceElement(Builder.diffVirt(child, ele), fc, ele);

                return 1;
            }

            // Complex case: merge collections of children
            // Pre-parse the DOM into a lookup of keyed and an array of un-keyed
            const mergeChildren = ele.childNodes;
            const mergeLen = mergeChildren.length;
            const mergeLookup: { [key: string]: Node | undefined } = {};
            const mergeUnKeyed: (Node | undefined)[] = [];
            let keyCount = 0;
            for (let i = 0; i < mergeLen; i++) {
                const target = mergeChildren[i];
                const key = (target as any)['key'];
                if (key) {
                    keyCount++;
                    mergeLookup[key] = target;
                }
                else
                    mergeUnKeyed[i] = target;
            }

            // Then iterate the nodes we're adding
            let zipPoint = 0; // Holds the index of where we're up to 'zipping' the two collections
            for (let i = 0; i < sourceLen; i++) {
                const child = children[i];
                let target: Node | undefined;

                // Try a keyed lookup first
                if (keyCount && typeof child !== 'string' && typeof child !== 'number') {
                    const key = child.props ? child.props['key'] : null;
                    if (key) {
                        target = mergeLookup[key];
                        if (target) {
                            // Quicker than delete mergeLookup[key]
                            mergeLookup[key] = undefined;
                            keyCount--;
                        }
                    }
                }

                // If that didn't find a target try by index
                if (!target && zipPoint < mergeUnKeyed.length) {
                    for (let j = zipPoint; j < mergeUnKeyed.length; j++) {
                        const unkeyed = mergeUnKeyed[j];
                        if (unkeyed !== undefined && Builder.tagMatch(child, unkeyed)) {
                            target = unkeyed;
                            mergeUnKeyed[j] = undefined; // Clear it, we don't want the same index twice.

                            if (j === zipPoint)
                                zipPoint++;

                            break;
                        }
                    }
                }

                if (!target) {
                    // No target found - just add the element
                    const newNode = (typeof child === 'string' || typeof child === 'number') ?
                        document.createTextNode(child as string) :
                        Builder.diffVirt(child, ele);

                    // Undefined if index out of range, because nodeList is weird
                    const original = mergeChildren[i];

                    // No original at location, just add to end
                    if (!original)
                        ele.appendChild(newNode);
                    else
                        // Add before the original at this index, we don't replace the original at index here because it might be keyed
                        ele.insertBefore(newNode, original);
                }
                else if (typeof child === 'string' || typeof child === 'number') {
                    // Simple case: setting text content
                    if (target.nodeValue != child)
                        target.nodeValue = child as string;
                }
                else
                    // Update the merged element in place
                    Builder.diffVirt(child, ele, target);
            }

            // Remove unused keyed nodes - anything left in mergeLookup wasn't used.
            if (keyCount) {
                for (let i in mergeLookup) {
                    const unused = mergeLookup[i];
                    if (unused)
                        Builder.removeElement(unused, ele);
                }
            }

            // Remove unused unkeyed nodes - anything left in the array wasn't used.
            for (const unused of mergeUnKeyed)
                if (unused)
                    Builder.removeElement(unused, ele);

            return sourceLen;
        }

        /** Test whether the node is a suitable match for the virtual DOM element.
         * @param source The source content.
         * @param {Node} target The target node.
         * @returns {boolean} true if the content can be applied to the node, false otherwise. */
        private static tagMatch(source: string | number | JSX.Element, target: Node | undefined): boolean {
            if (!target)
                return false;

            // If source is string or number check for presence of  splitText function
            if (typeof source === 'string' || typeof source === 'number')
                return (target as any).splitText !== undefined;

            // Can't merge components yet
            if (typeof source.type === 'function')
                return false;

            if (!target.nodeName)
                return false;

            // True if the tag names match, case insensitive
            return target.nodeName.toLowerCase() === source.type.toLowerCase();
        }

        /** Apply the differences from the virtual element to the merge target or a new element.
         * @param element Virtual DOM element to apply the changes from.
         * @param {Node} [root] Optional root parent of the new node.
         * @param {Node} [merge] Optional merge target, if passed this will be updated.
         * This internal method doesn't validate, so ensure node is valid first
         * @returns {HTMLElement|SVGElement} The DOM element added or updated. */
        private static diffVirt(element: JSX.Element, root?: Node | null, merge?: Node): HTMLElement | SVGElement {
            // Is this an SVG element?
            const isSvg: boolean = element.type === 'svg' || (!!root && (root instanceof SVGElement));

            // Start with the valide merge tag or create a new one
            const domEle = merge as (HTMLElement | SVGElement) || Builder.createFromType(element.type, isSvg);

            if (element.props) {

                // Set key lookup property
                (domEle as any)['key'] = element.props.key;

                if (element.props.children) {
                    // Force children to an array
                    const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
                    if (merge)
                        Builder.diffChildren(domEle, children);
                    else
                        Builder.addChildren(domEle, children);
                }

                // Set all the props/attrs - we don't try to diff these as read-compare-set is slower than set-same-value
                for (const prop in element.props)
                    Builder.setPropOrAttr(domEle, prop, element.props[prop], isSvg);
            }

            return domEle;
        }

        /** Render the given element and optionally add it to the DOM.
         * @param {VirtualElement} element The virtual DOM element to render.
         * @param {Node} [root] Optional parent to add it to.
         * @param {Node} [merge] Optional existing element to diff it against.
         * If not passed root will be checked for any DOM nodes matching the key
         * @returns {HTMLElement|SVGElement} The DOM for the rendered element. */
        static render(element: JSX.Element, root?: Node | null, merge?: Node): Node {

            if (merge) {
                if (!root)
                    // No value merging disconnected DOMs
                    throw new Error(`Cannot merge a node in a disconnected DOM`);

                else if (!Builder.tagMatch(element, merge))
                    // If we're merging an element, it has a tag, and the v-ele has a tag, but the tags don't match
                    throw new Error(`Cannot merge ${element.type} with ${merge.nodeName}`);
            }
            else if (root && element.props && element.props['key']) {
                // Diff merge not passed, but root DOM ele exists and root element has a key
                const rootChildren = root.childNodes;
                const key = element.props['key'];
                for (let i = 0; i < rootChildren.length; i++) {
                    const child = rootChildren[i];

                    // The child has a key that matches and the tag matches too
                    if (child &&
                        (child as any)['key'] === key &&
                        Builder.tagMatch(element, child)) {
                        merge = child;
                        break;
                    }
                }
            }

            // Start with the validated merge tag or create a new one
            const domEle = Builder.diffVirt(element, root, merge);

            // We have a DOM parent and aren't merged with another element
            if (root && !merge)
                root.appendChild(domEle);

            return domEle;
        }

        /** Build an element. Call .render() on the result to add it to the DOM.
         * This should be set as the JSX target.
         * @param {!string} tag The name of the tag to create.
         * @param {string|object} [properties] The object properties or tag attributes.
         * @param {(VirtualElement|string)[]} [children] The children to add to the element, can be text, a single element, or an array of elements.
         * @returns {VirtualElement} The new element */
        static createElement(tag: string,
            properties: string | { [name: string]: any } | null = null,
            ...children: ((JSX.Element | string)[] | JSX.Element | string)[]): JSX.Element {

            // This takes the variety of parameters generated by JSX and converts them into a consistent virtual element structure
            const result: JSX.Element = {
                type: tag.toLowerCase(),
                render: root => Builder.render(result, root)
            };

            // children can be a single value, an [], or an [[]]
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
}

const h = Evolution.Builder.createElement;