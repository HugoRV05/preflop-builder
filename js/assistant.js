// ==========================================
// POKI - YOUR POKER HOMIE & COACH
// Version 2.0.0 - Upgraded assistant module
// ==========================================

/**
 * Poki SVG icon (inline for easy use)
 */
const POKI_SVG = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="12" y="16" width="40" height="36" rx="8" fill="url(#poki-grad)"/>
  <line x1="32" y1="16" x2="32" y2="8" stroke="#a855f7" stroke-width="3" stroke-linecap="round"/>
  <circle cx="32" cy="6" r="4" fill="#22d3ee"/>
  <rect x="16" y="22" width="32" height="24" rx="4" fill="#1a1a2e"/>
  <ellipse cx="24" cy="32" rx="4" ry="5" fill="#22d3ee"/>
  <ellipse cx="40" cy="32" rx="4" ry="5" fill="#22d3ee"/>
  <circle cx="22" cy="30" r="1.5" fill="#fff"/>
  <circle cx="38" cy="30" r="1.5" fill="#fff"/>
  <path d="M26 40 Q32 45 38 40" stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <rect x="6" y="26" width="6" height="16" rx="2" fill="#7c3aed"/>
  <rect x="52" y="26" width="6" height="16" rx="2" fill="#7c3aed"/>
  <defs><linearGradient id="poki-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs>
</svg>`;

/**
 * Poki's chat script - casual, street-smart, your poker homie
 * Easily expandable - just add new entries
 */
const pokiChatScript = {
    greetings: [
        "Yo! 👋 I'm Poki, your poker homie. What's good?",
        "What's up fam? Poki in the house. Ready to crush some ranges? 🚀",
        "Ayyy! It's ya boy Poki. Let's get this EV up! 📈",
        "Yo yo! Poki here. Time to stop losing and start printing. 💸",
        "Sup! Poki on deck. What are we working on today? 🧠"
    ],
    
    userOptions: [
        { id: 'how_to_study', label: 'How do I get better?' },
        { id: 'how_to_practice', label: 'Best practice tips?' },
        { id: 'position_tips', label: 'Position game?' },
        { id: 'hand_categories', label: 'Hand types explained' },
        { id: 'common_mistakes', label: 'What am I doing wrong?' },
        { id: 'session_length', label: 'How long should I grind?' }
    ],
    
    responses: {
        how_to_study: {
            text: `Aight, here's the real talk:

Start with the **Button** - that's where the money's at. Master that spot first, then work backwards to CO and MP.

Don't try to learn everything at once. One position, get it locked in, then move on.

Use the Edit Ranges page to see the patterns. Once you see it, you can't unsee it. 💪`,
            followUps: ['position_tips', 'hand_categories']
        },

        how_to_practice: {
            text: `Real ones practice smart, not just long. Here's the move:

**Start with Fold/No-Fold mode** - builds those quick instincts before the fancy stuff.

Hit like 30 hands per session. Quality over quantity, always.

And yo, use me! That's what I'm here for. Tap the Poki button when you're stuck. No shame in asking. 🎯`,
            followUps: ['session_length', 'common_mistakes']
        },

        position_tips: {
            text: `Position is EVERYTHING. Let me break it down:

**Button (BU)** = King of the table. Play wide, print money.
**Cutoff (CO)** = Almost as good. Still got that positional edge.
**Middle Position (MP)** = Tighten up! Only the premium goods.
**Blinds (SB/BB)** = Defend smart, don't be stubborn.

When in doubt, position wins. The button is literally free money. 🏆`,
            followUps: ['how_to_study', 'hand_categories']
        },

        hand_categories: {
            text: `Let me teach you the hand types real quick:

**Pocket Pairs** - Always got a shot. The bigger the better obviously.
**Suited Broadway** - AKs, KQs, these are the goods. Flush potential = 💰
**Suited Connectors** - 87s, 76s, etc. Sneaky hands that hit big.
**Suited Aces** - A5s type hands. Nut flush draws are sick.
**Trash** - You know what this is. Fold it and wait for real hands.

Same hand plays different from BU vs MP. Context is everything! 🃏`,
            followUps: ['position_tips', 'how_to_practice']
        },

        common_mistakes: {
            text: `I see the same stuff all the time, no cap:

❌ **Playing too loose in early position** - MP is NOT the button fam
❌ **Overvaluing suited trash** - K7s is still mostly trash
❌ **Ignoring position** - A hand that's fire on BU might be a fold in MP
❌ **Tilting after mistakes** - It happens, shake it off

Every L is a lesson. That's how we grow. Keep grinding! 📈`,
            followUps: ['how_to_study', 'how_to_practice']
        },

        session_length: {
            text: `Here's the real:

**15-30 mins** is the sweet spot. Your brain learns better in short bursts.

Do like **30-50 hands**, stay locked in, then bounce.

If you're making dumb mistakes or getting frustrated? Done for the day. Come back tomorrow fresh.

Consistency beats marathon sessions. Show up every day, even if it's just 10 mins. That's the grind. 💪`,
            followUps: ['how_to_practice', 'common_mistakes']
        },

        change_topic: {
            text: "Bet. Let's switch it up. What's on your mind? 🧠",
            followUps: null
        }
    },
    
    // Quick reactions for post-hand feedback
    successReactions: [
        "Clean! 🔥",
        "That's the one! 💪",
        "You're locked in!",
        "Easy money 💰",
        "See? You got this!",
        "Smooth operator! 😎",
        "Textbook play!",
        "That's my student! 🎓"
    ],
    
    struggleReactions: [
        "Happens to all of us",
        "Shake it off, next hand",
        "That's a tricky spot tbf",
        "Learning opportunity! 📚",
        "Keep grinding, you'll get it",
        "Tough one, but we move"
    ],
    
    neutralReactions: [
        "Keep that focus 🎯",
        "One hand at a time",
        "Stay locked in",
        "You're doing good!",
        "Solid session so far"
    ]
};

// ==========================================
// ASSISTANT STATE
// ==========================================

let assistantState = {
    isProfileChatOpen: false,
    isPracticeModalOpen: false,
    isEnabled: true,
    chatHistory: [],
    isTyping: false
};

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize the assistant system
 */
function initializeAssistant() {
    loadAssistantSettings();
    setupProfileChat();
    setupPracticeModal();
    setupAssistantToggle();
    console.log('[Poki] Ready to help! 🤖');
}

/**
 * Load assistant settings from localStorage
 */
function loadAssistantSettings() {
    const saved = localStorage.getItem('preflop-assistant-enabled');
    assistantState.isEnabled = saved !== 'false';
}

/**
 * Save assistant settings to localStorage
 */
function saveAssistantSettings() {
    localStorage.setItem('preflop-assistant-enabled', assistantState.isEnabled.toString());
}

// ==========================================
// PROFILE CHAT FUNCTIONS
// ==========================================

/**
 * Setup profile chat event listeners
 */
function setupProfileChat() {
    const chatBtn = document.getElementById('profile-assistant-btn');
    const closeBtn = document.getElementById('close-profile-chat');
    const chatPanel = document.getElementById('assistant-chat-panel');
    const chatInput = document.getElementById('poki-chat-input');
    const sendBtn = document.getElementById('poki-send-btn');
    
    if (chatBtn) {
        chatBtn.addEventListener('click', openProfileChat);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeProfileChat);
    }
    
    if (chatPanel) {
        chatPanel.addEventListener('click', (e) => {
            if (e.target === chatPanel) {
                closeProfileChat();
            }
        });
    }
    
    // Setup free-text input
    if (chatInput && sendBtn) {
        // Send on button click
        sendBtn.addEventListener('click', () => {
            handleFreeTextSubmit(chatInput);
        });
        
        // Send on Enter key
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFreeTextSubmit(chatInput);
            }
        });
    }
}

/**
 * Handle free-text message submission
 */
async function handleFreeTextSubmit(inputEl) {
    const text = inputEl.value.trim();
    if (!text || assistantState.isTyping) return;
    
    // Clear input
    inputEl.value = '';
    
    // Add user message to history
    assistantState.chatHistory.push({
        sender: 'user',
        text: text,
        timestamp: Date.now()
    });
    
    // Re-render to show user message
    renderChatMessages();
    
    // Show typing indicator
    showTypingIndicator();
    
    // Get AI response
    let aiResponse;
    if (typeof sendToPokiAI === 'function') {
        aiResponse = await sendToPokiAI(text, assistantState.chatHistory);
    } else {
        console.warn('[Poki] AI module not loaded, using fallback');
        aiResponse = "Hey! I'm here to help with poker questions. Ask me about positions, hand ranges, or strategy!";
    }
    
    // Hide typing and add AI response
    hideTypingIndicator();
    
    assistantState.chatHistory.push({
        sender: 'poki',
        text: aiResponse,
        timestamp: Date.now(),
        isAI: true  // Mark as AI response (no follow-up buttons)
    });
    
    renderChatMessages();
}

/**
 * Open the profile chat panel
 */
function openProfileChat() {
    const panel = document.getElementById('assistant-chat-panel');
    if (!panel) return;
    
    if (assistantState.chatHistory.length === 0) {
        initializeChatHistory();
    }
    
    renderChatMessages();
    panel.classList.add('open');
    assistantState.isProfileChatOpen = true;
    document.body.style.overflow = 'hidden';
}

/**
 * Close the profile chat panel
 */
function closeProfileChat() {
    const panel = document.getElementById('assistant-chat-panel');
    if (panel) {
        panel.classList.remove('open');
    }
    assistantState.isProfileChatOpen = false;
    document.body.style.overflow = '';
}

/**
 * Initialize chat history with greeting
 */
function initializeChatHistory() {
    const randomGreeting = pokiChatScript.greetings[Math.floor(Math.random() * pokiChatScript.greetings.length)];
    assistantState.chatHistory = [
        { sender: 'poki', text: randomGreeting, timestamp: Date.now() }
    ];
}

/**
 * Render chat messages in the chat container
 */
function renderChatMessages() {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    assistantState.chatHistory.forEach((msg, index) => {
        const msgEl = createMessageElement(msg, index);
        container.appendChild(msgEl);
    });
    
    // Add options if last message is from Poki AND is not an AI response
    const lastMsg = assistantState.chatHistory[assistantState.chatHistory.length - 1];
    if (lastMsg && lastMsg.sender === 'poki' && !lastMsg.isAI) {
        const optionsEl = createUserOptions(lastMsg.followUps);
        container.appendChild(optionsEl);
    }
    
    container.scrollTop = container.scrollHeight;
}

/**
 * Create a chat message element
 */
function createMessageElement(msg, index) {
    const div = document.createElement('div');
    div.className = `chat-message ${msg.sender}`;
    div.style.animationDelay = `${index * 0.05}s`;
    
    if (msg.sender === 'poki') {
        const avatar = document.createElement('div');
        avatar.className = 'poki-avatar';
        avatar.innerHTML = POKI_SVG;
        div.appendChild(avatar);
    }
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = formatChatText(msg.text);
    
    div.appendChild(bubble);
    return div;
}

/**
 * Create user options buttons
 */
function createUserOptions(followUps = null) {
    const div = document.createElement('div');
    div.className = 'chat-options';
    
    // Use followUps if available, otherwise show all options
    const optionsToShow = followUps 
        ? pokiChatScript.userOptions.filter(opt => followUps.includes(opt.id))
        : pokiChatScript.userOptions;
    
    optionsToShow.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'chat-option-btn';
        btn.textContent = opt.label;
        btn.addEventListener('click', () => handleUserOption(opt));
        div.appendChild(btn);
    });
    
    // If we're showing follow-ups (deep in conversation), add a "Change Topic" button
    if (followUps) {
        const changeTopicBtn = document.createElement('button');
        changeTopicBtn.className = 'chat-option-btn change-topic-btn';
        changeTopicBtn.textContent = 'Change Topic 🔄';
        changeTopicBtn.style.marginTop = '8px';
        changeTopicBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        changeTopicBtn.addEventListener('click', () => handleUserOption({ id: 'change_topic', label: 'Change Topic 🔄' }));
        div.appendChild(changeTopicBtn);
    }
    
    return div;
}

/**
 * Handle user selecting an option
 */
async function handleUserOption(option) {
    // Add user message immediately
    assistantState.chatHistory.push({
        sender: 'user',
        text: option.label,
        timestamp: Date.now()
    });
    
    // Re-render to show user message
    renderChatMessages();
    
    // Show typing indicator
    showTypingIndicator();
    
    // Simulate natural typing delay (300-800ms)
    const delay = 300 + Math.random() * 500;
    await new Promise(r => setTimeout(r, delay));
    
    // Get response
    const responseData = pokiChatScript.responses[option.id];
    const responseText = typeof responseData === 'string' ? responseData : responseData.text;
    const followUps = typeof responseData === 'object' ? responseData.followUps : null;
    
    // Hide typing and add response
    hideTypingIndicator();
    
    assistantState.chatHistory.push({
        sender: 'poki',
        text: responseText,
        followUps: followUps,
        timestamp: Date.now()
    });
    
    renderChatMessages();
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    
    // Remove existing options
    const existingOptions = container.querySelector('.chat-options');
    if (existingOptions) existingOptions.remove();
    
    // Add typing indicator
    const typing = document.createElement('div');
    typing.className = 'chat-message poki typing-message';
    typing.innerHTML = `
        <div class="poki-avatar">${POKI_SVG}</div>
        <div class="typing-indicator">
            <span></span><span></span><span></span>
        </div>
    `;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
    
    assistantState.isTyping = true;
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator() {
    const typing = document.querySelector('.typing-message');
    if (typing) typing.remove();
    assistantState.isTyping = false;
}

/**
 * Format text for chat display
 */
function formatChatText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

// ==========================================
// PRACTICE MODE MODAL FUNCTIONS
// ==========================================

/**
 * Setup practice modal event listeners
 */
function setupPracticeModal() {
    const modalBtn = document.getElementById('practice-assistant-btn');
    const closeBtn = document.getElementById('close-practice-modal');
    const modal = document.getElementById('practice-assistant-modal');
    
    if (modalBtn) {
        modalBtn.addEventListener('click', togglePracticeModal);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closePracticeModal);
    }
    
    // Close on backdrop click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePracticeModal();
            }
        });
    }
}

/**
 * Toggle practice modal
 */
function togglePracticeModal() {
    if (assistantState.isPracticeModalOpen) {
        closePracticeModal();
    } else {
        openPracticeModal();
    }
}

/**
 * Open practice modal with current hand hint
 */
function openPracticeModal() {
    if (!assistantState.isEnabled) {
        showPokiFeedback("Yo, I'm disabled rn. Turn me on in Settings! 🔧", 'warning');
        return;
    }
    
    const modal = document.getElementById('practice-assistant-modal');
    if (!modal) return;
    
    const hint = getHintForCurrentHand();
    updatePracticeModalContent(hint);
    
    modal.classList.add('open');
    assistantState.isPracticeModalOpen = true;
}

/**
 * Close practice modal
 */
function closePracticeModal() {
    const modal = document.getElementById('practice-assistant-modal');
    if (modal) {
        modal.classList.remove('open');
    }
    assistantState.isPracticeModalOpen = false;
}

/**
 * Get hint based on current practice hand
 */
function getHintForCurrentHand() {
    if (typeof practiceState === 'undefined' || !practiceState.currentHand) {
        return {
            hint: "Deal a hand first and I'll give you the lowdown! 🎴",
            category: 'unknown',
            categoryName: 'N/A',
            generalTip: "Tap on a hand to get position-specific advice from your boy Poki.",
            position: 'N/A'
        };
    }
    
    const hand = practiceState.currentHand.hand;
    const position = practiceState.currentHeroPosition;
    
    if (typeof RuleEngine !== 'undefined') {
        return RuleEngine.getHint(position, hand);
    }
    
    return {
        hint: `You got ${hand} from ${position}. Think about your range here!`,
        category: 'unknown',
        categoryName: 'Unknown',
        generalTip: "Position is everything. Consider if this hand is profitable here.",
        position
    };
}

/**
 * Update practice modal content with hint
 */
function updatePracticeModalContent(hint) {
    const positionEl = document.getElementById('hint-position');
    const categoryEl = document.getElementById('hint-category');
    const hintTextEl = document.getElementById('hint-text');
    const tipEl = document.getElementById('hint-tip');
    
    if (positionEl) positionEl.textContent = hint.position;
    if (categoryEl) categoryEl.textContent = hint.categoryName;
    if (hintTextEl) hintTextEl.textContent = hint.hint;
    if (tipEl) tipEl.textContent = hint.generalTip;
}

// ==========================================
// SETTINGS FUNCTIONS
// ==========================================

/**
 * Setup settings toggle
 */
function setupAssistantToggle() {
    const toggle = document.getElementById('assistant-practice-toggle');
    if (!toggle) return;
    
    toggle.checked = assistantState.isEnabled;
    
    toggle.addEventListener('change', () => {
        assistantState.isEnabled = toggle.checked;
        saveAssistantSettings();
        console.log(`[Poki] ${assistantState.isEnabled ? 'Ready to help!' : 'Taking a break...'}`);
    });
}

/**
 * Check if assistant is enabled for practice mode
 */
function isAssistantEnabled() {
    return assistantState.isEnabled;
}

// ==========================================
// POST-HAND FEEDBACK (POKI STYLE)
// ==========================================

/**
 * Show Poki's feedback after a practice hand
 */
function showPostHandFeedback(position, hand, isCorrect) {
    if (!assistantState.isEnabled) return;
    
    let category = 'trash';
    if (typeof RuleEngine !== 'undefined') {
        category = RuleEngine.categorizeHand(hand);
    }
    
    if (typeof StatsTracker !== 'undefined') {
        StatsTracker.recordResult(position, category, isCorrect);
        
        const feedback = StatsTracker.generateFeedback(position, category, isCorrect);
        
        // Get a Poki-style reaction
        let reaction;
        if (feedback.type === 'success') {
            reaction = pokiChatScript.successReactions[Math.floor(Math.random() * pokiChatScript.successReactions.length)];
        } else if (feedback.type === 'struggle') {
            reaction = pokiChatScript.struggleReactions[Math.floor(Math.random() * pokiChatScript.struggleReactions.length)];
        } else {
            reaction = pokiChatScript.neutralReactions[Math.floor(Math.random() * pokiChatScript.neutralReactions.length)];
        }
        
        // Show feedback ~40% of the time, or always for specific insights
        if (feedback.type !== 'neutral' || Math.random() < 0.4) {
            showPokiFeedback(reaction, feedback.type);
        }
    }
}

/**
 * Show Poki feedback toast (top of screen)
 */
function showPokiFeedback(message, type = 'info') {
    // Remove existing
    const existing = document.querySelector('.poki-feedback');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `poki-feedback poki-feedback-${type}`;
    toast.innerHTML = `
        <div class="poki-feedback-avatar">${POKI_SVG}</div>
        <span class="poki-feedback-text">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// EXPORTS
// ==========================================

if (typeof window !== 'undefined') {
    window.initializeAssistant = initializeAssistant;
    window.openProfileChat = openProfileChat;
    window.closeProfileChat = closeProfileChat;
    window.openPracticeModal = openPracticeModal;
    window.closePracticeModal = closePracticeModal;
    window.showPostHandFeedback = showPostHandFeedback;
    window.showPokiFeedback = showPokiFeedback;
    window.isAssistantEnabled = isAssistantEnabled;
    window.pokiChatScript = pokiChatScript;
    window.POKI_SVG = POKI_SVG;
}
