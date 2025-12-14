/**
 * Toggle Component (Button Toggle)
 * --------------------------------
 * Button that toggles between pressed/unpressed state.
 */
export function toggle(element, options = {}) {
    const { pressed = false, onChange = () => { } } = options;
    let isPressed = pressed;

    const update = () => {
        element.setAttribute('aria-pressed', isPressed.toString());
    };

    const handleToggle = () => {
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
    let activeIndex = buttons.findIndex(b => b.getAttribute('aria-pressed') === 'true');

    const update = (index) => {
        if (index === activeIndex && !allowNone) return;
        if (index === activeIndex && allowNone) index = -1;

        buttons.forEach((btn, i) => {
            btn.setAttribute('aria-pressed', (i === index).toString());
        });
        activeIndex = index;
        onChange(index === -1 ? null : buttons[index].dataset.value || index);
    };

    buttons.forEach((btn, i) => {
        btn.addEventListener('click', () => update(i));
    });

    return {
        getValue: () => activeIndex === -1 ? null : buttons[activeIndex].dataset.value || activeIndex,
        setValue: (val) => {
            const idx = buttons.findIndex(b => b.dataset.value === val);
            if (idx > -1) update(idx);
        },
        destroy: () => buttons.forEach((btn, i) => btn.removeEventListener('click', () => update(i)))
    };
}
