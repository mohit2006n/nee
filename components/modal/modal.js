/**
 * Modal Component (Native <dialog>)
 * ---------------------------------
 * Minimal wrapper for native dialog element.
 */
export function modal(dialog, options = {}) {
    const { onOpen = () => {}, onClose = () => {}, closeOnOutsideClick = true } = options;

    if (closeOnOutsideClick) {
        dialog.addEventListener('mousedown', (e) => {
            const rect = dialog.getBoundingClientRect();
            const isInDialog = (
                rect.top <= e.clientY && e.clientY <= rect.bottom &&
                rect.left <= e.clientX && e.clientX <= rect.right
            );
            if (!isInDialog) dialog.close();
        });
    }

    dialog.addEventListener('close', () => {
        onClose();
        document.body.style.overflow = '';
    });

    return {
        open: () => {
            if (!dialog.open) {
                dialog.showModal();
                document.body.style.overflow = 'hidden';
                onOpen();
            }
        },
        close: () => { if (dialog.open) dialog.close(); },
        destroy: () => {}
    };
}
