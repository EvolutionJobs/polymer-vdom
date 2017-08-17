# Polymer VDOM

I like React, especially its core idea of Virtual DOM - objects that represent the DOM and can be merged with it rapidly, allowing it to rapidly and easily build and alter large amounts of HTML. React uses JSX tools to build low level JS.

I like Polymer, expecially its core idea of **#UseThePlatform** - it extends and shims web components and shadow DOM to make them easier to build applications rapidly. Polymer doesn't help with building lots of dynamic HTML content - `dom-if` and `dom-repeat` templates are useful, but painful where a lot of content can change.

React has it's own component model; Polymer uses the platform's component model. It seems to make a lot of sense to use the component model that's actually built into the browser, rather than a proprietary one (even if it's good, and React's is). 

Polymer components can be used (to some extent) in React JSX, but not the other way round, and there are a couple of conflicts. Downloading all of React (or even Preact) just to use the JSX VDOM builder is a lot of overhead. 

The goal of this project is to use JSX tools (where appropriate) to build the shadow DOM in Polymer components, with minimal overhead.

## Progress

This project is currently underway and not ready for production:

1. Create VDOM builder that can render JSX output.  DONE
2. Create Polymer behavior/element to make this JSX easy to apply. IN PROGRESS
3. Create tooling process to output `.html` files with embedded JSX output. NOT STARTED

## Demo 

`<calendrical-heatmap>` has a [sample version](https://github.com/EvolutionJobs/calendrical-heatmap/blob/master/calendrical-heatmap.tsx) written using this.