/**
 * Progress Component (Native <progress>)
 * --------------------------------------
 * Minimal wrapper for native progress element.
 */
export function progress(element) {
    return {
        set: (value) => { element.value = value; },
        setIndeterminate: () => { element.removeAttribute('value'); },
        setMax: (max) => { element.max = max; }
    };
}
