import { rovingFocus } from '../../js/roving-focus.js';

/**
 * Tabs Component
 * --------------
 * Accessible tabs with keyboard navigation.
 */
export function tabs(container, options = {}) {
    const { orientation = 'horizontal', activation = 'manual' } = options;

    const tabList = container.querySelector('[role="tablist"]');
    const tabButtons = Array.from(tabList.querySelectorAll('[role="tab"]'));
    const panels = Array.from(container.querySelectorAll('[role="tabpanel"]'));

    tabButtons.forEach((btn, i) => {
        const panel = panels[i];
        const id = btn.id || `tab-${Math.random().toString(36).substr(2, 9)}`;
        const panelId = panel.id || `panel-${id}`;

        btn.id = id;
        panel.id = panelId;
        btn.setAttribute('aria-controls', panelId);
        panel.setAttribute('aria-labelledby', id);

        btn.addEventListener('click', () => activate(i));
        if (activation === 'auto') {
            btn.addEventListener('focus', () => activate(i));
        }
    });

    const activate = (index) => {
        tabButtons.forEach((btn, i) => {
            const selected = i === index;
            btn.setAttribute('aria-selected', selected);
            btn.setAttribute('tabindex', selected ? '0' : '-1');
            panels[i].hidden = !selected;
        });
    };

    const { destroy: destroyRoving } = rovingFocus(tabList, { orientation });

    const selected = tabButtons.findIndex(b => b.getAttribute('aria-selected') === 'true');
    if (selected === -1 && tabButtons.length) activate(0);

    return { destroy: destroyRoving };
}
