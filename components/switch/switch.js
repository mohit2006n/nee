/**
 * Switch Component
 * ----------------
 * Sliding toggle switch (iOS-style).
 */
export function switchToggle(element, options = {}) {
    const { checked = false, onChange = () => { } } = options;
    let isChecked = checked;

    element.setAttribute('role', 'switch');
    element.setAttribute('tabindex', '0');

    const update = () => {
        element.setAttribute('aria-checked', isChecked.toString());
    };

    const handleToggle = () => {
        isChecked = !isChecked;
        update();
        onChange(isChecked);
    };

    const handleKeydown = (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleToggle();
        }
    };

    element.addEventListener('click', handleToggle);
    element.addEventListener('keydown', handleKeydown);
    update();

    return {
        get: () => isChecked,
        set: (value) => { isChecked = value; update(); onChange(value); },
        destroy: () => {
            element.removeEventListener('click', handleToggle);
            element.removeEventListener('keydown', handleKeydown);
        }
    };
}
