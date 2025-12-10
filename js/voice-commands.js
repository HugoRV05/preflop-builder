// ==========================================
// VOICE COMMAND SYSTEM FOR PREFLOP BUILDER
// Version 1.0.0 - Voice control for practice mode
// ==========================================

/**
 * VoiceCommandManager - Handles voice recognition and command parsing
 * Uses W3C Web Speech API for speech-to-text
 */
class VoiceCommandManager {
    constructor() {
        // Check for Web Speech API support
        this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.isSupported = !!this.SpeechRecognition;
        
        this.recognition = null;
        this.isListening = false;
        this.isStarting = false; // Prevent double-start race condition
        this.timeoutId = null;
        this.TIMEOUT_MS = 5000; // 5 second timeout
        
        // Persistent toggle state - stays on until user explicitly clicks off
        this.userEnabledVoice = false;
        
        // Callback functions
        this.onResult = null;
        this.onError = null;
        this.onStateChange = null;
        
        // Command vocabulary mapping
        // Includes phonetic variations for common misrecognitions
        this.commandMap = {
            // FOLD - and phonetic variations (sounds like "fold")
            'fold': 'fold',
            'fault': 'fold',  // Common misrecognition
            'ford': 'fold',   // Common misrecognition
            'folds': 'fold',
            'folding': 'fold',
            'fuck': 'fold',   // Sometimes recognized as this
            'foe': 'fold',
            'full': 'fold',
            'fall': 'fold',
            'folk': 'fold',
            // Additional fold variations
            'phone': 'fold',
            'fast': 'fold',
            'old': 'fold',
            'hold': 'fold',
            'mold': 'fold',
            'told': 'fold',
            'sold': 'fold',
            'bold': 'fold',
            'gold': 'fold',
            'false': 'fold',
            'fort': 'fold',
            'food': 'fold',
            'four': 'fold',
            'for': 'fold',
            'fog': 'fold',
            'fought': 'fold',
            'foam': 'fold',
            
            // NO-FOLD (for fold-no-fold mode)
            'no fold': 'no-fold',
            'no-fold': 'no-fold',
            'nofold': 'no-fold',
            'don\'t fold': 'no-fold',
            'not fold': 'no-fold',
            'play': 'no-fold',
            'stay': 'no-fold',
            'continue': 'no-fold',
            'keep': 'no-fold',
            'raise': 'no-fold',  // Playing means not folding
            
            // CALL - and variations
            'call': 'call',
            'calls': 'call',
            'calling': 'call',
            'cool': 'call',    // Misrecognition
            'cold': 'call',    // Misrecognition
            'car': 'call',     // Misrecognition
            // Additional call variations
            'caught': 'call',
            'paul': 'call',
            'ball': 'call',
            'tall': 'call',
            'hall': 'call',
            'wall': 'call',
            'mall': 'call',
            'core': 'call',
            'cor': 'call',
            'caw': 'call',
            'cal': 'call',
            'carl': 'call',
            'coal': 'call',
            'cow': 'call',
            'cause': 'call',
            'cost': 'call',
            'col': 'call',
            'kyle': 'call',
            
            // Open raise variations
            'open': 'or-fold',
            'open raise': 'or-fold',
            'open fold': 'or-fold',
            'open call': 'or-call',
            'open four bet fold': 'or-4bet-fold',
            'open four bet call': 'or-4bet-call',
            'open 4 bet fold': 'or-4bet-fold',
            'open 4 bet call': 'or-4bet-call',
            'open fourbet fold': 'or-4bet-fold',
            'open fourbet call': 'or-4bet-call',
            
            // 3-bet variations
            'three bet': 'three-bet-fold',
            '3 bet': 'three-bet-fold',
            'three bet fold': 'three-bet-fold',
            '3 bet fold': 'three-bet-fold',
            'three bet call': 'three-bet-call',
            '3 bet call': 'three-bet-call',
            'three bet push': 'three-bet-push',
            '3 bet push': 'three-bet-push',
            'three bet all in': 'three-bet-push',
            '3 bet all in': 'three-bet-push',
            'threebet': 'three-bet-fold',
            'threebet fold': 'three-bet-fold',
            'threebet call': 'three-bet-call',
            'threebet push': 'three-bet-push'
        };
        
        // Words that sound like "fold" (for fuzzy matching)
        this.foldVariations = ['fold', 'fault', 'ford', 'folds', 'folding', 'fuck', 'foe', 'full', 'fall', 'folk', 'false', 'fort', 'food', 'phone', 'fast', 'old', 'hold', 'mold', 'told', 'sold', 'bold', 'gold', 'four', 'for', 'fog', 'fought', 'foam'];
        
        // Words that indicate "no fold" / "play"
        this.noFoldVariations = ['no', 'play', 'stay', 'continue', 'keep', 'raise', 'bet', 'don\'t'];

        
        if (this.isSupported) {
            this.initRecognition();
        }
    }
    
    /**
     * Initialize the SpeechRecognition instance
     */
    initRecognition() {
        this.recognition = new this.SpeechRecognition();
        
        // Configuration
        this.recognition.continuous = false; // Stop after first result
        this.recognition.interimResults = false; // Only final results
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3; // Get multiple interpretations
        
        // Event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            this.isStarting = false; // Clear starting flag
            this.resetTimeout();
            if (this.onStateChange) {
                this.onStateChange(true);
            }
            console.log('[Voice] Recognition started');
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.isStarting = false; // Clear starting flag
            this.clearTimeout();
            
            // Auto-restart if user has voice enabled (persistent toggle)
            if (this.userEnabledVoice) {
                console.log('[Voice] Recognition ended, auto-restarting...');
                // Small delay before restarting to avoid rapid fire
                setTimeout(() => {
                    if (this.userEnabledVoice && !this.isListening && !this.isStarting) {
                        this.startListening();
                    }
                }, 300);
                // Keep UI showing as "listening" since we're restarting
                return;
            }
            
            if (this.onStateChange) {
                this.onStateChange(false);
            }
            console.log('[Voice] Recognition ended');
        };
        
        this.recognition.onerror = (event) => {
            console.error('[Voice] Recognition error:', event.error);
            this.isListening = false;
            this.clearTimeout();
            
            if (this.onStateChange) {
                this.onStateChange(false);
            }
            
            // Handle specific errors
            let errorMessage = 'Voice recognition error';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected';
                    break;
                case 'audio-capture':
                    errorMessage = 'Microphone not available';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone permission denied';
                    break;
                case 'network':
                    errorMessage = 'Network error - check connection';
                    break;
            }
            
            if (this.onError) {
                this.onError(errorMessage);
            }
        };
        
        this.recognition.onresult = (event) => {
            this.clearTimeout();
            
            // Get all result alternatives
            const results = event.results[0];
            let matchedAction = null;
            let transcript = '';
            
            // Try each alternative to find a matching command
            for (let i = 0; i < results.length; i++) {
                transcript = results[i].transcript.toLowerCase().trim();
                console.log(`[Voice] Transcript ${i}: "${transcript}" (confidence: ${results[i].confidence.toFixed(2)})`);
                
                matchedAction = this.parseCommand(transcript);
                if (matchedAction) {
                    break;
                }
            }
            
            // Use first transcript for display
            transcript = results[0].transcript.toLowerCase().trim();
            
            if (matchedAction) {
                console.log(`[Voice] Matched action: ${matchedAction}`);
                if (this.onResult) {
                    this.onResult(matchedAction, transcript);
                }
            } else {
                console.log(`[Voice] No match for: "${transcript}"`);
                if (this.onError) {
                    this.onError(`Command not recognized: "${transcript}"`);
                }
            }
        };
    }
    
    /**
     * Parse transcript into action class
     * @param {string} transcript - The recognized speech text
     * @returns {string|null} - Action class or null if no match
     */
    parseCommand(transcript) {
        // Clean up transcript
        const cleaned = transcript
            .toLowerCase()
            .trim()
            .replace(/[.,!?]/g, '') // Remove punctuation
            .replace(/\s+/g, ' '); // Normalize whitespace
        
        // Direct match first
        if (this.commandMap[cleaned]) {
            return this.commandMap[cleaned];
        }
        
        // Try fuzzy matching for compound commands
        const tokens = cleaned.split(' ');
        
        // Build compound command from tokens
        if (tokens.includes('open') || tokens.includes('or')) {
            if (tokens.includes('four') || tokens.includes('4')) {
                if (tokens.includes('call')) return 'or-4bet-call';
                return 'or-4bet-fold';
            }
            if (tokens.includes('call')) return 'or-call';
            return 'or-fold';
        }
        
        if (tokens.includes('three') || tokens.includes('3') || tokens.includes('bet')) {
            // Check if it's actually a 3-bet command
            if (tokens.includes('three') || tokens.includes('3') || 
                (tokens.includes('bet') && !tokens.includes('four') && !tokens.includes('4'))) {
                if (tokens.includes('push') || tokens.includes('all') || tokens.includes('in')) {
                    return 'three-bet-push';
                }
                if (tokens.includes('call')) return 'three-bet-call';
                return 'three-bet-fold';
            }
        }
        
        // Check for "no fold" pattern first (before checking fold)
        const hasNoFoldIndicator = tokens.some(t => this.noFoldVariations.includes(t));
        const hasFoldWord = tokens.some(t => this.foldVariations.includes(t));
        
        if (hasNoFoldIndicator && hasFoldWord) {
            // "no fold", "don't fold", etc.
            return 'no-fold';
        }
        
        if (hasNoFoldIndicator && (tokens.includes('play') || tokens.includes('stay') || tokens.includes('continue'))) {
            // Just "play", "stay", "continue" without fold
            return 'no-fold';
        }
        
        // Single word matches with fuzzy fold detection
        if (hasFoldWord && !hasNoFoldIndicator) {
            return 'fold';
        }
        
        // Call variations
        const callVariations = ['call', 'calls', 'calling', 'cool', 'cold', 'car', 'coal'];
        if (tokens.some(t => callVariations.includes(t)) && 
            !tokens.includes('open') && !tokens.includes('three') && !tokens.includes('3')) {
            return 'call';
        }
        
        return null;
    }
    
    /**

     * Start listening for voice commands
     */
    startListening() {
        if (!this.isSupported) {
            console.warn('[Voice] Speech recognition not supported');
            if (this.onError) {
                this.onError('Voice commands not supported in this browser');
            }
            return false;
        }
        
        // Prevent starting if already listening or in the process of starting
        if (this.isListening || this.isStarting) {
            console.log('[Voice] Already listening or starting, ignoring start request');
            return true;
        }
        
        try {
            this.isStarting = true; // Set flag before async start
            this.recognition.start();
            return true;
        } catch (error) {
            this.isStarting = false;
            console.error('[Voice] Failed to start recognition:', error);
            if (this.onError) {
                this.onError('Failed to start voice recognition');
            }
            return false;
        }
    }
    
    /**
     * Stop listening for voice commands
     */
    stopListening() {
        if (!this.isSupported || !this.isListening) {
            return;
        }
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('[Voice] Failed to stop recognition:', error);
        }
        
        this.clearTimeout();
    }
    
    /**
     * Toggle listening state
     * Sets persistent flag so voice stays on until explicitly toggled off
     * @returns {boolean} - New listening state
     */
    toggle() {
        if (this.isListening || this.userEnabledVoice) {
            // User is turning voice OFF
            this.userEnabledVoice = false;
            this.stopListening();
            console.log('[Voice] User disabled voice control');
            return false;
        } else {
            // User is turning voice ON
            this.userEnabledVoice = true;
            console.log('[Voice] User enabled voice control (persistent)');
            return this.startListening();
        }
    }
    
    /**
     * Reset the auto-stop timeout
     */
    resetTimeout() {
        this.clearTimeout();
        this.timeoutId = setTimeout(() => {
            console.log('[Voice] Timeout - stopping recognition');
            this.stopListening();
        }, this.TIMEOUT_MS);
    }
    
    /**
     * Clear the auto-stop timeout
     */
    clearTimeout() {
        if (this.timeoutId) {
            window.clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    
    /**
     * Check if voice commands are supported
     * @returns {boolean}
     */
    checkSupport() {
        return this.isSupported;
    }
}

// Global voice manager instance
let voiceManager = null;

/**
 * Initialize voice commands for practice mode
 * Called from setupPracticeMode() in main.js
 */
function initializeVoiceCommands() {
    // Check if already initialized
    if (voiceManager) {
        return;
    }
    
    voiceManager = new VoiceCommandManager();
    
    // Check support and hide button if not supported
    const voiceBtn = document.getElementById('voice-toggle-btn');
    if (!voiceManager.checkSupport()) {
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
        console.log('[Voice] Voice commands not supported - hiding button');
        return;
    }
    
    // Set up callbacks
    voiceManager.onStateChange = (isListening) => {
        updateVoiceButtonState(isListening);
    };
    
    voiceManager.onResult = (actionClass, transcript) => {
        handleVoiceCommand(actionClass, transcript);
    };
    
    voiceManager.onError = (errorMessage) => {
        showVoiceError(errorMessage);
    };
    
    // Set up voice button click handler
    if (voiceBtn) {
        voiceBtn.addEventListener('click', () => {
            voiceManager.toggle();
        });
    }
    
    console.log('[Voice] Voice commands initialized');
}

/**
 * Update voice button visual state
 * @param {boolean} isListening - Whether currently listening
 */
function updateVoiceButtonState(isListening) {
    const voiceBtn = document.getElementById('voice-toggle-btn');
    if (!voiceBtn) return;
    
    // Check both current listening state AND user's persistent toggle state
    const shouldShowActive = isListening || (voiceManager && voiceManager.userEnabledVoice);
    
    if (shouldShowActive) {
        voiceBtn.classList.add('listening');
        voiceBtn.setAttribute('aria-pressed', 'true');
    } else {
        voiceBtn.classList.remove('listening');
        voiceBtn.setAttribute('aria-pressed', 'false');
    }
}

/**
 * Handle a recognized voice command
 * @param {string} actionClass - The matched action class
 * @param {string} transcript - Original transcript for display
 */
function handleVoiceCommand(actionClass, transcript) {
    // Find the button with this action class
    const button = document.querySelector(`.practice-action-btn.${actionClass}`);
    
    // Log what was recognized and what action will be taken
    console.log(`%c[VOICE] "${transcript}" → ${actionClass}`, 
        'background: #4caf50; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
    
    if (!button) {
        showVoiceError(`Button not found for: ${actionClass}`);
        return;
    }
    
    // Check if button is visible/available
    if (button.style.display === 'none' || button.offsetParent === null) {
        showVoiceError('Action not available for current position');
        return;
    }
    
    // Show a toast with what was recognized
    showVoiceToast(`🎤 ${button.textContent}`, 'success');
    
    // Add voice-activated animation to the button (stronger effect)
    button.classList.add('voice-activated');
    
    // Also add a temporary scale and glow
    button.style.transform = 'scale(1.15)';
    button.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.8), 0 0 60px rgba(0, 212, 255, 0.4)';
    button.style.zIndex = '10';
    
    // Remove animation class and reset styles after it completes
    setTimeout(() => {
        button.classList.remove('voice-activated');
        button.style.transform = '';
        button.style.boxShadow = '';
        button.style.zIndex = '';
    }, 800);
    
    // Trigger the action (using existing handlePracticeAction function)
    if (typeof handlePracticeAction === 'function') {
        handlePracticeAction(actionClass);
    }
    
    console.log(`[Voice] Executed action: ${actionClass}`);
}


/**
 * Show voice error feedback
 * @param {string} message - Error message to display
 */
function showVoiceError(message) {
    console.warn('[Voice] Error:', message);
    
    // Shake the voice button to indicate error
    const voiceBtn = document.getElementById('voice-toggle-btn');
    if (voiceBtn) {
        voiceBtn.classList.add('voice-error');
        setTimeout(() => {
            voiceBtn.classList.remove('voice-error');
        }, 500);
    }
    
    // Show a brief toast message
    showVoiceToast(message, 'error');
}

/**
 * Show a temporary toast message for voice feedback
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 */
function showVoiceToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.voice-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `voice-toast voice-toast-${type}`;
    toast.textContent = message;
    
    // Add to practice page
    const practiceLayout = document.querySelector('.practice-layout');
    if (practiceLayout) {
        practiceLayout.appendChild(toast);
    } else {
        document.body.appendChild(toast);
    }
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2000);
}

/**
 * Stop voice recognition (called when leaving practice page)
 * Also clears persistent toggle state
 */
function stopVoiceRecognition() {
    if (voiceManager) {
        voiceManager.userEnabledVoice = false; // Clear persistent state
        if (voiceManager.isListening) {
            voiceManager.stopListening();
        }
    }
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.initializeVoiceCommands = initializeVoiceCommands;
    window.stopVoiceRecognition = stopVoiceRecognition;
    window.VoiceCommandManager = VoiceCommandManager;
}
