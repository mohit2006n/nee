/**
 * Focus Scope Primitive
 * ---------------------
 * Focus trapping for modals and overlays.
 */
const scopes = [];
const SELECTOR = 'a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),iframe,object,embed,[contenteditable],[tabindex]:not([tabindex^="-"])';

const isVisible = (el) => {
    return !(!el.offsetWidth && !el.offsetHeight) && getComputedStyle(el).visibility !== 'hidden';
};

const getFocusables = (element) => {
    const nodes = element.querySelectorAll(SELECTOR);
    const result = [];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node.disabled && node.getAttribute('aria-hidden') !== 'true' && isVisible(node)) {
            result.push(node);
        }
    }
    return result;
};

const handleScopeKey = (e, scope) => {
    if (!scope.trap || e.key !== 'Tab') return;

    const focusables = getFocusables(scope.element);
    if (!focusables.length) {
        e.preventDefault();
        return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
        if (active === first || !scope.element.contains(active)) {
            e.preventDefault();
            last.focus();
        }
    } else {
        if (active === last || !scope.element.contains(active)) {
            e.preventDefault();
            first.focus();
        }
    }
};

const onGlobalKeydown = (e) => {
    if (scopes.length) handleScopeKey(e, scopes[scopes.length - 1]);
};

document.addEventListener('keydown', onGlobalKeydown);

export function focusScope(element, options = {}) {
    const { trap = true, initialFocus = true, returnFocus = true } = options;
    const scope = { element, trap, restoreNode: document.activeElement };

    scopes.push(scope);

    if (initialFocus) {
        requestAnimationFrame(() => {
            if (scopes[scopes.length - 1] === scope) {
                const focusables = getFocusables(element);
                if (focusables.length) focusables[0].focus();
            }
        });
    }

    return {
        destroy: () => {
            const idx = scopes.indexOf(scope);
            if (idx > -1) scopes.splice(idx, 1);
            if (returnFocus && scope.restoreNode?.focus && document.contains(scope.restoreNode)) {
                try { scope.restoreNode.focus(); } catch (_) {}
            }
        }
    };
}
