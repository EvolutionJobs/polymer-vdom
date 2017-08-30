import { Builder } from './Builder.js';
export function WithVdom(Base) {
    return class extends Base {
        render(vdom) {
            const r = this.shadowRoot || this.attachShadow({ mode: 'open' });
            if (vdom.render && typeof vdom.render === 'function')
                vdom.render(r);
            return Builder.render(vdom, r);
        }
    };
}
export default WithVdom;
