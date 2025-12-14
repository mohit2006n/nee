import { dismissable } from '../../js/dismissable.js';
import { lockBody, unlockBody } from '../../js/scroll-lock.js';

/**
 * Headless Dropdown
 * -----------------
 * Accessible dropdown with nested menu support.
 * Uses Popover API + CSS Anchor Positioning.
 */

const registry = new Map();
let uid = 0;

export function dropdown(trigger, menu, opts = {}) {
    const {
        placement = 'bottom-start',
        closeOnSelect = true,
        openOnHover = false,
        scrollLock = true
    } = opts;

    let dismiss = null;
    let isOpen = false;
    let isDestroyed = false;
    const children = new Set();
    let parent = null;

    // Popover API
    menu.setAttribute('popover', 'manual');
    menu.id ||= `dd-${++uid}`;

    // CSS Anchor Positioning
    const anchor = `--anchor-${menu.id}`;
    trigger.style.anchorName = anchor;
    menu.style.positionAnchor = anchor;
    menu.classList.add(placement);

    const entry = { hide, children, parent: null };
    registry.set(menu.id, entry);

    const closeSiblings = () => {
        if (!parent) return;
        const p = registry.get(parent);
        if (!p) return;
        p.children.forEach(id => {
            if (id !== menu.id) {
                const child = registry.get(id);
                if (child) child.hide();
            }
        });
    };

    const closeAll = () => {
        let r = entry;
        while (r.parent) {
            const parentEntry = registry.get(r.parent);
            if (!parentEntry) break;
            r = parentEntry;
        }
        if (r.hide) r.hide();
    };

    function show() {
        if (isOpen || isDestroyed || menu.matches(':popover-open')) return;

        isOpen = true;
        closeSiblings();

        try {
            menu.showPopover();
        } catch (e) {
            isOpen = false;
            return;
        }

        trigger.setAttribute('aria-expanded', 'true');

        // Lock scroll for root dropdown only
        if (scrollLock && !parent) lockBody();

        requestAnimationFrame(() => {
            if (!isOpen || isDestroyed) return;
            dismiss = dismissable(menu, closeAll, { ignore: [trigger] }).destroy;
        });
    }

    function hide() {
        if (!isOpen || isDestroyed) return;

        isOpen = false;

        // Close all children first
        children.forEach(id => {
            const child = registry.get(id);
            if (child) child.hide();
        });

        if (menu.matches(':popover-open')) {
            try {
                menu.hidePopover();
            } catch (e) { }
        }

        trigger.setAttribute('aria-expanded', 'false');

        // Unlock scroll for root dropdown only
        if (scrollLock && !parent) unlockBody();

        if (dismiss) {
            dismiss();
            dismiss = null;
        }
    }

    // Event handlers
    const handleClick = (e) => {
        if (isDestroyed) return;
        e.stopPropagation();
        if (isOpen) hide();
        else show();
    };

    const handleMouseEnter = () => {
        if (isDestroyed) return;
        show();
    };

    const handleMouseLeave = (e) => {
        if (isDestroyed) return;
        // Edge case: Don't close if moving to trigger or another popover
        if (trigger.contains(e.relatedTarget) || e.relatedTarget?.closest?.('[popover]')) return;
        hide();
    };

    const handleItemClick = (e) => {
        if (isDestroyed) return;
        if (e.target.closest('[data-dropdown-item]')) closeAll();
    };

    // Events
    if (openOnHover) {
        trigger.addEventListener('mouseenter', handleMouseEnter);
        menu.addEventListener('mouseleave', handleMouseLeave);
    } else {
        trigger.addEventListener('click', handleClick);
    }

    if (closeOnSelect) {
        menu.addEventListener('click', handleItemClick);
    }

    // A11y
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('role', 'menu');

    return {
        open: show,
        close: hide,
        toggle: () => {
            if (isDestroyed) return;
            if (isOpen) hide();
            else show();
        },
        closeAll,
        setParent: (pid) => {
            parent = pid;
            entry.parent = pid;
            const parentEntry = registry.get(pid);
            if (parentEntry) parentEntry.children.add(menu.id);
        },
        destroy: () => {
            if (isDestroyed) return;
            isDestroyed = true;
            hide();
            registry.delete(menu.id);

            // Remove event listeners
            if (openOnHover) {
                trigger.removeEventListener('mouseenter', handleMouseEnter);
                menu.removeEventListener('mouseleave', handleMouseLeave);
            } else {
                trigger.removeEventListener('click', handleClick);
            }

            if (closeOnSelect) {
                menu.removeEventListener('click', handleItemClick);
            }
        }
    };
}

export function submenu(trigger, menu, opts = {}) {
    const inst = dropdown(trigger, menu, { placement: 'right-start', openOnHover: true, ...opts });
    const p = trigger.closest('[popover]');
    if (p?.id) inst.setParent(p.id);
    return inst;
}