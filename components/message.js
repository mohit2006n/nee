/**
 * Message Component - Chat message with markdown rendering
 */

/**
 * Render markdown text with code highlighting and math support
 */
export function renderMarkdown(text) {
    // Process KaTeX math (block and inline)
    let processed = text
        .replace(/\$\$(.+?)\$\$/gs, (_, math) => {
            try { return katex.renderToString(math, { displayMode: true }); }
            catch { return `$$${math}$$`; }
        })
        .replace(/\$(.+?)\$/g, (_, math) => {
            try { return katex.renderToString(math, { displayMode: false }); }
            catch { return `$${math}$`; }
        });

    // Parse markdown
    if (typeof marked !== 'undefined') {
        const html = marked.parse(processed, { breaks: true });

        // Create temp element to apply highlight.js
        const temp = document.createElement('div');
        temp.innerHTML = html;

        if (typeof hljs !== 'undefined') {
            temp.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);

                // Extract language from class (e.g., "language-javascript" -> "javascript")
                const langClass = Array.from(block.classList).find(c => c.startsWith('language-'));
                const lang = langClass ? langClass.replace('language-', '') : 'code';
                const label = document.createElement('div');
                label.className = 'code-language-label';
                label.textContent = lang;
                block.closest('pre').insertBefore(label, block);
            });
        }

        return temp.innerHTML;
    }
    return processed;
}

/**
 * Get lucide icon name for file type
 */
function getFileIcon(mediaType, filename) {
    const ext = filename.split('.').pop()?.toLowerCase();

    // Video
    if (mediaType.startsWith('video/')) return 'video';

    // Audio
    if (mediaType.startsWith('audio/')) return 'music';

    // Documents
    if (mediaType === 'application/pdf') return 'file-text';
    if (mediaType.includes('word') || ext === 'doc' || ext === 'docx') return 'file-text';
    if (mediaType.includes('excel') || ext === 'xls' || ext === 'xlsx') return 'file-spreadsheet';
    if (mediaType.includes('powerpoint') || ext === 'ppt' || ext === 'pptx') return 'presentation';

    // Code
    if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'json', 'xml'].includes(ext)) return 'file-code';

    // Archive
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'file-archive';

    // Default
    return 'file';
}

/**
 * Render an attachment element
 * @param {Object} attachment - {type, url, mediaType, filename}
 * @returns {string} HTML string
 */
function renderAttachment(attachment) {
    const { type, url, mediaType = '', filename = 'attachment' } = attachment;

    // Images - show thumbnail only
    if (type === 'image' || mediaType.startsWith('image/')) {
        return `<div class="message-attachment message-attachment-image">
            <img src="${url}" alt="${filename}" loading="lazy" />
        </div>`;
    }

    // All other files - show icon with lucide and filename (downloads disabled for now)
    const icon = getFileIcon(mediaType, filename);
    return `<div class="message-attachment message-attachment-file">
        <div class="message-attachment-info" title="${filename}">
            <i data-lucide="${icon}"></i>
            <span class="message-attachment-name">${filename}</span>
        </div>
    </div>`;
}

/**
 * Create a message element
 * @param {Object} options - Message options
 * @param {string} options.content - Message content
 * @param {string} options.type - 'user' or 'assistant'
 * @param {Array} options.attachments - Array of {type, url, mediaType, filename}
 * @returns {Object} Message controller
 */
export function Message(options = {}) {
    const { content = '', type = 'assistant', attachments = [], reasoning = '' } = options;

    // Create wrapper for both attachments and message
    const wrapper = document.createElement('div');
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    wrapper.id = id;
    wrapper.className = `message-wrapper message-wrapper-${type}`;

    // Create reasoning section (collapsible, for assistant only)
    let reasoningEl = null;
    let reasoningStartTime = null;
    if (type === 'assistant') {
        reasoningEl = document.createElement('details');
        reasoningEl.className = 'message-reasoning';
        reasoningEl.innerHTML = `
            <summary class="message-reasoning-summary">
                <i data-lucide="chevron-right" class="message-reasoning-chevron"></i>
                <span class="message-reasoning-label">Thinking...</span>
            </summary>
            <div class="message-reasoning-content">${reasoning ? renderMarkdown(reasoning) : ''}</div>
        `;
        if (!reasoning) {
            reasoningEl.style.display = 'none';
        }
        wrapper.appendChild(reasoningEl);
        // Refresh lucide icons
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons({ nodes: [reasoningEl] }), 0);
        }
    }

    // Render message bubble
    let element = null;
    if (content || (type === 'assistant' && attachments.length > 0)) {
        element = document.createElement('div');
        element.className = `message message-${type}`;

        if (content) {
            if (type === 'user') {
                element.innerHTML = `<div class="message-text">${escapeHtml(content)}</div>`;
            } else {
                element.innerHTML = `<div class="message-text">${renderMarkdown(content)}</div>`;
            }
        }

        // For assistant: attachments inside message element
        if (type === 'assistant' && attachments.length > 0) {
            const attachmentsEl = document.createElement('div');
            attachmentsEl.className = 'message-attachments';
            attachments.forEach(att => { attachmentsEl.innerHTML += renderAttachment(att); });
            element.appendChild(attachmentsEl);
            if (typeof lucide !== 'undefined') {
                setTimeout(() => lucide.createIcons({ nodes: [attachmentsEl] }), 0);
            }
        }

        wrapper.appendChild(element);
    }

    // For user: attachments below message element
    if (type === 'user' && attachments.length > 0) {
        const attachmentsEl = document.createElement('div');
        attachmentsEl.className = 'message-attachments';
        attachments.forEach(att => { attachmentsEl.innerHTML += renderAttachment(att); });
        wrapper.appendChild(attachmentsEl);
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons({ nodes: [attachmentsEl] }), 0);
        }
    }

    // Internal state for streaming
    let currentContent = content;
    let streamingInterval = null;

    return {
        element: wrapper,
        setContent: (text) => {
            currentContent = text;

            // Ensure message bubble exists
            if (!element) {
                element = document.createElement('div');
                element.className = `message message-${type}`;
                wrapper.appendChild(element);
            }

            // Find or create text element
            let textEl = element.querySelector('.message-text');
            if (!textEl && text) {
                textEl = document.createElement('div');
                textEl.className = 'message-text';
                // Append text element to bubble (preserves existing attachments)
                element.appendChild(textEl);
            }

            if (textEl) {
                if (type === 'user') {
                    textEl.textContent = text;
                } else {
                    textEl.innerHTML = renderMarkdown(text);
                }
            }
        },

        // Stream text character by character
        // onUpdate callback is called after each character for smart scrolling
        streamContent: (text, speed = 20, onUpdate = null) => {
            return new Promise((resolve) => {
                let index = 0;
                currentContent = '';

                // Initialize immediately to determine DOM order (Text First)
                // This uses the non-destructive logic from setContent
                const safeSetContent = (txt) => {
                    // Ensure message bubble exists
                    if (!element) {
                        element = document.createElement('div');
                        element.className = `message message-${type}`;
                        wrapper.appendChild(element);
                    }

                    // Find or create text element
                    let textEl = element.querySelector('.message-text');
                    if (!textEl) {
                        textEl = document.createElement('div');
                        textEl.className = 'message-text';
                        element.appendChild(textEl);
                    }

                    if (type === 'user') {
                        textEl.textContent = txt;
                    } else {
                        textEl.innerHTML = renderMarkdown(txt);
                    }
                };

                // Create empty text element synchronously
                safeSetContent('');

                // Clear any existing interval
                if (streamingInterval) clearInterval(streamingInterval);

                streamingInterval = setInterval(() => {
                    if (index < text.length) {
                        currentContent += text[index];
                        safeSetContent(currentContent);
                        index++;

                        // Call onUpdate callback for smart scrolling
                        if (onUpdate) onUpdate(currentContent, index, text.length);
                    } else {
                        clearInterval(streamingInterval);
                        streamingInterval = null;
                        resolve();
                    }
                }, speed);
            });
        },

        // Add attachments to message with skeleton loading
        addAttachments: async (atts) => {
            if (!atts || atts.length === 0) return;

            // Find or create message element
            let msgEl = wrapper.querySelector('.message');
            if (!msgEl) {
                msgEl = document.createElement('div');
                msgEl.className = `message message-${type}`;
                wrapper.appendChild(msgEl);
            }

            // Find or create attachments container
            let attachmentsEl = msgEl.querySelector('.message-attachments');
            if (!attachmentsEl) {
                attachmentsEl = document.createElement('div');
                attachmentsEl.className = 'message-attachments';
                msgEl.appendChild(attachmentsEl);
            }

            // Process each attachment
            const promises = atts.map(att => {
                // 1. Create and append skeleton
                const skeleton = document.createElement('div');
                skeleton.className = 'message-attachment-skeleton';
                attachmentsEl.appendChild(skeleton);

                return new Promise(resolve => {
                    // 2. Create actual element (in memory)
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = renderAttachment(att);
                    const realEl = tempDiv.firstElementChild;

                    // 3. Wait for load (no artificial delay)
                    const delay = 0;

                    const finalize = () => {
                        if (attachmentsEl.contains(skeleton)) {
                            attachmentsEl.replaceChild(realEl, skeleton);
                            // Re-initialize icons for new element
                            if (typeof lucide !== 'undefined') {
                                lucide.createIcons({ nodes: [realEl] });
                            }
                            resolve();
                        }
                    };

                    if (att.type === 'image') {
                        const img = realEl.querySelector('img') || realEl;
                        if (img.tagName === 'IMG' && !img.complete) {
                            img.onload = () => setTimeout(finalize, delay);
                            img.onerror = () => setTimeout(finalize, delay);
                        } else {
                            setTimeout(finalize, delay);
                        }
                    } else {
                        // Files/others -> simulate processing delay
                        setTimeout(finalize, delay);
                    }
                });
            });

            return Promise.all(promises);
        },

        // Reasoning methods
        setReasoning: (text) => {
            if (!reasoningEl) return;
            reasoningEl.style.display = text ? '' : 'none';
            const contentEl = reasoningEl.querySelector('.message-reasoning-content');
            if (contentEl) {
                contentEl.innerHTML = renderMarkdown(text);
            }
        },
        openReasoning: () => {
            if (reasoningEl) {
                reasoningEl.style.display = '';
                reasoningEl.open = true;
                reasoningStartTime = Date.now();
            }
        },
        closeReasoning: () => {
            if (reasoningEl) {
                reasoningEl.open = false;
            }
        },
        finishReasoning: () => {
            if (reasoningEl && reasoningStartTime) {
                const elapsed = Math.round((Date.now() - reasoningStartTime) / 1000);
                const label = reasoningEl.querySelector('.message-reasoning-label');
                if (label) {
                    label.textContent = `Thought for ${elapsed}s`;
                }
                reasoningEl.open = false;
            }
        }
    };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Create a typing indicator
 * @returns {Object} Typing indicator controller
 */
export function TypingIndicator() {
    const element = document.createElement('div');
    element.className = 'message message-typing';
    element.innerHTML = '<div class="message-typing-dots"><span></span><span></span><span></span></div>';

    return {
        element,
        remove: () => element.remove()
    };
}
