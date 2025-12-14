import { dismissable } from '../../js/dismissable.js';

/**
 * Popover Component
 * -----------------
 * Click-triggered floating content using native Popover API + CSS Anchor Positioning.
 */
export function popover(trigger, content, options = {}) {
    const {
        placement = 'bottom',
        onOpen = () => { },
        onClose = () => { }
    } = options;

    let destroyDismiss = null;
    let isOpen = false;

    // Ensure IDs
    const id = content.id || `popover-${Math.random().toString(36).substr(2, 9)}`;
    content.id = id;

    // Set up Popover API
    content.setAttribute('popover', 'manual');
    trigger.setAttribute('popovertarget', id);
    trigger.setAttribute('popovertargetaction', 'toggle'); // We'll handle toggle manually mostly but this is good fallback

    // Set up Anchor Positioning
    const anchorName = `--anchor-${id}`;
    trigger.style.anchorName = anchorName;
    content.style.positionAnchor = anchorName;

    // Remove old placement classes and add new one
    content.classList.remove('top', 'bottom', 'left', 'right', 'top-start', 'top-end', 'bottom-start', 'bottom-end', 'left-start', 'left-end', 'right-start', 'right-end');
    content.classList.add(placement);

    const show = () => {
        if (isOpen) return;
        isOpen = true;

        try {
            content.showPopover();
        } catch (e) {
            // Already open or error
        }

        trigger.setAttribute('aria-expanded', 'true');

        requestAnimationFrame(() => {
            if (!isOpen) return;
            destroyDismiss = dismissable(content, hide, {
                ignore: [trigger],
                outsidePress: true,
                escapeKey: true
            }).destroy;
        });

        onOpen();
    };

    const hide = () => {
        if (!isOpen) return;
        isOpen = false;

        try {
            content.hidePopover();
        } catch (e) {}

        trigger.setAttribute('aria-expanded', 'false');

        if (destroyDismiss) {
            destroyDismiss();
            destroyDismiss = null;
        }

        onClose();
    };

    const toggle = (e) => {
        e.preventDefault(); // Prevent native toggle if we handle it, or let it be?
        // Actually, with popovertarget, the browser handles it.
        // But we need to track state and add dismissable.
        // So we might want to intervene.
        if (isOpen) hide();
        else show();
    };

    // We override the click to ensure our state management runs
    trigger.addEventListener('click', toggle);

    return {
        open: show,
        close: hide,
        toggle: () => isOpen ? hide() : show(),
        destroy: () => {
            hide();
            trigger.removeEventListener('click', toggle);
        }
    };
}
