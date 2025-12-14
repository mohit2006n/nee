import { rovingFocus } from '../../js/roving-focus.js';

/**
 * Tabs Component
 * --------------
 * Accessible tabs with keyboard navigation.
 * Expects `tabList` element as the root argument.
 */
export function tabs(tabList, options = {}) {
    const {
        orientation = tabList.getAttribute('aria-orientation') || 'horizontal',
        activation = 'manual'
    } = options;

    const tabButtons = Array.from(tabList.querySelectorAll('[role="tab"]'));
    const panels = tabButtons.map(btn => {
        const id = btn.getAttribute('aria-controls');
        return id ? document.getElementById(id) : null;
    });

    // Ensure state consistency
    const update = (index) => {
        tabButtons.forEach((btn, i) => {
            const selected = i === index;
            const panel = panels[i];

            btn.setAttribute('aria-selected', selected);
            btn.setAttribute('tabindex', selected ? '0' : '-1');

            if (panel) {
                if (selected) {
                    panel.removeAttribute('hidden');
                } else {
                    panel.setAttribute('hidden', '');
                }
            }
        });
    };

    // Event handlers
    tabButtons.forEach((btn, i) => {
        btn.addEventListener('click', () => {
            update(i);
            btn.focus();
        });

        if (activation === 'auto') {
            btn.addEventListener('focus', () => update(i));
        }
    });

    // Setup Roving Focus
    const { destroy: destroyRoving } = rovingFocus(tabList, { orientation });

    // Initial State
    const selectedIndex = tabButtons.findIndex(b => b.getAttribute('aria-selected') === 'true');
    update(selectedIndex > -1 ? selectedIndex : 0);

    return { destroy: destroyRoving };
}
