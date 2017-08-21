/** JSX element definitions so we can have noImplictAny and TSX files. */
declare namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any;
    }

    /** Properties and children to apply to an element. */
    interface ElementProperties {
        /* Optional key to merge future changes by, should be unique within the parent DOM node. */
        key?: string;

        /** Properties have a string name and can have any value. */
        [name: string]: any;

        /** Children can be text, another element, or a mixed collection of either. */
        children?: string | number | Element | (string | number | Element)[]
    }

    /** Represent a virtual element in the DOM. */
    interface Element {
        /** The tag name of an element or a class function to create one. */
        type: string | { new(): HTMLElement | SVGElement };

        /** Optional properties and children to apply to the element. */
        props?: ElementProperties;

        /** Render this element. */
        render?: (root?: Node | null) => Node;
    }
}