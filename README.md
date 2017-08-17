# Polymer VDOM

I like React, especially its core idea of Virtual DOM - objects that represent the DOM and can be merged with it rapidly, allowing it to rapidly and easily build and alter large amounts of HTML. React uses JSX tools to build low level JS.

I like Polymer, expecially its core idea of **#UseThePlatform** - it extends and shims web components and shadow DOM to make them easier to build applications rapidly. Polymer doesn't help with building lots of dynamic HTML content - `dom-if` and `dom-repeat` templates are useful, but painful where a lot of content can change.

React has it's own component model, which I don't like. It seems to make a lot of sense to use the component model that's actually build into the browser, rather than a proprietary one (even if it's good, and React's is). Polymer uses platform component model.

Polymer components can be used (to some extent) in React JSX, but not the other way round. Downloading all of React (or even Preact) just to use the JSX VDOM builder is a lot of overhead. 

The goal of this project is to use JSX tools (where appropriate) to build the shadow DOM in Polymer components, with minimal overhead.
