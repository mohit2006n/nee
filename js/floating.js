/**
 * Floating UI Engine (Lightweight)
 * =================================
 * Custom positioning engine for headless UI components.
 * Compatible with @floating-ui/dom API for future migration.
 * 
 * Core: computePosition, autoUpdate
 * Middleware: offset, flip, shift, size, autoPlacement, hide, inline
 */

const { min, max, round, abs } = Math;

// ============================================
// CORE
// ============================================

/**
 * Computes position for floating element relative to reference.
 */
async function computePosition(reference, floating, options = {}) {
    const { placement = 'bottom', strategy = 'absolute', middleware = [] } = options;
    const rects = getRects(reference, floating, strategy);
    let { x, y } = computeCoords(rects, placement);

    let state = {
        x, y, placement, strategy, rects,
        initialPlacement: placement,
        middlewareData: {},
        elements: { reference, floating }
    };

    // Process middleware pipeline
    for (const mw of middleware) {
        const result = await mw.fn(state);

        if (result.x != null) state.x = result.x;
        if (result.y != null) state.y = result.y;
        if (result.data) state.middlewareData[mw.name] = { ...state.middlewareData[mw.name], ...result.data };

        // Handle reset (e.g., flip changed placement)
        if (result.reset) {
            state.placement = result.reset.placement ?? state.placement;
            state.rects = result.reset.rects ?? state.rects;
            const next = result.reset.keepMiddleware ? middleware : middleware.filter(m => m.name !== mw.name);
            return computePosition(reference, floating, { ...options, placement: state.placement, middleware: next });
        }
    }

    // Apply final position
    Object.assign(floating.style, {
        position: strategy,
        left: `${round(state.x)}px`,
        top: `${round(state.y)}px`
    });

    return state;
}

/**
 * Auto-updates position on scroll/resize.
 */
function autoUpdate(reference, floating, update, options = {}) {
    const { ancestorScroll = true, ancestorResize = true, elementResize = true, animationFrame = false } = options;
    const cleanups = [];

    const ancestors = (ancestorScroll || ancestorResize) ? getOverflowAncestors(reference) : [];

    if (ancestorScroll) {
        for (const el of ancestors) cleanups.push(on(el, 'scroll', update));
        cleanups.push(on(window, 'scroll', update));
    }

    if (ancestorResize) {
        cleanups.push(on(window, 'resize', update));
    }

    if (elementResize && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(update);
        ro.observe(reference);
        ro.observe(floating);
        cleanups.push(() => ro.disconnect());
    }

    if (animationFrame) {
        let id;
        const loop = () => { update(); id = requestAnimationFrame(loop); };
        loop();
        cleanups.push(() => cancelAnimationFrame(id));
    }

    update();
    return () => cleanups.forEach(fn => fn());
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Adds spacing between reference and floating.
 */
const offset = (value = 0) => ({
    name: 'offset',
    fn: ({ x, y, placement }) => {
        const side = getSide(placement);
        const { mainAxis = 0, crossAxis = 0 } = typeof value === 'number' ? { mainAxis: value } : value;

        const offsets = {
            top: { x: crossAxis, y: -mainAxis },
            bottom: { x: crossAxis, y: mainAxis },
            left: { x: -mainAxis, y: crossAxis },
            right: { x: mainAxis, y: crossAxis }
        };

        return { x: x + offsets[side].x, y: y + offsets[side].y };
    }
});

/**
 * Flips to opposite side if overflowing.
 */
const flip = (options = {}) => ({
    name: 'flip',
    fn: async (state) => {
        if (state.middlewareData.flip?.skip) return {};

        const overflow = await detectOverflow(state, options);
        const side = getSide(state.placement);

        if (overflow[side] > 0) {
            return { reset: { placement: getOpposite(state.placement) }, data: { skip: true } };
        }
        return {};
    }
});

/**
 * Shifts along axis to stay in view.
 */
const shift = (options = {}) => ({
    name: 'shift',
    fn: async (state) => {
        const overflow = await detectOverflow(state, options);
        const isVert = isVertical(state.placement);
        let { x, y } = state;

        if (isVert) {
            if (overflow.left > 0) x += overflow.left;
            if (overflow.right > 0) x -= overflow.right;
        } else {
            if (overflow.top > 0) y += overflow.top;
            if (overflow.bottom > 0) y -= overflow.bottom;
        }

        return { x, y };
    }
});

/**
 * Constrains size to available space.
 */
const size = (options = {}) => ({
    name: 'size',
    fn: async (state) => {
        const { apply, ...detectOpts } = options;
        if (!apply) return {};

        const overflow = await detectOverflow(state, detectOpts);
        const { placement, rects, elements } = state;

        const availableHeight = max(0, window.innerHeight - overflow.top - overflow.bottom);
        const availableWidth = max(0, window.innerWidth - overflow.left - overflow.right);

        apply({ availableWidth, availableHeight, elements, rects });
        return {};
    }
});

/**
 * Auto-selects best placement from allowed list.
 */
const autoPlacement = (options = {}) => ({
    name: 'autoPlacement',
    fn: async (state) => {
        if (state.middlewareData.autoPlacement?.skip) return {};

        const { allowedPlacements = ['top', 'bottom', 'left', 'right'] } = options;
        const overflow = await detectOverflow(state, options);
        const side = getSide(state.placement);

        if (overflow[side] <= 0) return {}; // Current fits

        const next = allowedPlacements.find(p => p !== side);
        return next ? { reset: { placement: next }, data: { skip: true } } : {};
    }
});

/**
 * Detects when reference is hidden (scrolled out of view).
 */
const hide = (options = {}) => ({
    name: 'hide',
    fn: async (state) => {
        const overflow = await detectOverflow(state, { ...options, elementContext: 'reference' });
        const { rects } = state;

        const isHidden =
            overflow.top > rects.reference.height ||
            overflow.bottom > rects.reference.height ||
            overflow.left > rects.reference.width ||
            overflow.right > rects.reference.width;

        return { data: { referenceHidden: isHidden } };
    }
});

/**
 * Handles inline elements (spans across lines).
 */
const inline = () => ({
    name: 'inline',
    fn: () => ({}) // Placeholder for full getClientRects() support
});

// ============================================
// INTERNALS
// ============================================

function getRects(reference, floating, strategy) {
    const ref = reference.getBoundingClientRect();
    const scroll = strategy === 'absolute' ? { x: window.pageXOffset, y: window.pageYOffset } : { x: 0, y: 0 };

    return {
        reference: {
            x: ref.left + scroll.x,
            y: ref.top + scroll.y,
            width: ref.width,
            height: ref.height,
            top: ref.top + scroll.y,
            bottom: ref.bottom + scroll.y,
            left: ref.left + scroll.x,
            right: ref.right + scroll.x
        },
        floating: { width: floating.offsetWidth, height: floating.offsetHeight }
    };
}

function computeCoords({ reference: ref, floating: float }, placement) {
    const [side, align] = placement.split('-');
    const centerX = ref.x + ref.width / 2 - float.width / 2;
    const centerY = ref.y + ref.height / 2 - float.height / 2;

    const coords = {
        top: { x: centerX, y: ref.y - float.height },
        bottom: { x: centerX, y: ref.y + ref.height },
        left: { x: ref.x - float.width, y: centerY },
        right: { x: ref.x + ref.width, y: centerY }
    };

    let { x, y } = coords[side];

    if (align) {
        const isVert = side === 'top' || side === 'bottom';
        if (isVert) x = align === 'start' ? ref.x : ref.x + ref.width - float.width;
        else y = align === 'start' ? ref.y : ref.y + ref.height - float.height;
    }

    return { x, y };
}

async function detectOverflow(state, options = {}) {
    const { x, y, rects, strategy } = state;
    const { padding = 0, elementContext = 'floating', boundary } = options;

    const element = elementContext === 'floating'
        ? { x, y, width: rects.floating.width, height: rects.floating.height }
        : rects.reference;

    const p = typeof padding === 'number'
        ? { top: padding, right: padding, bottom: padding, left: padding }
        : { top: 0, right: 0, bottom: 0, left: 0, ...padding };

    // Calculate element rect relative to viewport
    const viewportOffset = strategy === 'fixed' ? { x: 0, y: 0 } : { x: window.pageXOffset, y: window.pageYOffset };

    // Boundary rect (viewport or custom element)
    let boundaryRect;

    if (boundary instanceof Element) {
        const br = boundary.getBoundingClientRect();
        // If strategy is absolute, we need to account for scroll if the boundary is the offset parent,
        // but for simplicity in this lightweight engine, we compares visual rects in viewport space (mostly).
        // Let's normalize everything to viewport coordinates for comparison.
        boundaryRect = {
            top: br.top,
            bottom: br.bottom,
            left: br.left,
            right: br.right
        };
    } else {
        // Viewport
        boundaryRect = {
            top: 0,
            bottom: window.innerHeight,
            left: 0,
            right: window.innerWidth
        };
    }

    // Element rect in viewport coordinates
    // state.x/y are relative to offsetParent (scrolled space if absolute).
    // We need to convert them back to viewport relative for comparison against viewport-relative boundary.
    // This is a simplification; full Floating UI handles this more robustly.
    const elementRect = {
        top: element.y - viewportOffset.y,
        bottom: element.y - viewportOffset.y + element.height,
        left: element.x - viewportOffset.x,
        right: element.x - viewportOffset.x + element.width
    };

    return {
        top: boundaryRect.top - elementRect.top + p.top,
        bottom: elementRect.bottom - boundaryRect.bottom + p.bottom,
        left: boundaryRect.left - elementRect.left + p.left,
        right: elementRect.right - boundaryRect.right + p.right
    };
}

// Helpers
const getSide = (placement) => placement.split('-')[0];
const isVertical = (placement) => ['top', 'bottom'].includes(getSide(placement));
const getOpposite = (placement) => {
    const map = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    return placement.replace(/top|bottom|left|right/g, m => map[m]);
};

function getOverflowAncestors(node) {
    const list = [];
    let parent = node.parentNode;
    while (parent && parent !== document.body) {
        const overflow = getComputedStyle(parent).overflow;
        if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') list.push(parent);
        parent = parent.parentNode;
    }
    return list;
}

const on = (node, event, handler) => {
    node.addEventListener(event, handler, { passive: true });
    return () => node.removeEventListener(event, handler);
};

// ============================================
// EXPORTS
// ============================================

export {
    computePosition,
    autoUpdate,
    offset,
    flip,
    shift,
    size,
    autoPlacement,
    hide,
    inline,
    detectOverflow
};
