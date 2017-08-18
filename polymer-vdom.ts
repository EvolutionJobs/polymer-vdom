namespace Evolution {
    /** Polymer Virtual DOM base class. */
    export class PolymerVdom extends Polymer.Element {

        /** Render JSX content in the shadow root of this element
         * @param vdom The JSX output to render.
         * @returns The root DOM node created. */
        render(vdom: JSX.Element): Node {
            return vdom.render(this.shadowRoot || this.attachShadow({ mode: 'open' }));
        }
    }
}