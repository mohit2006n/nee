/**
 * Portal Primitive
 * ----------------
 * Moves an element to a new location in the DOM.
 * Lightweight wrapper around appendChild.
 */
export function portal(element, target = document.body) {
    if (typeof target === 'string') target = document.querySelector(target);
    if (!element || !target) return { destroy: () => {} };

    const parent = element.parentNode;
    target.appendChild(element);

    return {
        destroy: () => {
            if (element.parentNode === target && parent) {
                parent.appendChild(element);
            }
        }
    };
}
