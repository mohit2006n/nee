/**
 * Prompt Input - AI chat input component with file upload
 */
export function PromptInput(container, options = {}) {
    const { onSubmit, onAttach, placeholder = 'Ask anything...' } = options;

    const textarea = container.querySelector('.prompt-input-textarea');
    const submitBtn = container.querySelector('.prompt-input-submit');
    const attachBtn = container.querySelector('.prompt-input-attach');
    const fileInput = container.querySelector('.prompt-input-file');

    if (!textarea || !submitBtn) {
        console.warn('PromptInput: Missing textarea or submit button');
        return null;
    }

    let attachments = [];

    let isBusy = false;

    // Render attachments preview
    const attachmentsContainer = container.querySelector('.prompt-input-attachments');

    const renderPreviews = () => {
        if (!attachmentsContainer) return;
        attachmentsContainer.innerHTML = '';

        attachments.forEach((att, index) => {
            const el = document.createElement('div');
            el.className = 'attachment-preview';

            // Icon or Image
            if (att.type === 'image') {
                el.innerHTML = `<img src="${att.url}" alt="${att.filename}">`;
            } else {
                let iconName = 'file';
                const type = att.mediaType || '';
                const ext = att.filename.split('.').pop()?.toLowerCase();

                if (type.startsWith('image/')) iconName = 'image';
                else if (type.startsWith('video/')) iconName = 'video';
                else if (type.startsWith('audio/')) iconName = 'music';
                else if (type === 'application/pdf' || ext === 'pdf') iconName = 'file-text';
                else if (['doc', 'docx'].includes(ext)) iconName = 'file-text';
                else if (['xls', 'xlsx'].includes(ext)) iconName = 'file-spreadsheet';
                else if (['js', 'ts', 'py', 'html', 'css', 'json'].includes(ext)) iconName = 'file-code';
                else if (['zip', 'rar'].includes(ext)) iconName = 'file-archive';

                el.innerHTML = `
                    <div class="attachment-preview-file">
                        <i data-lucide="${iconName}"></i>
                        <span class="attachment-preview-name">${att.filename}</span>
                    </div>`;
            }

            // Remove button
            const removeBtn = document.createElement('div');
            removeBtn.className = 'attachment-preview-remove';
            removeBtn.innerHTML = '×'; // or better icon
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeAttachment(index);
            };
            el.appendChild(removeBtn);

            attachmentsContainer.appendChild(el);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [attachmentsContainer] });
        }
    };

    const removeAttachment = (index) => {
        attachments.splice(index, 1);
        renderPreviews();
        updateSubmitState();
    };

    // Update submit button state
    const updateSubmitState = () => {
        const hasContent = textarea.value.trim().length > 0 || attachments.length > 0;
        submitBtn.disabled = !hasContent || isBusy;
    };

    // Handle submit
    const submit = () => {
        if (isBusy) return;
        const value = textarea.value.trim();
        if (!value && attachments.length === 0) return;

        onSubmit?.(value, attachments);
        textarea.value = '';
        attachments = [];
        renderPreviews();
        updateSubmitState();
        textarea.focus();
    };

    // Handle file selection - convert to data URL for Electron compatibility
    const MAX_ATTACHMENTS = 5;
    const handleFiles = (files) => {
        // Can add files even if busy (just can't submit)
        const remaining = MAX_ATTACHMENTS - attachments.length;
        if (remaining <= 0) return;

        Array.from(files).slice(0, remaining).forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                const attachment = {
                    type: file.type.startsWith('image/') ? 'image' :
                        file.type.startsWith('video/') ? 'video' :
                            file.type.startsWith('audio/') ? 'audio' : 'file',
                    url: reader.result, // data URL
                    mediaType: file.type,
                    filename: file.name,
                    file
                };
                attachments.push(attachment);
                onAttach?.(attachment);

                // Update previews
                renderPreviews();
                updateSubmitState();
            };
            reader.readAsDataURL(file);
        });
    };

    // Event listeners
    textarea.addEventListener('input', updateSubmitState);
    textarea.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (!isBusy) submit();
        }
    });
    submitBtn.addEventListener('click', submit);

    // Attach button triggers file input
    attachBtn?.addEventListener('click', () => {
        fileInput?.click();
    });
    fileInput?.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFiles(fileInput.files);
            fileInput.value = ''; // Reset for re-selection
        }
    });

    // Set placeholder
    if (placeholder) textarea.placeholder = placeholder;

    // Initialize state
    updateSubmitState();

    return {
        submit,
        clear: () => { textarea.value = ''; attachments = []; renderPreviews(); updateSubmitState(); },
        focus: () => textarea.focus(),
        getValue: () => textarea.value,
        setValue: value => { textarea.value = value; updateSubmitState(); },
        getAttachments: () => attachments,
        clearAttachments: () => { attachments = []; renderPreviews(); updateSubmitState(); },
        setBusy: (busy) => {
            isBusy = busy;
            // attachBtn remains enabled
            if (busy) {
                submitBtn.disabled = true;
                container.classList.add('busy');
            } else {
                updateSubmitState();
                container.classList.remove('busy');
            }
        }
    };
}
