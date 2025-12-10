// ==========================================
// TILT CONTROL SYSTEM FOR PREFLOP BUILDER
// Version 1.0.0 - Device orientation-based controls
// ==========================================

/**
 * TiltController - Handles device orientation events for tilt-based navigation
 * Uses DeviceOrientationEvent API for detecting left/right tilts
 * 
 * Tilt Left: Navigate to previous hand in history
 * Tilt Right: Pass current hand without selection OR close hand detail panel
 */
class TiltController {
    constructor(options = {}) {
        // Configuration with configurable thresholds
        this.config = {
            // Minimum tilt angle (in degrees) to trigger an action
            tiltThreshold: options.tiltThreshold || 25,
            // Cooldown period (ms) between tilt actions to prevent rapid firing
            cooldownMs: options.cooldownMs || 800,
            // Neutral zone - device must return within this range to re-enable tilts
            neutralZone: options.neutralZone || 10,
            // Enable/disable tilt controls
            enabled: true
        };
        
        // State tracking
        this.isSupported = false;
        this.hasPermission = false;
        this.isActive = false;
        this.lastTiltTime = 0;
        this.lastTiltDirection = null;
        this.isInCooldown = false;
        this.hasReturnedToNeutral = true;
        this.currentGamma = 0; // Left/right tilt angle
        
        // Callback functions
        this.onTiltLeft = null;
        this.onTiltRight = null;
        this.onStateChange = null;
        this.onTiltDetected = null; // For UI feedback
        
        // Bound event handler (for removal)
        this.boundOrientationHandler = this.handleOrientation.bind(this);
        
        // Check API support
        this.checkSupport();
    }
    
    /**
     * Check if DeviceOrientation API is supported
     */
    checkSupport() {
        // Check for API availability
        if ('DeviceOrientationEvent' in window) {
            this.isSupported = true;
            
            // iOS 13+ requires permission
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                this.requiresPermission = true;
            } else {
                this.requiresPermission = false;
                this.hasPermission = true;
            }
        }
        
        console.log(`[Tilt] Supported: ${this.isSupported}, Requires permission: ${this.requiresPermission}`);
        return this.isSupported;
    }
    
    /**
     * Request permission for device orientation (iOS 13+)
     * Must be called from a user gesture (e.g., button click)
     */
    async requestPermission() {
        if (!this.isSupported) {
            console.warn('[Tilt] Device orientation not supported');
            return false;
        }
        
        if (!this.requiresPermission) {
            this.hasPermission = true;
            return true;
        }
        
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            this.hasPermission = (permission === 'granted');
            console.log(`[Tilt] Permission ${this.hasPermission ? 'granted' : 'denied'}`);
            return this.hasPermission;
        } catch (error) {
            console.error('[Tilt] Permission request failed:', error);
            return false;
        }
    }
    
    /**
     * Start listening for device orientation events
     */
    start() {
        if (!this.isSupported) {
            console.warn('[Tilt] Cannot start - not supported');
            return false;
        }
        
        if (!this.hasPermission) {
            console.warn('[Tilt] Cannot start - no permission');
            return false;
        }
        
        if (this.isActive) {
            return true;
        }
        
        window.addEventListener('deviceorientation', this.boundOrientationHandler, true);
        this.isActive = true;
        this.config.enabled = true;
        
        if (this.onStateChange) {
            this.onStateChange(true);
        }
        
        console.log('[Tilt] Started listening');
        return true;
    }
    
    /**
     * Stop listening for device orientation events
     */
    stop() {
        if (!this.isActive) {
            return;
        }
        
        window.removeEventListener('deviceorientation', this.boundOrientationHandler, true);
        this.isActive = false;
        
        if (this.onStateChange) {
            this.onStateChange(false);
        }
        
        console.log('[Tilt] Stopped listening');
    }
    
    /**
     * Toggle tilt controls on/off
     */
    toggle() {
        if (this.isActive) {
            this.stop();
            return false;
        } else {
            return this.start();
        }
    }
    
    /**
     * Enable or disable tilt actions (without removing listener)
     * Useful for temporarily pausing during animations
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
    }
    
    /**
     * Handle device orientation event
     * gamma: left-to-right tilt in degrees (-90 to 90)
     * beta: front-to-back tilt
     * alpha: compass direction (we ignore this)
     */
    handleOrientation(event) {
        if (!this.config.enabled) return;
        
        const gamma = event.gamma; // Left/right tilt: -90 (left) to 90 (right)
        
        if (gamma === null) return;
        
        this.currentGamma = gamma;
        
        // Update debug panel if visible
        updateTiltDebugPanel(gamma, this.hasReturnedToNeutral);
        
        // Check if we've returned to neutral zone
        if (Math.abs(gamma) < this.config.neutralZone) {
            if (!this.hasReturnedToNeutral) {
                this.hasReturnedToNeutral = true;
                this.lastTiltDirection = null;
            }
            return;
        }
        
        // Must return to neutral before triggering another tilt in same direction
        if (!this.hasReturnedToNeutral) {
            return;
        }
        
        // Check cooldown
        const now = Date.now();
        if (now - this.lastTiltTime < this.config.cooldownMs) {
            return;
        }
        
        // Determine tilt direction
        let direction = null;
        
        if (gamma <= -this.config.tiltThreshold) {
            direction = 'left';
        } else if (gamma >= this.config.tiltThreshold) {
            direction = 'right';
        }
        
        if (direction) {
            this.triggerTilt(direction);
        }
    }

    
    /**
     * Trigger a tilt action
     */
    triggerTilt(direction) {
        this.lastTiltTime = Date.now();
        this.lastTiltDirection = direction;
        this.hasReturnedToNeutral = false;
        
        console.log(`[Tilt] Detected: ${direction} (gamma: ${this.currentGamma.toFixed(1)}°)`);
        
        // UI feedback callback
        if (this.onTiltDetected) {
            this.onTiltDetected(direction);
        }
        
        // Action callbacks
        if (direction === 'left' && this.onTiltLeft) {
            this.onTiltLeft();
        } else if (direction === 'right' && this.onTiltRight) {
            this.onTiltRight();
        }
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[Tilt] Config updated:', this.config);
    }
    
    /**
     * Get current state info
     */
    getState() {
        return {
            isSupported: this.isSupported,
            hasPermission: this.hasPermission,
            isActive: this.isActive,
            isEnabled: this.config.enabled,
            currentGamma: this.currentGamma
        };
    }
}

// ==========================================
// TILT INTEGRATION WITH PRACTICE MODE
// ==========================================

// Global tilt controller instance
let tiltController = null;

/**
 * Initialize tilt controls for practice mode
 * Called from setupPracticeMode() in main.js
 */
function initializeTiltControls() {
    // Check if already initialized
    if (tiltController) {
        return;
    }
    
    tiltController = new TiltController({
        tiltThreshold: 25,  // Degrees of tilt to trigger
        cooldownMs: 800,    // Prevent rapid triggers
        neutralZone: 10     // Must return near level to re-trigger
    });
    
    // Check support
    if (!tiltController.isSupported) {
        console.log('[Tilt] Device orientation not supported - tilt controls disabled');
        // Still show debug panel with "Not Supported" message
        const debugPanel = document.getElementById('tilt-debug-panel');
        const statusValue = document.getElementById('tilt-status');
        if (debugPanel && tiltDebugMode) {
            debugPanel.classList.add('visible');
            if (statusValue) statusValue.textContent = 'Not Supported';
        }
        return;
    }
    
    // Set up callbacks
    tiltController.onTiltLeft = handleTiltLeft;
    tiltController.onTiltRight = handleTiltRight;
    tiltController.onTiltDetected = showTiltFeedback;
    
    // Show debug panel immediately if debug mode is on
    if (tiltDebugMode) {
        const debugPanel = document.getElementById('tilt-debug-panel');
        const statusValue = document.getElementById('tilt-status');
        if (debugPanel) {
            debugPanel.classList.add('visible');
            if (statusValue) statusValue.textContent = 'Waiting for permission...';
        }
    }
    
    // For non-iOS devices, start immediately
    if (!tiltController.requiresPermission) {
        tiltController.start();
        console.log('[Tilt] Started automatically (no permission required)');
        const statusValue = document.getElementById('tilt-status');
        if (statusValue) statusValue.textContent = 'Active - tilt device!';
    } else {
        console.log('[Tilt] Waiting for user permission (iOS)');
    }
    
    console.log('[Tilt] Tilt controls initialized');
}


/**
 * Request tilt permission (needed for iOS 13+)
 * Must be called from a user gesture
 */
async function requestTiltPermission() {
    if (!tiltController) {
        initializeTiltControls();
    }
    
    const granted = await tiltController.requestPermission();
    if (granted) {
        tiltController.start();
    }
    return granted;
}

/**
 * Handle tilt left action: Navigate to previous hand
 */
function handleTiltLeft() {
    // Check if hand detail panel is open
    const detailPanel = document.getElementById('hand-detail-panel');
    if (detailPanel && detailPanel.classList.contains('visible')) {
        // Navigate to previous hand in detail view (if we had this)
        // For now, just close the panel
        console.log('[Tilt] Left: Closing detail panel');
        if (typeof hideHandDetails === 'function') {
            hideHandDetails();
        }
        return;
    }

    
    // Check if there are previous hands to view
    if (typeof practiceState !== 'undefined' && practiceState.handHistory.length > 0) {
        // Navigate to the last hand in history
        const lastHandIndex = practiceState.handHistory.length - 1;
        const lastHand = practiceState.handHistory[lastHandIndex];
        
        if (lastHand && typeof showHandDetails === 'function') {
            console.log('[Tilt] Left: Showing previous hand details');
            showHandDetails(lastHand);
        }
    } else {
        console.log('[Tilt] Left: No previous hand to show');
        showTiltToast('No previous hand', 'info');
    }
}

/**
 * Handle tilt right action: Skip current hand OR close detail panel
 */
function handleTiltRight() {
    // Check if hand detail panel is open
    const detailPanel = document.getElementById('hand-detail-panel');
    if (detailPanel && detailPanel.classList.contains('visible')) {
        // Close the detail panel (like clicking the close button)
        console.log('[Tilt] Right: Closing detail panel');
        if (typeof hideHandDetails === 'function') {
            hideHandDetails();
        }
        return;
    }

    
    // Pass current hand without selection
    console.log('[Tilt] Right: Skipping current hand');
    skipCurrentHand();
}

/**
 * Skip the current hand without making a selection
 * Records as "skipped" in history and moves to next hand
 */
function skipCurrentHand() {
    // Check if practice mode is active
    if (typeof practiceState === 'undefined' || !practiceState.currentHand) {
        console.log('[Tilt] No current hand to skip');
        return;
    }
    
    // Calculate decision time
    const decisionTime = typeof lastDecisionTime !== 'undefined' 
        ? Date.now() - lastDecisionTime 
        : 0;
    
    if (typeof lastDecisionTime !== 'undefined') {
        lastDecisionTime = Date.now();
    }
    
    // Store skipped hand in history
    const handRecord = {
        ...practiceState.currentHand,
        userAction: 'skipped',
        isCorrect: false, // Skipped counts as incorrect
        wasSkipped: true, // Mark as skipped for UI differentiation
        handNumber: (typeof handsPlayed !== 'undefined' ? handsPlayed : 0) + 1,
        decisionTime: decisionTime
    };
    
    practiceState.handHistory.push(handRecord);
    
    // Update statistics
    if (typeof handsPlayed !== 'undefined') {
        handsPlayed++;
    }
    if (typeof currentStreak !== 'undefined') {
        currentStreak = 0; // Reset streak on skip
    }
    
    // Show skip feedback
    showSkipFeedback();
    
    // Update history tracker
    if (typeof updateHistoryTracker === 'function') {
        updateHistoryTracker(false, handsPlayed);
    }
    
    // Move to next hand after short delay
    setTimeout(() => {
        if (typeof practiceState !== 'undefined') {
            practiceState.currentHandIndex++;
        }
        if (typeof dealNextPracticeHand === 'function') {
            dealNextPracticeHand();
        }
    }, 800);
}

/**
 * Show visual feedback when tilt is detected
 */
function showTiltFeedback(direction) {
    // Create or update tilt indicator
    let indicator = document.getElementById('tilt-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'tilt-indicator';
        indicator.className = 'tilt-indicator';
        document.body.appendChild(indicator);
    }
    
    // Set direction class
    indicator.classList.remove('tilt-left', 'tilt-right');
    indicator.classList.add(`tilt-${direction}`);
    
    // Set arrow content
    indicator.innerHTML = direction === 'left' 
        ? '<span class="tilt-arrow">←</span><span class="tilt-text">Previous</span>'
        : '<span class="tilt-arrow">→</span><span class="tilt-text">Skip</span>';
    
    // Show with animation
    indicator.classList.add('show');
    
    // Hide after animation
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 600);
}

/**
 * Show feedback when a hand is skipped
 */
function showSkipFeedback() {
    // Use existing feedback overlay if available
    const feedbackOverlay = document.getElementById('practice-feedback-overlay');
    const feedbackMessage = document.getElementById('feedback-message');
    
    if (feedbackOverlay && feedbackMessage) {
        const mainText = feedbackMessage.querySelector('.feedback-main-text');
        const secondaryText = feedbackMessage.querySelector('.feedback-secondary-text');
        
        if (mainText) mainText.textContent = 'Skipped';
        if (secondaryText) secondaryText.textContent = 'Hand passed';
        
        feedbackOverlay.classList.add('show', 'skipped');
        
        setTimeout(() => {
            feedbackOverlay.classList.remove('show', 'skipped');
        }, 700);
    } else {
        // Fallback toast
        showTiltToast('Hand skipped', 'info');
    }
}

/**
 * Show a temporary toast message for tilt feedback
 */
function showTiltToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.tilt-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `tilt-toast tilt-toast-${type}`;
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
    }, 1500);
}

/**
 * Stop tilt controls (called when leaving practice page)
 */
function stopTiltControls() {
    if (tiltController) {
        tiltController.stop();
    }
}

/**
 * Pause tilt controls temporarily (e.g., during animations)
 */
function pauseTiltControls() {
    if (tiltController) {
        tiltController.setEnabled(false);
    }
}

/**
 * Resume tilt controls
 */
function resumeTiltControls() {
    if (tiltController) {
        tiltController.setEnabled(true);
    }
}

// ==========================================
// DEBUG PANEL AND PERMISSION HANDLING
// ==========================================

// Debug mode flag (set to true for testing)
let tiltDebugMode = true;

/**
 * Update the tilt debug panel with current values
 */
function updateTiltDebugPanel(gamma, isNeutral) {
    const debugPanel = document.getElementById('tilt-debug-panel');
    const gammaValue = document.getElementById('tilt-gamma-value');
    const statusValue = document.getElementById('tilt-status');
    
    if (!debugPanel || !gammaValue || !statusValue) return;
    
    // Show debug panel if in debug mode
    if (tiltDebugMode && tiltController && tiltController.isActive) {
        debugPanel.classList.add('visible');
    }
    
    // Update gamma value
    gammaValue.textContent = `γ: ${gamma.toFixed(1)}°`;
    
    // Update status
    if (isNeutral) {
        statusValue.textContent = 'Ready';
        statusValue.className = 'active';
    } else {
        statusValue.textContent = gamma < 0 ? '← Tilting' : 'Tilting →';
        statusValue.className = 'active';
    }
}

/**
 * Flash the debug status when a tilt is triggered
 */
function flashDebugTriggered(direction) {
    const statusValue = document.getElementById('tilt-status');
    if (!statusValue) return;
    
    statusValue.textContent = direction === 'left' ? '← TRIGGERED!' : 'TRIGGERED! →';
    statusValue.className = 'triggered';
    
    setTimeout(() => {
        statusValue.className = 'active';
    }, 500);
}

/**
 * Check if permissions are needed and show banner if so
 */
function checkAndShowPermissionBanner() {
    const banner = document.getElementById('sensor-permission-banner');
    if (!banner) return;
    
    // Check if permissions have been dismissed before
    const dismissed = localStorage.getItem('preflop-permissions-dismissed');
    if (dismissed === 'true') {
        banner.style.display = 'none';
        return;
    }
    
    // Check if we need permissions
    const needsTiltPermission = tiltController && tiltController.requiresPermission && !tiltController.hasPermission;
    const needsMicPermission = typeof navigator.permissions !== 'undefined'; // Mic always needs user gesture
    
    // Show banner if any permission is needed
    if (needsTiltPermission || needsMicPermission) {
        banner.style.display = 'block';
        setupPermissionButtons();
    } else {
        banner.style.display = 'none';
    }
}

/**
 * Setup permission button click handlers
 */
function setupPermissionButtons() {
    const grantBtn = document.getElementById('grant-permissions-btn');
    const dismissBtn = document.getElementById('dismiss-permissions-btn');
    const banner = document.getElementById('sensor-permission-banner');
    
    if (grantBtn) {
        grantBtn.addEventListener('click', async () => {
            console.log('[Permissions] Requesting permissions...');
            
            // Request all permissions
            const results = await requestAllSensorPermissions();
            
            console.log('[Permissions] Results:', results);
            
            // Show result toast
            if (results.tilt || results.microphone) {
                showTiltToast('Sensors enabled! 🎉', 'success');
            } else {
                showTiltToast('Some permissions denied', 'error');
            }
            
            // Hide banner
            if (banner) banner.style.display = 'none';
        });
    }
    
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            if (banner) banner.style.display = 'none';
            localStorage.setItem('preflop-permissions-dismissed', 'true');
        });
    }
}

/**
 * Request all sensor permissions (microphone + device orientation)
 * Must be called from a user gesture
 */
async function requestAllSensorPermissions() {
    const results = {
        microphone: false,
        tilt: false
    };
    
    // Request microphone permission
    try {
        console.log('[Permissions] Requesting microphone...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately, we just needed permission
        stream.getTracks().forEach(track => track.stop());
        results.microphone = true;
        console.log('[Permissions] Microphone granted');
    } catch (error) {
        console.warn('[Permissions] Microphone denied:', error.message);
        results.microphone = false;
    }
    
    // Request device orientation permission (iOS 13+)
    if (tiltController && tiltController.requiresPermission) {
        console.log('[Permissions] Requesting device orientation...');
        const granted = await requestTiltPermission();
        results.tilt = granted;
        console.log('[Permissions] Device orientation:', granted ? 'granted' : 'denied');
    } else if (tiltController) {
        // No permission required, just start
        tiltController.start();
        results.tilt = true;
        console.log('[Permissions] Device orientation: auto-granted (no permission required)');
    }
    
    // Show debug panel if tilt is now active
    if (results.tilt && tiltDebugMode) {
        const debugPanel = document.getElementById('tilt-debug-panel');
        if (debugPanel) debugPanel.classList.add('visible');
    }
    
    return results;
}

/**
 * Toggle debug mode
 */
function setTiltDebugMode(enabled) {
    tiltDebugMode = enabled;
    const debugPanel = document.getElementById('tilt-debug-panel');
    if (debugPanel) {
        if (enabled && tiltController && tiltController.isActive) {
            debugPanel.classList.add('visible');
        } else {
            debugPanel.classList.remove('visible');
        }
    }
    console.log(`[Tilt] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
}

// Enhanced showTiltFeedback to also flash debug panel
const originalShowTiltFeedback = showTiltFeedback;

// Override to add debug flash
showTiltFeedback = function(direction) {
    // Call original
    originalShowTiltFeedback(direction);
    
    // Flash debug panel
    flashDebugTriggered(direction);
    
    // Log to console for testing
    console.log(`%c[TILT ${direction.toUpperCase()}] Action triggered!`, 
        'background: #ff9800; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
};

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.initializeTiltControls = initializeTiltControls;
    window.stopTiltControls = stopTiltControls;
    window.requestTiltPermission = requestTiltPermission;
    window.pauseTiltControls = pauseTiltControls;
    window.resumeTiltControls = resumeTiltControls;
    window.skipCurrentHand = skipCurrentHand;
    window.TiltController = TiltController;
    window.requestAllSensorPermissions = requestAllSensorPermissions;
    window.setTiltDebugMode = setTiltDebugMode;
    window.checkAndShowPermissionBanner = checkAndShowPermissionBanner;
}

