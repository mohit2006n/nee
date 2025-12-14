/**
 * Scroll Lock Primitive
 * ---------------------
 * Prevents body scroll with scrollbar compensation.
 */
let locks = 0;
let prevStyle = null;

export function lockBody() {
    if (locks++ > 0) return;
    
    const body = document.body;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    
    prevStyle = {
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight
    };

    if (scrollbar > 0) {
        body.style.paddingRight = `${(parseInt(getComputedStyle(body).paddingRight) || 0) + scrollbar}px`;
    }
    body.style.overflow = 'hidden';
}

export function unlockBody() {
    if (--locks > 0) return;
    locks = Math.max(0, locks);
    
    if (prevStyle) {
        Object.assign(document.body.style, prevStyle);
        prevStyle = null;
    }
}
