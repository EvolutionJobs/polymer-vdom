# Polymer VDOM

I like React, especially its core idea of Virtual DOM - objects that represent the DOM and can be merged with it rapidly, allowing it to quickly and easily build and alter large amounts of HTML. React uses JSX tools to build low level JS.

I like Polymer, expecially its core idea of **#UseThePlatform** - it extends and shims web components and shadow DOM to make them easier to build modular applications. Polymer doesn't help with building lots of dynamic HTML content - `dom-if` and `dom-repeat` templates are useful, but painful where a lot of content can change.

React has its own component model; Polymer uses the platform's component model. It seems to make a lot of sense to use the component model that's actually built into the browser, rather than a proprietary one (even if it's good, and React's is). 

Polymer components can be used (to some extent) in React JSX, but not the other way round (though you can add wrappers to achieve this), and there are a couple of conflicts. Downloading all of React (or even Preact) just to use the JSX VDOM builder is a lot of overhead. 

The goal of this project is to use JSX tools (where appropriate) to build the shadow DOM in Polymer components, with minimal overhead.

## Progress

This project is currently underway and not ready for production:

1. Create VDOM builder that can render JSX output.  DONE
2. Create Polymer behavior/element to make this JSX easy to apply. IN PROGRESS
3. Create tooling process to output `.html` files with embedded JSX output. NOT STARTED

## Demo 

`<calendrical-heatmap>` has a [sample version](https://github.com/EvolutionJobs/calendrical-heatmap/blob/master/calendrical-heatmap.tsx) written using this.

## Set Up

For TypeScript `*.tsx` support include [`builder.ts`](Builder.ts) and [`polymer-vdom.ts`](polymer-vdom.js), and set `tsconfig.json` to tell `tsc` to output `h` when parsing JSX:

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h"
  }
}
```

For JSX `*.jsx` support include [`polymer-vdom.js`](polymer-vdom.js), and update `.babelrc` (assuming Babel 6):

```json
{
  "plugins": [
    ["transform-react-jsx", { "pragma":"h" }]
  ]
}
```

These are the same settings as for Preact, the the config are interchangeable.

## Example

Extend `Evolution.PolymerVdom` instead of `Polymer.Element`. Inside that class you can use `render` to output JSX into the attached shadow DOM:

```js
class VdomTest extends PolymerVdom {
    static get is() { return 'vdom-test'; }

    ready() {
        super.ready();
        super.render(<div>The time is {new Date()}</div>);
    }
}

customElements.define(VdomTest.is, VdomTest);
```

Each time `render()` is called the shadow DOM root is updated with the new JSX content, following the same rules as React for keys:

```js
super.render(<ul>
    <li key="b">B</li>
    <li key="c">C</li>
</ul>);

// This will add the "a" <li> and remove the "c", rather than update two nodes
super.render(<ul>
    <li key="a">A</li>
    <li key="b">B</li>
</ul>);
```

Where this differs from React is the component model - names of component classes wll be ignored. Instead use any tags registered with `customElements.define`:

```js
// Bad
super.render(<div><VdomTest /></div>);

// Good #usetheplatform
super.render(<div><vdom-test></vdom-test></div>);
```

At the moment this code needs to be in a `*.tsx`|`*.jsx` file. Next step will be build tools to add the JSX output to a `<script>` tag in and HTML import.

Events can use React camelCase (`onClick`) or Polymer hyphens (`on-click`).

## Using Without JSX

You can render VDOM without the JSX step:

```js
// Using VDOM objects
super.render({
  type: 'ul',
  props: {
    children: [
      { type: 'li', props: { key: 'a', children: 'A' } },
      { type: 'li', props: { key: 'b', children: 'B' } }
    ]
  })

// Or function calls JSX outputs to
super.render(
  h('ul', null
    h('li', { key: 'a' }, 'A'),
    h('li', { key: 'b' }, 'B'))
```

It's recommended to use TypeScript (or some other type checker) if doing this to find errors at compile time. Implement `JSX.Element` from [JSX.d.ts](JSX.d.ts). 