/**
 * Roving Focus Primitive
 * ----------------------
 * Manages keyboard navigation within composite widgets.
 */
const DEFAULT_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const isVisible = (el) => {
    return !(!el.offsetWidth && !el.offsetHeight) && getComputedStyle(el).visibility !== 'hidden';
};

export function rovingFocus(container, options = {}) {
    const { orientation = 'vertical', loop = true, selector = DEFAULT_SELECTOR } = options;
    let items = [];
    let currentIndex = -1;
    let searchString = '';
    let searchTimeout = null;

    const focusItem = (index) => {
        if (index < 0 || index >= items.length) return;
        if (items[currentIndex] && items[currentIndex] !== items[index]) {
            items[currentIndex].setAttribute('tabindex', '-1');
        }
        currentIndex = index;
        items[index].setAttribute('tabindex', '0');
        items[index].focus();
    };

    const getNextIndex = (dir) => {
        if (currentIndex === -1) {
            const idx = items.indexOf(document.activeElement);
            return idx > -1 ? idx : 0;
        }
        let next = currentIndex + dir;
        const last = items.length - 1;
        if (loop) {
            if (next > last) next = 0;
            if (next < 0) next = last;
        } else {
            next = Math.max(0, Math.min(next, last));
        }
        return next;
    };

    const handleTypeahead = (key) => {
        clearTimeout(searchTimeout);
        searchString += key.toLowerCase();
        const matchIdx = items.findIndex(item => 
            item.textContent.trim().toLowerCase().startsWith(searchString)
        );
        if (matchIdx > -1) focusItem(matchIdx);
        searchTimeout = setTimeout(() => searchString = '', 500);
    };

    const onKeyDown = (e) => {
        const key = e.key;
        if (key === 'Tab') return;

        const isVert = orientation === 'vertical' || orientation === 'both';
        const isHorz = orientation === 'horizontal' || orientation === 'both';
        let dir = 0;

        if (isVert && key === 'ArrowDown') dir = 1;
        else if (isVert && key === 'ArrowUp') dir = -1;
        else if (isHorz && key === 'ArrowRight') dir = 1;
        else if (isHorz && key === 'ArrowLeft') dir = -1;
        else if (key === 'Home') { e.preventDefault(); return focusItem(0); }
        else if (key === 'End') { e.preventDefault(); return focusItem(items.length - 1); }
        else if (key.length === 1 && /\S/.test(key) && !e.ctrlKey && !e.metaKey) {
            return handleTypeahead(key);
        }

        if (dir) {
            e.preventDefault();
            focusItem(getNextIndex(dir));
        }
    };

    const onClick = (e) => {
        const target = e.target.closest(selector);
        const idx = items.indexOf(target);
        if (idx > -1) focusItem(idx);
    };

    const refresh = () => {
        const nodes = container.querySelectorAll(selector);
        items = [];
        let foundActive = -1;

        for (let i = 0; i < nodes.length; i++) {
            const el = nodes[i];
            if (!el.disabled && el.getAttribute('aria-hidden') !== 'true' && isVisible(el)) {
                items.push(el);
                if (el.getAttribute('tabindex') === '0') foundActive = items.length - 1;
            }
        }

        if (foundActive === -1) foundActive = 0;
        currentIndex = foundActive;

        items.forEach((item, i) => {
            const target = i === currentIndex ? '0' : '-1';
            if (item.getAttribute('tabindex') !== target) {
                item.setAttribute('tabindex', target);
            }
        });
    };

    refresh();
    container.addEventListener('keydown', onKeyDown);
    container.addEventListener('click', onClick);

    return {
        refresh,
        destroy: () => {
            container.removeEventListener('keydown', onKeyDown);
            container.removeEventListener('click', onClick);
        }
    };
}
