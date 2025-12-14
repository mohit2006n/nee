/**
 * Toggle Component (Button Toggle)
 * --------------------------------
 * Button that toggles between pressed/unpressed state.
 */
export function toggle(element, options = {}) {
    const {
        pressed = element.getAttribute('aria-pressed') === 'true',
        onChange = () => { }
    } = options;

    let isPressed = pressed;

    const update = () => {
        element.setAttribute('aria-pressed', isPressed.toString());
    };

    const handleToggle = (e) => {
        // If part of a group handled by toggleGroup, stop propagation or let it handle it?
        // Usually, standalone toggle shouldn't be used on group items.
        isPressed = !isPressed;
        update();
        onChange(isPressed);
    };

    element.addEventListener('click', handleToggle);
    update();

    return {
        get: () => isPressed,
        set: (value) => { isPressed = value; update(); onChange(value); },
        destroy: () => element.removeEventListener('click', handleToggle)
    };
}

/**
 * Toggle Group
 * ------------
 * Exclusive toggle group (only one can be pressed).
 */
export function toggleGroup(container, options = {}) {
    const { onChange = () => { }, allowNone = false } = options;
    const buttons = Array.from(container.querySelectorAll('[aria-pressed]'));

    // Determine active index from DOM if not set
    let activeIndex = buttons.findIndex(b => b.getAttribute('aria-pressed') === 'true');

    const update = (index) => {
        // If clicking active and none allowed, deselect
        if (index === activeIndex && allowNone) {
            index = -1;
        } else if (index === activeIndex && !allowNone) {
            return; // No change
        }

        buttons.forEach((btn, i) => {
            btn.setAttribute('aria-pressed', (i === index).toString());
        });
        activeIndex = index;
        onChange(index === -1 ? null : buttons[index].dataset.value || index);
    };

    const handlers = [];
    buttons.forEach((btn, i) => {
        const handler = (e) => {
            e.preventDefault(); // Prevent default if any
            update(i);
        };
        btn.addEventListener('click', handler);
        handlers.push({ btn, handler });
    });

    return {
        getValue: () => activeIndex === -1 ? null : buttons[activeIndex].dataset.value || activeIndex,
        setValue: (val) => {
            const idx = buttons.findIndex(b => b.dataset.value === val);
            if (idx > -1) update(idx);
        },
        destroy: () => handlers.forEach(({ btn, handler }) => btn.removeEventListener('click', handler))
    };
}
