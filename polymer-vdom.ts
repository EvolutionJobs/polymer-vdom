namespace Evolution {
    /** Polymer Virtual DOM base class. */
    export class PolymerVdom extends Polymer.Element {

        /** Render JSX content in the shadow root of this element
         * @param vdom The JSX output to render.
         * @returns The root DOM node created. */
        render(vdom: JSX.Element): Node {
            const r = this.shadowRoot || this.attachShadow({ mode: 'open' });
            if (vdom.render && typeof vdom.render === 'function')
                vdom.render(r);

            return Evolution.Builder.render(vdom, r);
        }
    }
}