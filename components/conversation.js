/**
 * Conversation Component - Messages container with auto-scroll
 */
import { Message } from './message.js';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================
const DEFAULT_CONFIG = {
    NEAR_BOTTOM_THRESHOLD: 4,    // Latch re-engage threshold (strict)
    SCROLL_FOLLOW_THRESHOLD: 50  // Standard auto-scroll threshold (non-streaming)
};

// ============================================================================
// SCROLL LATCH ENGINE
// Tracks user scroll interruption to determine if auto-scroll should proceed.
// ============================================================================
function createScrollLatch(container, config) {
    let latched = true;
    let lastScrollTop = 0;

    const handleScroll = () => {
        const currentScroll = container.scrollTop;
        const distFromBottom = container.scrollHeight - currentScroll - container.clientHeight;

        if (currentScroll < lastScrollTop) {
            // User scrolled UP → break latch
            latched = false;
        } else if (distFromBottom < config.NEAR_BOTTOM_THRESHOLD) {
            // User scrolled to bottom → re-engage latch
            latched = true;
        }
        lastScrollTop = currentScroll;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return {
        isLatched: () => latched,
        engage: () => { latched = true; lastScrollTop = container.scrollTop; },
        disengage: () => { latched = false; },
        destroy: () => container.removeEventListener('scroll', handleScroll)
    };
}

// ============================================================================
// SNAP LAYOUT ENGINE
// Manages "Snap-to-Top" by dynamically calculating padding and scroll position.
// ============================================================================
function createSnapLayout(container, config) {
    let target = null;
    let isSnapped = false;

    const getContainerPadding = () => {
        return parseFloat(getComputedStyle(container).paddingTop) || 0;
    };

    const calculateOffset = (element) => {
        return Math.max(0, element.offsetTop - getContainerPadding());
    };

    const enforce = (overrideHeight = null, forceSnap = false) => {
        if (!target) return { isSnapped: false, padding: 0 };

        const currentPadding = parseFloat(getComputedStyle(container).paddingBottom) || 0;

        // Calculate the maximum possible scroll position if we had NO padding
        const naturalScrollHeight = container.scrollHeight - currentPadding;
        const viewportHeight = overrideHeight || container.getBoundingClientRect().height;
        const maxNaturalScroll = naturalScrollHeight - viewportHeight;

        const snapOffset = calculateOffset(target);

        // We simply need enough padding to ensure 'snapOffset' is a valid scroll position.
        // If snapOffset > maxNaturalScroll, we need padding.
        // We add 1px safety to ensure we don't hit exact boundary rounding errors.
        const neededPadding = Math.max(0, Math.ceil(snapOffset - maxNaturalScroll + 1));

        container.style.paddingBottom = `${neededPadding}px`;

        const scrollTop = container.scrollTop;
        const drift = Math.abs(scrollTop - snapOffset);

        // If forceSnap is requested, we apply it regardless of drift
        if (forceSnap) {
            isSnapped = true;
            container.scrollTop = snapOffset;
            return { isSnapped: true, padding: neededPadding };
        }

        // Standard check: If we are supposed to be snapped, check if we drifted too far
        if (isSnapped) {
            // Allow a small tolerance (e.g., 5px) for sub-pixel/rounding issues.
            // If drift is significant (> 10px), assume user interaction and break snap.
            if (drift > 10) {
                isSnapped = false;
            } else if (drift > 0) {
                // Fix small drifts
                container.scrollTop = snapOffset;
            }
        }

        return { isSnapped, padding: neededPadding };
    };

    return {
        setTarget: (element) => {
            target = element;
            isSnapped = true;
        },
        getTarget: () => target,
        calculateOffset,
        enforce,
        clear: () => {
            target = null;
            isSnapped = false;
            container.style.paddingBottom = '0px';
        }
    };
}

// ============================================================================
// CONVERSATION COMPONENT
// ============================================================================

/**
 * Create a conversation container
 * @param {Object} options - Configuration
 * @param {HTMLElement} options.container - Scrollable messages container
 * @param {HTMLElement} [options.scrollBtn] - Scroll to bottom button
 * @param {Object} [options.config] - Optional configuration overrides
 * @returns {Object} Conversation controller
 */
export function Conversation(options = {}) {
    const { container, scrollBtn, config: userConfig = {} } = options;

    if (!container) {
        console.warn('Conversation: Missing container');
        return null;
    }

    // Merge defaults with user config
    const config = { ...DEFAULT_CONFIG, ...userConfig };

    // --- Initialize Engines ---
    const scrollLatch = createScrollLatch(container, config);
    const snapLayout = createSnapLayout(container, config);

    let isStreaming = false;

    // --- Helpers ---
    const isNearBottom = (threshold = config.SCROLL_FOLLOW_THRESHOLD) => {
        return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    };

    const updateScrollButton = () => {
        if (!scrollBtn) return;
        const hasContent = container.scrollHeight > container.clientHeight;
        scrollBtn.style.display = (hasContent && !isNearBottom()) ? 'flex' : 'none';
    };

    // --- Scroll Actions ---
    const scrollToBottom = (smooth = true) => {
        snapLayout.clear();
        container.scrollTo({
            top: container.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    };

    const scrollToMessage = (element) => {
        if (!element || !container) return;

        snapLayout.setTarget(element);
        isStreaming = true;
        scrollLatch.disengage();

        container.style.scrollBehavior = 'auto';

        // Use requestAnimationFrame to ensure browser has completed layout
        // before we read offsetTop and set scrollTop
        requestAnimationFrame(() => {
            // Force snap immediately to ensure initial position is correct
            snapLayout.enforce(null, true);
        });
    };

    const handleStreamScroll = () => {
        if (isStreaming && snapLayout.getTarget()) {
            const { isSnapped, padding } = snapLayout.enforce();

            if (!isSnapped) {
                // Overflow mode: follow stream if latch engaged
                if (padding === 0 && scrollLatch.isLatched()) {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: 'auto'
                    });
                }
            }
        } else {
            // Standard behavior: use latch to stick to bottom
            if (scrollLatch.isLatched()) {
                scrollToBottom(false);
            }
        }
    };

    const endStreaming = () => {
        isStreaming = false;
        updateScrollButton();
    };

    // --- Content Management ---
    const addMessage = (content, type = 'assistant', attachments = [], scroll = true) => {
        const msg = Message({ content, type, attachments });
        container.appendChild(msg.element);
        if (scroll) scrollToBottom();
        updateScrollButton();
        return msg;
    };

    const appendElement = (element) => {
        container.appendChild(element);
    };

    const clear = () => {
        container.innerHTML = '';
        snapLayout.clear();
        isStreaming = false;
        updateScrollButton();
    };

    // --- Event Bindings ---
    scrollBtn?.addEventListener('click', () => scrollToBottom());

    container.addEventListener('scroll', () => {
        updateScrollButton();
    }, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
        if (snapLayout.getTarget()) {
            const height = container.getBoundingClientRect().height;
            snapLayout.enforce(height);
        }
    });
    resizeObserver.observe(container.parentElement);

    // --- Initialize ---
    updateScrollButton();

    // --- Public API ---
    return {
        addMessage,
        appendElement,
        clear,
        scrollToBottom,
        scrollToMessage,
        handleStreamScroll,
        endStreaming
    };
}
