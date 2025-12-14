import { computePosition, autoUpdate, offset, flip } from '../../js/floating.js';
import { dismissable } from '../../js/dismissable.js';

/**
 * Popover Component
 * -----------------
 * Click-triggered floating content.
 */
export function popover(trigger, content, options = {}) {
    const {
        placement = 'bottom',
        offset: offsetVal = 6,
        boundary = null,
        onOpen = () => { },
        onClose = () => { }
    } = options;

    let cleanup = null;
    let destroyDismiss = null;
    let isOpen = false;

    const id = content.id || `popover-${Date.now()}`;
    content.id = id;
    trigger.setAttribute('aria-controls', id);
    trigger.setAttribute('aria-expanded', 'false');
    content.setAttribute('popover', 'manual');

    const update = () => {
        if (!isOpen) return;
        computePosition(trigger, content, {
            placement,
            strategy: 'absolute',
            middleware: [offset(offsetVal), flip({ boundary })]
        });
    };

    const show = () => {
        if (isOpen) return;
        isOpen = true;
        content.showPopover();
        trigger.setAttribute('aria-expanded', 'true');
        update();
        cleanup = autoUpdate(trigger, content, update);

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
        content.hidePopover();
        trigger.setAttribute('aria-expanded', 'false');
        if (cleanup) { cleanup(); cleanup = null; }
        if (destroyDismiss) { destroyDismiss(); destroyDismiss = null; }
        onClose();
    };

    const toggle = () => isOpen ? hide() : show();

    trigger.addEventListener('click', toggle);

    return {
        open: show,
        close: hide,
        toggle,
        destroy: () => {
            hide();
            trigger.removeEventListener('click', toggle);
        }
    };
}