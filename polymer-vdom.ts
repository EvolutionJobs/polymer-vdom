import { Builder } from './Builder.js'

export function WithVdom<T extends Constructor<Element>>(Base: T) {
    return class extends Base {
        /** Render JSX content in the shadow root of this element
         * @param vdom The JSX output to render.
         * @returns The root DOM node created. */
        render(vdom: JSX.Element): Node {
            const r = this.shadowRoot || this.attachShadow({ mode: 'open' });
            if (vdom.render && typeof vdom.render === 'function')
                vdom.render(r);

            return Builder.render(vdom, r);
        }
    }
}

export default WithVdom;