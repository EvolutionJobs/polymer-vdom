/** JSX element definitions so we can have noImplictAny and TSX files. */
declare namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any;
    }
    interface Element {
        render(root?: Node | null): Node;
    }
}