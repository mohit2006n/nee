/**
 * Dismissable Primitive (LIFO Stack)
 * -----------------------------------
 * Handles click-outside and escape key dismissal.
 */
const observers = [];

const isInside = (obs, target) => {
    if (obs.element.contains(target)) return true;
    for (let i = 0; i < obs.ignore.length; i++) {
        if (obs.ignore[i]?.contains(target)) return true;
    }
    return false;
};

const handleInteract = (e) => {
    for (let i = observers.length - 1; i >= 0; i--) {
        const obs = observers[i];
        if (isInside(obs, e.target)) return;
        if (obs.outsidePress) {
            obs.onDismiss();
            return;
        }
    }
};

const handleEscape = (e) => {
    if (e.key !== 'Escape') return;
    for (let i = observers.length - 1; i >= 0; i--) {
        if (observers[i].escapeKey) {
            observers[i].onDismiss();
            e.preventDefault();
            return;
        }
    }
};

const toggle = (active) => {
    const method = active ? 'addEventListener' : 'removeEventListener';
    document[method]('pointerdown', handleInteract, true);
    document[method]('keydown', handleEscape, true);
};

export function dismissable(element, onDismiss, { ignore = [], outsidePress = true, escapeKey = true } = {}) {
    const observer = { element, onDismiss, ignore, outsidePress, escapeKey };
    observers.push(observer);
    if (observers.length === 1) toggle(true);

    return {
        destroy: () => {
            const idx = observers.indexOf(observer);
            if (idx > -1) observers.splice(idx, 1);
            if (observers.length === 0) toggle(false);
        }
    };
}
