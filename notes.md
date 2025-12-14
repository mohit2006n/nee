- i want entire project be lightweight.
- address all edge cases and handle them but i want fast performance and speed , optimize and efficiecent. and production grade ready code , write the best possible code future prove.
- faster animatioin,
- make everything seamless.
- optimize by removing unnecessary , unwant and redudant code. 
- make the code lightweight with as less code as possible.
- remove duplicate codes.

is everything reusable, lightweight, seamless, flawless, consistent, and tightly integrated unstyled headless ui component library




Reusable, lightweight, seamless, flawless, consistent, and tightly integrated unstyled headless UI component library

Key Requirements:
Native HTML-first - Use semantic HTML elements where possible (<dialog>, <details>, <progress>, etc.)
Pure CSS where possible - Tooltip is pure CSS with no JavaScript
CSS Anchor Positioning - Dropdown uses native CSS Anchor Positioning instead of JavaScript positioning
Popover API - All floating elements use the native Popover API
No bloatware - Remove duplicate code, keep it as lightweight as possible
Primitives as building blocks - Reusable primitives (dismissable, floating, roving-focus, scroll-lock, focus-scope, portal) that components compose
ShadCN-style structure - Each component in its own folder with JS + CSS together
Unstyled by default - Components set only ARIA/functional attributes, all visual styling is optional CSS
No translate for tooltips - Tooltip centering without using transform: translate (though we ended up using it as it's the only reliable pure CSS solution)
Showcase files - Each component has an HTML demo that imports the component's CSS and JS


index.js           ← JS exports
index.css          ← CSS bundle
css/globals.css    ← Base reset
js/                ← Primitives
components/        ← Each component has folder with JS + CSS
docs/              ← Showcase HTML files