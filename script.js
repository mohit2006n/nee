// UI Logic (buttons, textarea, events)
import { PromptInput } from './components/prompt-input.js';
import { Message, TypingIndicator } from './components/message.js';
import { Conversation } from './components/conversation.js';

document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.getElementById('app-wrapper');
    const promptInputContainer = wrapper.querySelector('.prompt-input');
    const btnScrollBottom = document.getElementById('btn-scroll-bottom');
    const mainContainer = wrapper.querySelector('.main-container');
    const chatContainer = wrapper.querySelector('.chat-container');

    // Fake AI responses with varying lengths for testing
    const fakeResponses = [
        // 1. Few lines
        `Here's a quick summary:

- First, we analyze the request
- Then, we process the data
- Finally, we return the results

Let me know if you need more details!`,

        // 2. Longer response with markdown
        `# ⚡ Neural Interface Active

Welcome back. System integrity is **98.4%**. All neural pathways are *primed* for interaction.

### 🛡️ Security Status
| Module | Level | Status |
| :--- | :---: | :--- |
| Encryption | AES-256 | \`ACTIVE\` |
| Deep Packet | Level 4 | \`MONITORING\` |
| Firewall | Quantum | \`STABLE\` |

### 🧠 Core Processing
Here is the current neural weight calculation:
$$\\Omega(x) = \\sum_{i=0}^{n} \\frac{\\omega_i \\cdot \\phi(x_i)}{\\sqrt{1 - \\beta^2}}$$

### 🛠️ Automation Script
I've optimized your workspace bootstrap:
\`\`\`javascript
// Quick workspace initializer
async function syncNeuralLink() {
  const nodes = await System.getActiveNodes();
  return nodes.map(node => ({
    id: node.id,
    latency: Math.random() * 2 // ms
  }));
}
\`\`\`

> **Note:** The "Reality Distortion Field" is currently operating at safe levels. No immediate action required. ~ *System Analyst*

- Initialized UI components
- Secured IPC bridge
- Calibrating user intent sensors...`
    ];
    let responseIndex = 0;

    // Current pending attachments
    let pendingAttachments = [];

    // --- COMPONENTS INITIALIZATION ---

    // Initialize Conversation component
    const conversation = Conversation({
        container: chatContainer,
        scrollBtn: btnScrollBottom
    });

    // Scroll button click
    btnScrollBottom.onclick = () => {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
        conversation.resetScrollTracking();
    };

    // --- SEND MESSAGE ---

    const sendMessage = (text, attachments = []) => {
        if (!text && attachments.length === 0) return;

        promptInput?.setBusy(true);

        // Add user message via Conversation component
        // Pass scroll=false because we're going to snap to it immediately
        const userMsg = conversation.addMessage(text, 'user', attachments, false);

        // Snap user message to top
        // Show typing indicator (insert before spacer)
        const typing = TypingIndicator();
        conversation.appendElement(typing.element);

        // Create assistant message placeholder via Conversation component
        const msg = conversation.addMessage('', 'assistant', [], false);

        // Snap user message to top AFTER all elements are added 
        // to ensure layout/padding calculation accounts for everything.
        conversation.scrollToMessage(userMsg.element);

        // Fake AI response with reasoning and streaming simulation
        setTimeout(async () => {
            typing.remove();

            // Demo reasoning
            const reasoningText = `Analyzing request...

1. Understanding the query
2. Formulating response`;

            msg.setReasoning(reasoningText);
            msg.openReasoning();

            msg.finishReasoning();

            // 1. Stream response text (cycles through short, medium, long)
            const currentResponse = fakeResponses[responseIndex % fakeResponses.length];
            responseIndex++;
            await msg.streamContent(currentResponse, 2, () => conversation.handleStreamScroll());

            // Signal streaming finished to clean up spacer
            conversation.endStreaming();

            promptInput?.setBusy(false);
            promptInput?.focus();
        }, 300);
    };

    // Keep focus on prompt input when clicking main container
    mainContainer.addEventListener('mousedown', (e) => {
        const textarea = promptInputContainer?.querySelector('.prompt-input-textarea');
        if (textarea && e.target !== textarea) {
            e.preventDefault();
        }
        textarea?.focus();
    });

    // Initialize PromptInput component
    const promptInput = PromptInput?.(promptInputContainer, {
        onSubmit: sendMessage,
        onAttach: (attachment) => {
            pendingAttachments.push(attachment);
            console.log('Attached:', attachment.filename);
        }
    });

    // Initialize icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Global scroll listener for auto-hiding scrollbars
    document.addEventListener('scroll', (e) => {
        if (e.target.classList) {
            e.target.classList.add('is-scrolling');
            clearTimeout(e.target.scrollTimeout);
            e.target.scrollTimeout = setTimeout(() => {
                e.target.classList.remove('is-scrolling');
            }, 1000);
        }
    }, true); // Capture phase to catch all scrolls

    promptInput?.focus(); // Auto-focus on initial load
});
