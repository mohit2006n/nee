/**
 * Headless UI Library
 * ===================
 * Semantic HTML-first UI components with zero styling.
 * 
 * Features:
 * - Native HTML where possible
 * - Each component has its own folder with JS + CSS
 * - Zero dependencies
 * - Fully accessible
 * - Completely unstyled
 */

// Components
export { dropdown, submenu } from './components/dropdown/dropdown.js';
export { modal } from './components/modal/modal.js';
export { popover } from './components/popover/popover.js';
export { tabs } from './components/tabs/tabs.js';
export { toggle, toggleGroup } from './components/toggle/toggle.js';
export { switchToggle } from './components/switch/switch.js';

// Theme
export { initTheme, toggleTheme, setTheme, getTheme } from './js/theme.js';

// Primitives (advanced usage)
export { dismissable } from './js/dismissable.js';
export { rovingFocus } from './js/roving-focus.js';
export { focusScope } from './js/focus-scope.js';
export { portal } from './js/portal.js';
export { lockBody, unlockBody } from './js/scroll-lock.js';

/**
 * Initialize Lucide Icons
 * Call this after DOM is ready to replace <i data-lucide="icon-name"> with SVGs
 */
export function initIcons() {
    if (typeof window !== 'undefined' && window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Auto-init: theme + icons on DOMContentLoaded
 */
export async function init() {
    if (typeof document !== 'undefined') {
        const { initTheme } = await import('./js/theme.js');
        initTheme();
        initIcons();
    }
}
