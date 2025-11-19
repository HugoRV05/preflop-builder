// ==========================================
// PAGE NAVIGATION AND INITIALIZATION
// Version 1.2.8 - Fixed mobile scrolling for settings pages
// ==========================================

// Configuration - Update this path if the default ranges file moves
const DEFAULT_RANGES_PATH = 'assets/default-preflop-ranges-v1.json';

// Global state
let currentHeroPosition = 'BU';
let currentVillainPosition = 'SB';
let currentAction = 'or-fold';
let rangeData = {}; // Store all range data for different matchups
let lastEditedRangeKey = null; // Track the last edited range for paste functionality
let defaultRanges = {}; // Store default ranges from assets file

// Drag painting state
let isDragging = false;
let dragAction = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize mobile splash screen first
    initializeMobileSplashScreen();
    
    try {
        initializeApp();
        generateHandMatrix();
        setupEditRangesControls();
        
        // Load default ranges first, then initialize range data
        const defaultsLoaded = await loadDefaultRanges();
        initializeRangeData();
        
        // Initialize theme last
        initializeTheme();
        
        // Provide user feedback about default ranges loading
        if (defaultsLoaded) {
            console.log('✅ Application initialized with default preflop ranges');
        } else {
            console.warn('⚠️ Application initialized with empty ranges (default ranges failed to load)');
        }
        
        // Register service worker for PWA functionality
        registerServiceWorker();
        
    } catch (error) {
        console.error('Error during application initialization:', error);
        // Continue with initialization even if there's an error
        initializeRangeData();
        initializeTheme();
        
        // Still try to register service worker even if there's an error
        registerServiceWorker();
    }
});

function initializeMobileSplashScreen() {
    // Check if device is mobile (screen width < 768px) and splash screen exists
    const splashScreen = document.getElementById('pwa-splash-screen');
    const isMobile = window.innerWidth < 768;
    
    if (!splashScreen || !isMobile) {
        // Remove splash screen immediately if not mobile or doesn't exist
        if (splashScreen) {
            splashScreen.remove();
        }
        return;
    }
    
    // Set minimum display time and wait for page load
    const minDisplayTime = 1500; // 1.5 seconds minimum
    const maxDisplayTime = 2500; // 2.5 seconds maximum
    const startTime = Date.now();
    
    // Function to hide splash screen
    const hideSplashScreen = () => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        setTimeout(() => {
            splashScreen.classList.add('fade-out');
            
            // Remove element from DOM after fade animation
            setTimeout(() => {
                if (splashScreen && splashScreen.parentNode) {
                    splashScreen.remove();
                }
            }, 500); // Match CSS transition duration
        }, remainingTime);
    };
    
    // Hide splash screen when page is fully loaded or after max time
    if (document.readyState === 'complete') {
        hideSplashScreen();
    } else {
        window.addEventListener('load', hideSplashScreen);
        // Fallback: hide after max time regardless of load state
        setTimeout(hideSplashScreen, maxDisplayTime);
    }
}

function initializeApp() {
    // Navigation event listeners
    setupNavigation();
    
    // Show landing page by default
    showPage('landing-page');
}

function setupNavigation() {
    // Header navigation
    document.getElementById('home-btn').addEventListener('click', () => showPage('landing-page'));
    document.getElementById('edit-ranges-nav').addEventListener('click', () => showPage('edit-ranges-page'));
    document.getElementById('practice-nav').addEventListener('click', () => showPage('practice-page'));
    
    // Landing page buttons
    document.getElementById('landing-edit-ranges').addEventListener('click', () => showPage('edit-ranges-page'));
    document.getElementById('landing-practice').addEventListener('click', () => showPage('practice-page'));
    
    // Settings dropdown links
    document.getElementById('preferences-link').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('preferences-page');
    });
    document.getElementById('import-export-link').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('import-export-page');
    });
    
    // Profile dropdown links
    document.getElementById('account-link').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('account-page');
    });
    document.getElementById('statistics-link').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('statistics-page');
    });
    document.getElementById('logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        // Handle logout logic here
        alert('Logout functionality would be implemented here');
    });
    
    // Back buttons for all settings/profile pages
    document.getElementById('preferences-back').addEventListener('click', () => showPage('landing-page'));
    document.getElementById('import-export-back').addEventListener('click', () => showPage('landing-page'));
    document.getElementById('account-back').addEventListener('click', () => showPage('landing-page'));
    document.getElementById('statistics-back').addEventListener('click', () => showPage('landing-page'));
    
    // Import/Export functionality
    setupImportExportControls();
    
    // Setup mobile navigation (reuse desktop handlers)
    setupMobileNavigation();
    
    // Theme switch (will be initialized separately)
    // This ensures the theme switch works even if preferences page isn't visited first
}

function setupMobileNavigation() {
    // Wire mobile buttons to reuse exact same handlers as desktop dropdown items
    
    // Mobile Import/Export button -> reuse desktop import-export-link handler
    const mobileImportExportBtn = document.getElementById('mobile-import-export');
    const desktopImportExportLink = document.getElementById('import-export-link');
    
    if (mobileImportExportBtn && desktopImportExportLink) {
        mobileImportExportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Call the same function as desktop: showPage('import-export-page')
            showPage('import-export-page');
        });
    }
    
    // Mobile Statistics button -> reuse desktop statistics-link handler
    const mobileStatisticsBtn = document.getElementById('mobile-statistics');
    const desktopStatisticsLink = document.getElementById('statistics-link');
    
    if (mobileStatisticsBtn && desktopStatisticsLink) {
        mobileStatisticsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Call the same function as desktop: showPage('statistics-page')
            showPage('statistics-page');
        });
    }
    
    // Mobile Home button for Practice page only -> reuse desktop home-btn handler
    const mobileHomeBtn = document.getElementById('mobile-home-btn');
    
    if (mobileHomeBtn) {
        mobileHomeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Call the same function as desktop home button: showPage('landing-page')
            showPage('landing-page');
        });
    }
    
    // Setup bottom navigation bar
    setupBottomNavigation();
    
    // Setup top-right settings button
    setupMobileSettingsButton();
    
    // Setup mobile config panel reordering fallback
    setupMobileConfigPanelFallback();
    
    // Setup mobile dashboard functionality
    setupMobileDashboard();
}

// ==========================================
// MOBILE DASHBOARD FUNCTIONALITY
// ==========================================

/**
 * Session Management for Mobile Dashboard
 * Handles pre-made practice sessions with localStorage persistence
 */

// Session storage key
const SESSIONS_STORAGE_KEY = 'preflopBuilder_practiceSessions';
const LAST_CONFIG_STORAGE_KEY = 'preflopBuilder_lastPracticeConfig';
const MAX_SESSIONS = 6;

// Default sessions - 3 pre-filled sessions
const DEFAULT_SESSIONS = [
    {
        id: 'default-1',
        name: 'Quick Start',
        config: {
            heroPosition: 'Any',
            villainPosition: 'Any',
            gameType: 'full-mode',
            handStart: 'both',
            selectedHands: null, // null means all hands
            onlyPlayableHands: true
        }
    },
    {
        id: 'default-2',
        name: 'Button Play',
        config: {
            heroPosition: 'BU',
            villainPosition: 'Any',
            gameType: 'full-mode',
            handStart: 'both',
            selectedHands: null,
            onlyPlayableHands: true
        }
    },
    {
        id: 'default-3',
        name: 'Blinds Defense',
        config: {
            heroPosition: 'BB',
            villainPosition: 'Any',
            gameType: 'full-mode',
            handStart: 'late-vs-early',
            selectedHands: null,
            onlyPlayableHands: true
        }
    }
];

// Global variable to track session being deleted
let sessionToDelete = null;

/**
 * Initialize mobile dashboard on page load
 */
function setupMobileDashboard() {
    // Initialize sessions if not exists
    initializeSessions();
    
    // Render sessions grid
    renderSessionsGrid();
    
    // Setup Quick Practice button
    setupQuickPracticeButton();
    
    // Setup topbar settings button
    setupTopbarSettings();
    
    // Setup delete modal
    setupDeleteModal();
}

/**
 * Initialize sessions in localStorage with defaults if needed
 */
function initializeSessions() {
    const existingSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
    
    if (!existingSessions) {
        // First time - save default sessions
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(DEFAULT_SESSIONS));
    }
}

/**
 * Get all sessions from localStorage
 */
function getSessions() {
    const sessionsJson = localStorage.getItem(SESSIONS_STORAGE_KEY);
    return sessionsJson ? JSON.parse(sessionsJson) : DEFAULT_SESSIONS;
}

/**
 * Save sessions to localStorage
 */
function saveSessions(sessions) {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * Get last used practice configuration
 */
function getLastPracticeConfig() {
    const configJson = localStorage.getItem(LAST_CONFIG_STORAGE_KEY);
    if (configJson) {
        const config = JSON.parse(configJson);
        // Convert selectedHands array back to Set if it exists
        if (config.selectedHands && Array.isArray(config.selectedHands)) {
            config.selectedHands = new Set(config.selectedHands);
        }
        return config;
    }
    return null;
}

/**
 * Save last used practice configuration
 */
function saveLastPracticeConfig(config) {
    // Convert Set to Array for JSON serialization
    const configToSave = {...config};
    if (configToSave.selectedHands instanceof Set) {
        configToSave.selectedHands = Array.from(configToSave.selectedHands);
    }
    localStorage.setItem(LAST_CONFIG_STORAGE_KEY, JSON.stringify(configToSave));
}

/**
 * Render the sessions grid on the mobile dashboard
 */
function renderSessionsGrid() {
    const sessionsGrid = document.getElementById('sessions-grid');
    const sessionsMaxMessage = document.getElementById('sessions-max-message');
    
    if (!sessionsGrid) return;
    
    // Clear existing grid
    sessionsGrid.innerHTML = '';
    
    // Get current sessions
    const sessions = getSessions();
    
    // Render each session card
    sessions.forEach(session => {
        const sessionCard = createSessionCard(session);
        sessionsGrid.appendChild(sessionCard);
    });
    
    // Add "Add Session" card if less than max sessions
    if (sessions.length < MAX_SESSIONS) {
        const addSessionCard = createAddSessionCard();
        sessionsGrid.appendChild(addSessionCard);
        sessionsMaxMessage.style.display = 'none';
    } else {
        sessionsMaxMessage.style.display = 'block';
    }
}

/**
 * Create a session card element
 */
function createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'session-card';
    card.dataset.sessionId = session.id;
    
    card.innerHTML = `
        <h4 class="session-name">${session.name}</h4>
        <div class="session-actions">
            <button class="session-btn play-btn" data-action="play">Play</button>
            <div class="session-btn-row">
                <button class="session-btn edit-btn" data-action="edit">Edit</button>
                <button class="session-btn delete-btn" data-action="delete">Delete</button>
            </div>
        </div>
    `;
    
    // Add event listeners to action buttons
    const playBtn = card.querySelector('[data-action="play"]');
    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');
    
    playBtn.addEventListener('click', () => playSession(session));
    editBtn.addEventListener('click', () => editSession(session));
    deleteBtn.addEventListener('click', () => showDeleteConfirmation(session));
    
    return card;
}

/**
 * Create "Add Session" card
 */
function createAddSessionCard() {
    const card = document.createElement('div');
    card.className = 'session-card add-session-card';
    
    card.innerHTML = `
        <div class="add-session-icon">+</div>
        <div class="add-session-text">Add Session</div>
    `;
    
    card.addEventListener('click', addNewSession);
    
    return card;
}

/**
 * Play a session - start practice with session config
 * Goes directly to Practice without showing Configuration panel
 */
function playSession(session) {
    // Load session config into practiceConfig
    applySessionConfigToPracticeConfig(session.config);
    
    // Save as last used config
    saveLastPracticeConfig(practiceConfig);
    
    // Navigate to practice page
    showPage('practice-page');
    
    // Hide config panel immediately to skip configuration screen
    const configPanel = document.getElementById('practice-config-panel');
    if (configPanel) {
        configPanel.classList.add('hidden');
    }
    
    // Apply configuration and start practice immediately
    applyPracticeConfiguration();
}

/**
 * Edit a session - open practice config with session settings
 */
function editSession(session) {
    // Load session config into practiceConfig
    applySessionConfigToPracticeConfig(session.config);
    
    // Store which session is being edited
    window.currentEditingSession = session;
    
    // Navigate to practice page (config panel will show)
    showPage('practice-page');
    
    // Override the apply button to save back to session
    const applyBtn = document.getElementById('practice-apply');
    if (applyBtn) {
        // Remove existing listeners
        const newApplyBtn = applyBtn.cloneNode(true);
        applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
        
        // Add new listener for saving to session
        newApplyBtn.addEventListener('click', () => {
            // Validate that at least one hand is selected
            if (practiceConfig.selectedHands.size === 0) {
                alert('Please select at least one hand to practice with.');
                return;
            }
            
            // Update session config
            session.config = {...practiceConfig};
            // Convert Set to Array for storage
            if (session.config.selectedHands instanceof Set) {
                session.config.selectedHands = Array.from(session.config.selectedHands);
            }
            
            // Save sessions
            const sessions = getSessions();
            const sessionIndex = sessions.findIndex(s => s.id === session.id);
            if (sessionIndex !== -1) {
                sessions[sessionIndex] = session;
                saveSessions(sessions);
            }
            
            // Clear editing session
            window.currentEditingSession = null;
            
            // Start practice with updated config
            applyPracticeConfiguration();
        });
    }
}

/**
 * Show delete confirmation modal
 */
function showDeleteConfirmation(session) {
    sessionToDelete = session;
    const modal = document.getElementById('delete-modal-overlay');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Delete a session
 */
function deleteSession(session) {
    const sessions = getSessions();
    const filteredSessions = sessions.filter(s => s.id !== session.id);
    saveSessions(filteredSessions);
    renderSessionsGrid();
}

/**
 * Add a new session
 */
function addNewSession() {
    const sessions = getSessions();
    
    if (sessions.length >= MAX_SESSIONS) {
        alert('Maximum number of sessions reached!');
        return;
    }
    
    // Prompt for session name
    const sessionName = prompt('Enter session name:');
    
    if (!sessionName || sessionName.trim() === '') {
        return; // User cancelled or entered empty name
    }
    
    // Create new session with default config
    const newSession = {
        id: 'session-' + Date.now(),
        name: sessionName.trim(),
        config: {
            heroPosition: 'Any',
            villainPosition: 'Any',
            gameType: 'full-mode',
            handStart: 'both',
            selectedHands: null,
            onlyPlayableHands: true
        }
    };
    
    // Add to sessions
    sessions.push(newSession);
    saveSessions(sessions);
    
    // Re-render grid
    renderSessionsGrid();
}

/**
 * Apply session config to global practiceConfig
 */
function applySessionConfigToPracticeConfig(sessionConfig) {
    // Copy all config properties
    practiceConfig.heroPosition = sessionConfig.heroPosition;
    practiceConfig.villainPosition = sessionConfig.villainPosition;
    practiceConfig.gameType = sessionConfig.gameType;
    practiceConfig.handStart = sessionConfig.handStart;
    practiceConfig.onlyPlayableHands = sessionConfig.onlyPlayableHands;
    
    // Handle selectedHands - if null, select all hands
    if (sessionConfig.selectedHands === null || !sessionConfig.selectedHands) {
        // Select all hands
        const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
        practiceConfig.selectedHands = new Set();
        
        for (let row = 0; row < 13; row++) {
            for (let col = 0; col < 13; col++) {
                let handText;
                if (row === col) {
                    handText = ranks[row] + ranks[col];
                } else if (col > row) {
                    handText = ranks[col] + ranks[row] + 's';
                } else {
                    handText = ranks[col] + ranks[row] + 'o';
                }
                practiceConfig.selectedHands.add(handText);
            }
        }
    } else {
        // Convert array back to Set
        if (Array.isArray(sessionConfig.selectedHands)) {
            practiceConfig.selectedHands = new Set(sessionConfig.selectedHands);
        } else {
            practiceConfig.selectedHands = sessionConfig.selectedHands;
        }
    }
    
    // Update UI to reflect loaded config
    updateConfigUIFromPracticeConfig();
}

/**
 * Update configuration UI to reflect current practiceConfig
 */
function updateConfigUIFromPracticeConfig() {
    // Update hero position buttons
    document.querySelectorAll('#config-hero-positions .config-position-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.position === practiceConfig.heroPosition);
    });
    
    // Update villain position buttons
    document.querySelectorAll('#config-villain-positions .config-position-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.position === practiceConfig.villainPosition);
    });
    
    // Update game type buttons
    document.querySelectorAll('#game-type-buttons .config-option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === practiceConfig.gameType);
    });
    
    // Update hand start buttons
    document.querySelectorAll('#hand-start-buttons .config-option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === practiceConfig.handStart);
    });
    
    // Update only playable hands toggle
    const onlyPlayableToggle = document.getElementById('only-playable-hands');
    if (onlyPlayableToggle) {
        onlyPlayableToggle.checked = practiceConfig.onlyPlayableHands;
    }
    
    // Update hand matrix selection
    document.querySelectorAll('.config-hand-cell').forEach(cell => {
        if (practiceConfig.selectedHands.has(cell.dataset.hand)) {
            cell.classList.add('selected');
        } else {
            cell.classList.remove('selected');
        }
    });
}

/**
 * Setup Quick Practice button
 * Starts practice immediately with last used settings or default settings
 * Goes directly to Practice without showing Configuration panel
 */
function setupQuickPracticeButton() {
    const quickPracticeBtn = document.getElementById('quick-practice-btn');
    
    if (!quickPracticeBtn) return;
    
    quickPracticeBtn.addEventListener('click', () => {
        // Get last used config or use default
        const lastConfig = getLastPracticeConfig();
        
        if (lastConfig) {
            // Use last config
            practiceConfig.heroPosition = lastConfig.heroPosition;
            practiceConfig.villainPosition = lastConfig.villainPosition;
            practiceConfig.gameType = lastConfig.gameType;
            practiceConfig.handStart = lastConfig.handStart;
            practiceConfig.onlyPlayableHands = lastConfig.onlyPlayableHands;
            
            // Handle selectedHands
            if (lastConfig.selectedHands && lastConfig.selectedHands.size > 0) {
                practiceConfig.selectedHands = lastConfig.selectedHands;
            } else {
                // Select all hands as fallback
                selectAllHandsForPractice();
            }
        } else {
            // Use default config (Any vs Any, full mode, both, all hands)
            practiceConfig.heroPosition = 'Any';
            practiceConfig.villainPosition = 'Any';
            practiceConfig.gameType = 'full-mode';
            practiceConfig.handStart = 'both';
            practiceConfig.onlyPlayableHands = false;
            selectAllHandsForPractice();
        }
        
        // Save current config as last used
        saveLastPracticeConfig(practiceConfig);
        
        // Navigate to practice page
        showPage('practice-page');
        
        // Hide config panel immediately to skip configuration screen
        const configPanel = document.getElementById('practice-config-panel');
        if (configPanel) {
            configPanel.classList.add('hidden');
        }
        
        // Apply configuration and start immediately
        applyPracticeConfiguration();
    });
}

/**
 * Helper function to select all hands
 */
function selectAllHandsForPractice() {
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    practiceConfig.selectedHands = new Set();
    
    for (let row = 0; row < 13; row++) {
        for (let col = 0; col < 13; col++) {
            let handText;
            if (row === col) {
                handText = ranks[row] + ranks[col];
            } else if (col > row) {
                handText = ranks[col] + ranks[row] + 's';
            } else {
                handText = ranks[col] + ranks[row] + 'o';
            }
            practiceConfig.selectedHands.add(handText);
        }
    }
}

/**
 * Setup floating settings button to show settings/preferences page
 */
function setupTopbarSettings() {
    const floatingSettingsBtn = document.getElementById('mobile-floating-settings');
    
    if (!floatingSettingsBtn) return;
    
    // Navigate to preferences page when clicked
    floatingSettingsBtn.addEventListener('click', () => {
        showPage('preferences-page');
    });
}

/**
 * Setup delete confirmation modal
 */
function setupDeleteModal() {
    const modal = document.getElementById('delete-modal-overlay');
    const cancelBtn = document.getElementById('delete-cancel-btn');
    const confirmBtn = document.getElementById('delete-confirm-btn');
    
    if (!modal || !cancelBtn || !confirmBtn) return;
    
    // Cancel button - close modal
    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        sessionToDelete = null;
    });
    
    // Confirm button - delete session and close modal
    confirmBtn.addEventListener('click', () => {
        if (sessionToDelete) {
            deleteSession(sessionToDelete);
            sessionToDelete = null;
        }
        modal.classList.remove('active');
    });
    
    // Click outside modal to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            sessionToDelete = null;
        }
    });
}

/**
 * Override applyPracticeConfiguration to save last config
 * This is called when the original practice config "Apply" button is clicked
 */
const originalApplyPracticeConfiguration = window.applyPracticeConfiguration;
if (originalApplyPracticeConfiguration) {
    window.applyPracticeConfiguration = function() {
        // Save current config as last used
        saveLastPracticeConfig(practiceConfig);
        
        // Call original function
        originalApplyPracticeConfiguration.call(this);
    };
}

// ==========================================
// BOTTOM NAVIGATION BAR
// ==========================================

function setupBottomNavigation() {
    // Get all bottom nav items
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    
    if (!bottomNavItems.length) return;
    
    // Add click event listeners to each nav item
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');
            
            if (!targetPage) return;
            
            // Navigate to the target page
            showPage(targetPage);
            
            // Update active state in bottom nav
            updateBottomNavActiveState(targetPage);
        });
    });
}

/**
 * Updates the active state of bottom navigation items
 * @param {string} pageId - The ID of the currently active page
 */
function updateBottomNavActiveState(pageId) {
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    
    bottomNavItems.forEach(item => {
        const itemPage = item.getAttribute('data-page');
        
        // Remove active class from all items
        item.classList.remove('active');
        
        // Add active class to the current page's nav item
        if (itemPage === pageId) {
            item.classList.add('active');
        }
    });
}

// ==========================================
// TOP-RIGHT SETTINGS BUTTON
// ==========================================

function setupMobileSettingsButton() {
    const settingsBtn = document.getElementById('mobile-settings-btn');
    
    if (!settingsBtn) return;
    
    // Add click event listener to settings button
    settingsBtn.addEventListener('click', () => {
        // Open the Preferences page
        showPage('preferences-page');
    });
}

function setupMobileConfigPanelFallback() {
    // Mobile-only fallback for config panel ordering
    // This ensures proper DOM order for tab navigation if CSS display: contents has issues
    
    function reorderConfigPanelForMobile() {
        // Only run on mobile screens
        if (window.innerWidth > 430) return;
        
        const configLayout = document.querySelector('.config-layout');
        const configActions = document.querySelector('.config-actions');
        
        if (!configLayout || !configActions) return;
        
        // If actions are not the last child, move them to the end
        const lastChild = configLayout.lastElementChild;
        if (lastChild !== configActions) {
            // Move actions to the end while preserving event handlers
            configLayout.appendChild(configActions);
        }
    }
    
    // Run on panel open and window resize
    const configPanel = document.getElementById('practice-config-panel');
    if (configPanel) {
        // Use mutation observer to detect when panel becomes visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isVisible = !configPanel.classList.contains('hidden');
                    if (isVisible) {
                        setTimeout(reorderConfigPanelForMobile, 0); // Run after CSS is applied
                    }
                }
            });
        });
        
        observer.observe(configPanel, { attributes: true });
    }
    
    // Also run on window resize
    window.addEventListener('resize', reorderConfigPanelForMobile);
    
    // Run once on initial load
    reorderConfigPanelForMobile();
}

let currentPageId = 'landing-page';
let isTransitioning = false;

function showPage(pageId) {
    // Add a class to the body for page-specific styling
    document.body.classList.remove('on-landing-page', 'on-edit-page', 'on-practice-page');
    if (pageId === 'landing-page') {
        document.body.classList.add('on-landing-page');
    } else if (pageId === 'edit-ranges-page') {
        document.body.classList.add('on-edit-page');
    } else if (pageId === 'practice-page') {
        document.body.classList.add('on-practice-page');
    }

    // Update header navigation active states
    const editRangesNav = document.getElementById('edit-ranges-nav');
    const practiceNav = document.getElementById('practice-nav');
    
    // Remove active class from both buttons
    editRangesNav.classList.remove('active');
    practiceNav.classList.remove('active');
    
    // Add active class to the appropriate button
    if (pageId === 'edit-ranges-page') {
        editRangesNav.classList.add('active');
    } else if (pageId === 'practice-page') {
        practiceNav.classList.add('active');
    }

    if (isTransitioning || pageId === currentPageId) return;
    
    isTransitioning = true;
    const currentPage = document.getElementById(currentPageId);
    const targetPage = document.getElementById(pageId);
    
    if (!targetPage) {
        isTransitioning = false;
        return;
    }
    
    // Prepare target page
    targetPage.classList.remove('active');
    targetPage.classList.add('entering');
    targetPage.style.display = 'block';
    
    // Force reflow to ensure styles are applied
    targetPage.offsetHeight;
    
    // Start cross-fade transition
    if (currentPage && currentPage.classList.contains('active')) {
        currentPage.classList.add('exiting');
    }
    
    // Complete transition
    setTimeout(() => {
        // Hide old page
        if (currentPage) {
            currentPage.classList.remove('active', 'exiting');
            currentPage.style.display = 'none';
        }
        
        // Show new page
        targetPage.classList.remove('entering');
        targetPage.classList.add('active');
        
        // Initialize page-specific functionality
        if (pageId === 'edit-ranges-page') {
            updateActionButtons();
            updateMatchupTitle();
            loadCurrentRange();
        } else if (pageId === 'practice-page') {
            initializePracticePage();
        } else if (pageId === 'statistics-page') {
            loadAndDisplayStatistics();
        } else if (pageId === 'import-export-page') {
            updateRangeDataStatus();
        }
        
        // Update header navigation
        updateHeaderNavigation(pageId);
        
        // Update bottom navigation active state (mobile)
        updateBottomNavActiveState(pageId);
        
        // Update current page tracking
        currentPageId = pageId;
        
        // Reset transition state
        setTimeout(() => {
            isTransitioning = false;
        }, 50);
        
    }, 300); // Match CSS transition duration
}

// ==========================================
// THEME MANAGEMENT
// ==========================================

function initializeTheme() {
    // Load saved theme or default to dark
    const savedTheme = localStorage.getItem('preflop-builder-theme') || 'dark';
    setTheme(savedTheme);
    
    // Setup theme switch event listener
    const themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
        themeSwitch.addEventListener('click', toggleTheme);
        updateThemeSwitchUI(savedTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    
    // Save to localStorage
    localStorage.setItem('preflop-builder-theme', theme);
    
    // Update switch UI
    updateThemeSwitchUI(theme);
    
    // Add smooth transition class to body for theme change
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 300);
}

function updateThemeSwitchUI(theme) {
    const themeSwitch = document.getElementById('theme-switch');
    const themeLabels = document.querySelectorAll('.theme-label');
    
    if (!themeSwitch) return;
    
    // Update switch appearance
    if (theme === 'light') {
        themeSwitch.classList.add('light');
    } else {
        themeSwitch.classList.remove('light');
    }
    
    // Update label states
    themeLabels.forEach((label, index) => {
        const isActive = (theme === 'dark' && index === 0) || (theme === 'light' && index === 1);
        label.classList.toggle('active', isActive);
    });
}

function updateHeaderNavigation(currentPageId) {
    const editRangesNav = document.getElementById('edit-ranges-nav');
    const practiceNav = document.getElementById('practice-nav');
    
    // Show appropriate buttons based on current page
    // This is now handled by CSS using body classes
    /*
    switch(currentPageId) {
        case 'landing-page':
            // Hide navigation buttons on landing page
            editRangesNav.style.display = 'none';
            practiceNav.style.display = 'none';
            break;
        case 'edit-ranges-page':
            // Show only practice button when in edit ranges
            editRangesNav.style.display = 'none';
            practiceNav.style.display = 'block';
            break;
        case 'practice-page':
            // Show only edit ranges button when in practice
            editRangesNav.style.display = 'block';
            practiceNav.style.display = 'none';
            break;
        default:
            // For settings/profile pages, show both buttons
            editRangesNav.style.display = 'block';
            practiceNav.style.display = 'block';
            break;
    }
    */
}

// ==========================================
// EDIT RANGES CONTROLS SETUP
// ==========================================

function setupEditRangesControls() {
    // Position button event listeners
    setupPositionButtons();
    
    // Grid control buttons
    setupGridControls();
}

function setupPositionButtons() {
    // Hero position buttons
    const heroButtons = document.querySelectorAll('#hero-positions .position-btn');
    heroButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                selectHeroPosition(btn.dataset.position);
            }
        });
    });
    
    // Villain position buttons
    const villainButtons = document.querySelectorAll('#villain-positions .position-btn');
    villainButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                selectVillainPosition(btn.dataset.position);
            }
        });
    });
}

function selectHeroPosition(position) {
    // Save current range before switching
    saveCurrentRangeToMemory();
    
    // Update active hero button
    document.querySelectorAll('#hero-positions .position-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`#hero-positions .position-btn[data-position="${position}"]`).classList.add('active');
    
    currentHeroPosition = position;
    
    // Update disabled states and villain selection if needed
    updatePositionButtons();
    updateActionButtons();
    updateMatchupTitle();
    loadCurrentRange();
}

function selectVillainPosition(position) {
    // Save current range before switching
    saveCurrentRangeToMemory();
    
    // Update active villain button
    document.querySelectorAll('#villain-positions .position-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`#villain-positions .position-btn[data-position="${position}"]`).classList.add('active');
    
    currentVillainPosition = position;
    
    // Update disabled states
    updatePositionButtons();
    updateActionButtons();
    updateMatchupTitle();
    loadCurrentRange();
}

function updatePositionButtons() {
    // Enable all buttons first
    document.querySelectorAll('.position-btn').forEach(btn => {
        btn.disabled = false;
    });
    
    // Disable hero position in villain buttons
    const villainHeroBtn = document.querySelector(`#villain-positions .position-btn[data-position="${currentHeroPosition}"]`);
    if (villainHeroBtn) {
        villainHeroBtn.disabled = true;
    }
    
    // Disable villain position in hero buttons
    const heroVillainBtn = document.querySelector(`#hero-positions .position-btn[data-position="${currentVillainPosition}"]`);
    if (heroVillainBtn) {
        heroVillainBtn.disabled = true;
    }
}

// ==========================================
// DYNAMIC ACTION BUTTONS
// ==========================================

function updateActionButtons() {
    const actionContainer = document.getElementById('action-buttons');
    if (!actionContainer) return;
    
    // Clear existing buttons
    actionContainer.innerHTML = '';
    
    // Determine actions based on position matchup
    const actions = getActionsForMatchup(currentHeroPosition, currentVillainPosition);
    
    // Create action buttons
    actions.forEach((action, index) => {
        const btn = document.createElement('button');
        btn.className = `action-btn ${action.class}`;
        btn.textContent = action.label;
        btn.dataset.action = action.class;
        
        // Set first action as active by default
        if (index === 0) {
            btn.classList.add('active');
            currentAction = action.class;
        }
        
        btn.addEventListener('click', () => {
            selectAction(action.class);
        });
        
        actionContainer.appendChild(btn);
    });
}

function getActionsForMatchup(hero, villain) {
    const positions = ['MP', 'CO', 'BU', 'SB', 'BB'];
    const heroIndex = positions.indexOf(hero);
    const villainIndex = positions.indexOf(villain);
    
    // Always start with Fold as the first action (to clear painted cells)
    const actions = [{ label: 'FOLD', class: 'fold' }];
    
    // BB has special actions - only 3BET and CALL actions
    if (hero === 'BB') {
        actions.push(
            { label: '3BET → FOLD', class: 'three-bet-fold' },
            { label: '3BET → CALL', class: 'three-bet-call' },
            { label: '3BET → PUSH', class: 'three-bet-push' },
            { label: 'CALL', class: 'call' }
        );
        return actions;
    }
    
    // Early to Later positions (e.g., MP vs BU, BU vs SB)
    if (heroIndex < villainIndex || (hero === 'BU' && villain === 'SB')) {
        actions.push(
            { label: 'OR/FOLD', class: 'or-fold' },
            { label: 'OR/CALL', class: 'or-call' },
            { label: 'OR/4BET/FOLD', class: 'or-4bet-fold' },
            { label: 'OR/4BET/CALL', class: 'or-4bet-call' }
        );
        return actions;
    }
    
    // Later to Early positions (e.g., SB vs MP, BB vs BU)
    actions.push(
        { label: '3BET → FOLD', class: 'three-bet-fold' },
        { label: '3BET → CALL', class: 'three-bet-call' },
        { label: '3BET → PUSH', class: 'three-bet-push' }
    );
    return actions;
}

function selectAction(actionClass) {
    // Update active action button
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.action-btn[data-action="${actionClass}"]`).classList.add('active');
    
    currentAction = actionClass;
}

// ==========================================
// HAND MATRIX GENERATION AND MANAGEMENT
// ==========================================

function generateHandMatrix() {
    const matrix = document.getElementById('hand-matrix');
    if (!matrix) return;
    
    // Clear existing matrix
    matrix.innerHTML = '';
    
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    // Generate 13x13 grid
    for (let row = 0; row < 13; row++) {
        for (let col = 0; col < 13; col++) {
            const cell = document.createElement('button');
            cell.className = 'hand-cell';
            
            // Determine hand representation
            let handText = '';
            if (row === col) {
                // Pocket pairs (diagonal)
                handText = ranks[row] + ranks[col];
            } else if (row < col) {
                // Suited hands (upper triangle)
                handText = ranks[row] + ranks[col] + 's';
            } else {
                // Offsuit hands (lower triangle)
                handText = ranks[col] + ranks[row] + 'o';
            }
            
            cell.textContent = handText;
            cell.dataset.hand = handText;
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // Add mouse events for painting and drag painting
            cell.addEventListener('mousedown', function(e) {
                e.preventDefault();
                startDragPainting(this);
            });
            
            cell.addEventListener('mouseenter', function() {
                if (isDragging) {
                    paintCell(this, dragAction);
                }
            });
            
            cell.addEventListener('mouseup', function() {
                stopDragPainting();
            });
            
            // Add click event for single cell painting
            cell.addEventListener('click', function() {
                paintCell(this);
            });
            
            matrix.appendChild(cell);
        }
    }
}

function paintCell(cell, action = null) {
    // Remove all action classes
    const actionClasses = ['or-fold', 'or-call', 'or-4bet-fold', 'or-4bet-call', 
                          'three-bet-fold', 'three-bet-call', 'three-bet-push', 'call'];
    actionClasses.forEach(cls => cell.classList.remove(cls));
    
    // Add specified action or current action class
    const actionToApply = action || currentAction;
    
    // If action is 'fold', don't add any class (this clears the cell to original background)
    if (actionToApply && actionToApply !== 'fold') {
        cell.classList.add(actionToApply);
    }
    
    // Save to range data (but not during drag to avoid performance issues)
    if (!isDragging) {
        saveCurrentRangeToMemory();
    }
}

// ==========================================
// DRAG PAINTING FUNCTIONALITY
// ==========================================

function startDragPainting(cell) {
    isDragging = true;
    dragAction = currentAction;
    
    // Paint the initial cell
    paintCell(cell, dragAction);
    
    // Add global mouse up listener to stop dragging
    document.addEventListener('mouseup', stopDragPainting);
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
}

function stopDragPainting() {
    if (isDragging) {
        isDragging = false;
        dragAction = null;
        
        // Remove global mouse up listener
        document.removeEventListener('mouseup', stopDragPainting);
        
        // Re-enable text selection
        document.body.style.userSelect = '';
        
        // Save the final state after drag is complete
        saveCurrentRangeToMemory();
    }
}

// ==========================================
// RANGE DATA MANAGEMENT
// ==========================================

function initializeRangeData() {
    const positions = ['MP', 'CO', 'BU', 'SB', 'BB'];
    
    // Try to load from localStorage first
    loadRangeDataFromStorage();
    
    // If no data was loaded from localStorage, populate with default ranges
    if (Object.keys(rangeData).length === 0) {
        console.log('No saved range data found. Loading default ranges...');
        
        // Check if default ranges are available
        if (Object.keys(defaultRanges).length > 0) {
            // Copy default ranges to rangeData
            rangeData = { ...defaultRanges };
            console.log('Default ranges loaded into practice data');
            
            // Optionally save the default ranges to localStorage for future use
            saveRangeDataToStorage();
            console.log('Default ranges saved to localStorage for future sessions');
            
            // Update status indicator if import-export page is active
            if (currentPageId === 'import-export-page') {
                updateRangeDataStatus();
            }
        } else {
            // If default ranges failed to load, create empty range data for all valid matchups
            console.log('No default ranges available. Creating empty range data...');
            positions.forEach(hero => {
                positions.forEach(villain => {
                    if (hero !== villain) {
                        const key = `${hero}_vs_${villain}`;
                        rangeData[key] = {};
                    }
                });
            });
        }
    } else {
        console.log('Existing range data loaded from localStorage');
    }
}

function loadRangeDataFromStorage() {
    try {
        const savedData = localStorage.getItem('preflop-builder-ranges');
        if (savedData) {
            rangeData = JSON.parse(savedData);
            console.log('Range data loaded from localStorage');
        }
    } catch (error) {
        console.error('Error loading range data from localStorage:', error);
        rangeData = {};
    }
}

function saveRangeDataToStorage() {
    try {
        localStorage.setItem('preflop-builder-ranges', JSON.stringify(rangeData));
        console.log('Range data saved to localStorage');
    } catch (error) {
        console.error('Error saving range data to localStorage:', error);
    }
}

async function loadDefaultRanges() {
    try {
        const response = await fetch(DEFAULT_RANGES_PATH);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Extract ranges from the file (handle both new format with metadata and legacy format)
        if (data.ranges) {
            defaultRanges = data.ranges;
        } else {
            defaultRanges = data;
        }
        
        console.log('Default ranges loaded successfully from:', DEFAULT_RANGES_PATH);
        console.log('Available default range keys:', Object.keys(defaultRanges));
        return true; // Return success status
    } catch (error) {
        console.error('Error loading default ranges from:', DEFAULT_RANGES_PATH, error);
        // Initialize empty defaults if file can't be loaded
        defaultRanges = {};
        return false; // Return failure status
    }
}

function getCurrentRangeKey() {
    return `${currentHeroPosition}_vs_${currentVillainPosition}`;
}

function saveCurrentRangeToMemory() {
    const key = getCurrentRangeKey();
    const cells = document.querySelectorAll('.hand-cell');
    const range = {};
    
    cells.forEach(cell => {
        const hand = cell.dataset.hand;
        const actionClasses = ['or-fold', 'or-call', 'or-4bet-fold', 'or-4bet-call', 
                              'three-bet-fold', 'three-bet-call', 'three-bet-push', 'call'];
        
        let action = null;
        for (let cls of actionClasses) {
            if (cell.classList.contains(cls)) {
                action = cls;
                break;
            }
        }
        
        if (action) {
            range[hand] = action;
        }
    });
    
    rangeData[key] = range;
    
    // Track this as the last edited range
    lastEditedRangeKey = key;
    
    // Auto-save to localStorage
    saveRangeDataToStorage();
}

function loadCurrentRange() {
    const key = getCurrentRangeKey();
    const range = rangeData[key] || {};
    
    // Clear all cells first
    const cells = document.querySelectorAll('.hand-cell');
    const actionClasses = ['or-fold', 'or-call', 'or-4bet-fold', 'or-4bet-call', 
                          'three-bet-fold', 'three-bet-call', 'three-bet-push', 'call'];
    
    cells.forEach(cell => {
        actionClasses.forEach(cls => cell.classList.remove(cls));
        
        const hand = cell.dataset.hand;
        if (range[hand]) {
            cell.classList.add(range[hand]);
        }
    });
}

function updateMatchupTitle() {
    const titleElement = document.getElementById('matchup-title');
    if (titleElement) {
        titleElement.textContent = `${currentHeroPosition} VS ${currentVillainPosition}`;
    }
}

// ==========================================
// GRID CONTROLS
// ==========================================

function setupGridControls() {
    const cleanBtn = document.querySelector('.clean-btn');
    const resetBtn = document.querySelector('.reset-btn');
    const saveBtn = document.querySelector('.save-btn');
    const pasteBtn = document.querySelector('.paste-btn');
    const resetDefaultsBtn = document.querySelector('.reset-defaults-btn');
    
    if (cleanBtn) {
        cleanBtn.addEventListener('click', cleanCurrentRange);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetCurrentRange);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCurrentRange);
    }
    
    if (pasteBtn) {
        pasteBtn.addEventListener('click', pasteLastTable);
    }
    
    if (resetDefaultsBtn) {
        resetDefaultsBtn.addEventListener('click', resetAllTablesToDefaults);
    }
}

function cleanCurrentRange() {
    // Remove all action classes from cells
    const cells = document.querySelectorAll('.hand-cell');
    const actionClasses = ['or-fold', 'or-call', 'or-4bet-fold', 'or-4bet-call', 
                          'three-bet-fold', 'three-bet-call', 'three-bet-push', 'call'];
    
    cells.forEach(cell => {
        actionClasses.forEach(cls => cell.classList.remove(cls));
    });
    
    // Clear from memory
    const key = getCurrentRangeKey();
    rangeData[key] = {};
    
    console.log('Range cleaned');
}

function resetCurrentRange() {
    const currentKey = getCurrentRangeKey();
    
    console.log(`Attempting to reset range for: ${currentKey}`);
    console.log('Default ranges available:', Object.keys(defaultRanges));
    console.log('Looking for default range:', defaultRanges[currentKey]);
    
    const defaultRange = defaultRanges[currentKey];
    
    if (!defaultRange || Object.keys(defaultRange).length === 0) {
        console.log(`No default range found for ${currentKey}, cleaning instead`);
        cleanCurrentRange();
        
        // Visual feedback for no default
        const resetBtn = document.querySelector('.reset-btn');
        const originalText = resetBtn.textContent;
        resetBtn.textContent = 'NO DEFAULT';
        resetBtn.style.background = '#ff9800';
        
        setTimeout(() => {
            resetBtn.textContent = originalText;
            resetBtn.style.background = '';
        }, 1500);
        return;
    }
    
    // Clear current range first
    const cells = document.querySelectorAll('.hand-cell');
    const actionClasses = ['or-fold', 'or-call', 'or-4bet-fold', 'or-4bet-call', 
                          'three-bet-fold', 'three-bet-call', 'three-bet-push', 'call'];
    
    cells.forEach(cell => {
        actionClasses.forEach(cls => cell.classList.remove(cls));
    });
    
    // Apply default range
    let appliedCount = 0;
    cells.forEach(cell => {
        const hand = cell.dataset.hand;
        if (defaultRange[hand]) {
            cell.classList.add(defaultRange[hand]);
            appliedCount++;
        }
    });
    
    console.log(`Applied ${appliedCount} default actions for ${currentKey}`);
    
    // Save the reset range to memory and localStorage
    rangeData[currentKey] = { ...defaultRange };
    saveRangeDataToStorage();
    
    console.log(`Range reset to default for ${currentKey}`);
    
    // Visual feedback
    const resetBtn = document.querySelector('.reset-btn');
    const originalText = resetBtn.textContent;
    resetBtn.textContent = 'RESET!';
    resetBtn.style.background = '#4caf50';
    
    setTimeout(() => {
        resetBtn.textContent = originalText;
        resetBtn.style.background = '';
    }, 1500);
}

function saveCurrentRange() {
    // Save current range to memory and localStorage
    saveCurrentRangeToMemory();
    
    const key = getCurrentRangeKey();
    const range = rangeData[key];
    
    console.log(`Saving range for ${key}:`, range);
    
    // Visual feedback
    const saveBtn = document.querySelector('.save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'SAVED!';
    saveBtn.style.background = '#218838';
    
    setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '';
    }, 1500);
}

function pasteLastTable() {
    if (!lastEditedRangeKey || !rangeData[lastEditedRangeKey]) {
        console.log('No previous range to paste');
        
        // Visual feedback
        const pasteBtn = document.querySelector('.paste-btn');
        const originalText = pasteBtn.textContent;
        pasteBtn.textContent = 'NO DATA';
        pasteBtn.style.background = '#f44336';
        
        setTimeout(() => {
            pasteBtn.textContent = originalText;
            pasteBtn.style.background = '';
        }, 1500);
        return;
    }
    
    const currentKey = getCurrentRangeKey();
    
    // Don't paste to the same range
    if (currentKey === lastEditedRangeKey) {
        console.log('Cannot paste range to itself');
        
        // Visual feedback
        const pasteBtn = document.querySelector('.paste-btn');
        const originalText = pasteBtn.textContent;
        pasteBtn.textContent = 'SAME RANGE';
        pasteBtn.style.background = '#ff9800';
        
        setTimeout(() => {
            pasteBtn.textContent = originalText;
            pasteBtn.style.background = '';
        }, 1500);
        return;
    }
    
    // Copy the last edited range to current range
    rangeData[currentKey] = { ...rangeData[lastEditedRangeKey] };
    
    // Load the pasted range into the UI
    loadCurrentRange();
    
    console.log(`Pasted range from ${lastEditedRangeKey} to ${currentKey}`);
    
    // Visual feedback
    const pasteBtn = document.querySelector('.paste-btn');
    const originalText = pasteBtn.textContent;
    pasteBtn.textContent = 'PASTED!';
    pasteBtn.style.background = '#4caf50';
    
    setTimeout(() => {
        pasteBtn.textContent = originalText;
        pasteBtn.style.background = '';
    }, 1500);
    
    // Save to localStorage
    saveRangeDataToStorage();
}

function resetAllTablesToDefaults() {
    // Check if default ranges are available
    if (!defaultRanges || Object.keys(defaultRanges).length === 0) {
        console.warn('No default ranges available to reset to');
        
        // Visual feedback for no defaults
        const resetBtn = document.querySelector('.reset-defaults-btn');
        const originalText = resetBtn.textContent;
        resetBtn.textContent = 'NO DEFAULTS';
        resetBtn.style.background = '#ff9800';
        
        setTimeout(() => {
            resetBtn.textContent = originalText;
            resetBtn.style.background = '';
        }, 2000);
        return;
    }
    
    // Confirm action since this affects all tables
    if (!confirm('This will reset ALL position matchups to default ranges. Are you sure?')) {
        return;
    }
    
    console.log('Resetting all tables to default ranges...');
    
    // Copy all default ranges to rangeData
    rangeData = { ...defaultRanges };
    
    // Re-render the current table to show the changes immediately
    loadCurrentRange();
    
    // Save the reset data to localStorage
    saveRangeDataToStorage();
    
    console.log(`Reset ${Object.keys(defaultRanges).length} position matchups to defaults`);
    
    // Visual feedback
    const resetBtn = document.querySelector('.reset-defaults-btn');
    const originalText = resetBtn.textContent;
    resetBtn.textContent = 'RESET COMPLETE!';
    resetBtn.style.background = '#4caf50';
    
    setTimeout(() => {
        resetBtn.textContent = originalText;
        resetBtn.style.background = '';
    }, 2000);
    
    // Update status indicator if import-export page is active
    if (currentPageId === 'import-export-page') {
        updateRangeDataStatus();
    }
}

// ==========================================
// RANGE CONTROLS (Edit Ranges)
// ==========================================

// Add event listeners for range control buttons
document.addEventListener('DOMContentLoaded', function() {
    const resetBtn = document.querySelector('.reset-btn');
    const clearBtn = document.querySelector('.clear-btn');
    const saveBtn = document.querySelector('.save-btn');
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetRange);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearRange);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveRange);
    }
});

function resetRange() {
    const cells = document.querySelectorAll('.hand-cell');
    cells.forEach(cell => {
        // Remove action classes
        cell.classList.remove('fold', 'call', 'raise', 'three-bet');
    });
    console.log('Range reset');
}

function clearRange() {
    resetRange(); // Same functionality for now
    console.log('Range cleared');
}

function saveRange() {
    const heroPosition = document.getElementById('hero-position')?.value || 'BTN';
    const villainPosition = document.getElementById('villain-position')?.value || 'BB';
    
    const range = {};
    const cells = document.querySelectorAll('.hand-cell');
    
    cells.forEach(cell => {
        const hand = cell.dataset.hand;
        let action = 'fold'; // default
        
        if (cell.classList.contains('call')) action = 'call';
        else if (cell.classList.contains('raise')) action = 'raise';
        else if (cell.classList.contains('three-bet')) action = 'three-bet';
        
        range[hand] = action;
    });
    
    // For now, just log the range (in a real app, this would save to localStorage or server)
    console.log(`Saving range for ${heroPosition} vs ${villainPosition}:`, range);
    
    // Visual feedback
    const saveBtn = document.querySelector('.save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saved!';
    saveBtn.style.background = '#4caf50';
    
    setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '';
    }, 1500);
}

// ==========================================
// PRACTICE MODE FUNCTIONALITY
// ==========================================

// Practice mode variables
let practiceConfig = {
    heroPosition: 'Any',
    villainPosition: 'Any',
    gameType: 'full-mode',
    handStart: 'both',
    selectedHands: new Set(),
    onlyPlayableHands: false
};

let practiceState = {
    currentHeroPosition: 'BU',
    currentVillainPosition: 'SB',
    currentHand: null,
    currentHandIndex: 0,
    handHistory: [],
    availableHands: [],
    historyViewStart: 0,  // Starting index for the visible 5 hands
    maxHandsPerSession: 100
};

let handsPlayed = 0;
let correctDecisions = 0;
let sessionStartTime = null;
let currentStreak = 0;
let bestStreak = 0;

// Initialize practice mode when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupPracticeMode();
});

function setupPracticeMode() {
    // Initialize practice configuration
    initializePracticeConfig();
    
    // Set up practice action buttons with dynamic actions
    updatePracticeActionButtons();
    
    // Add event listeners to practice action buttons
    const practiceButtons = document.querySelectorAll('.practice-action-btn');
    practiceButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const actionClass = Array.from(this.classList).find(cls => cls !== 'practice-action-btn');
            handlePracticeAction(actionClass);
        });
    });
    
    // Setup configuration panel event listeners
    setupConfigurationPanel();
    
    // Setup history tracker event listeners
    setupHistoryTracker();
    
    // Setup session management
    setupSessionManagement();
}

function initializePracticeConfig() {
    // Initialize all hands as selected by default
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    for (let row = 0; row < 13; row++) {
        for (let col = 0; col < 13; col++) {
            let handText = '';
            if (row === col) {
                handText = ranks[row] + ranks[col];
            } else if (row < col) {
                handText = ranks[row] + ranks[col] + 's';
            } else {
                handText = ranks[col] + ranks[row] + 'o';
            }
            practiceConfig.selectedHands.add(handText);
        }
    }
    
    // Generate config hand matrix
    generateConfigHandMatrix();
}

function setupConfigurationPanel() {
    // Position button event listeners
    setupConfigPositionButtons();
    
    // Option button event listeners
    setupConfigOptionButtons();
    
    // Config panel buttons
    const cancelBtn = document.getElementById('practice-cancel');
    const applyBtn = document.getElementById('practice-apply');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            showPage('landing-page');
        });
    }
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyPracticeConfiguration);
    }
    
    // Matrix control buttons
    const selectAllBtn = document.getElementById('select-all-hands');
    const deselectAllBtn = document.getElementById('deselect-all-hands');
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.config-hand-cell').forEach(cell => {
                cell.classList.add('selected');
                practiceConfig.selectedHands.add(cell.dataset.hand);
            });
        });
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.config-hand-cell').forEach(cell => {
                cell.classList.remove('selected');
                practiceConfig.selectedHands.delete(cell.dataset.hand);
            });
        });
    }
    
    // Toggle switch for only playable hands
    const onlyPlayableToggle = document.getElementById('only-playable-hands');
    if (onlyPlayableToggle) {
        onlyPlayableToggle.addEventListener('change', () => {
            practiceConfig.onlyPlayableHands = onlyPlayableToggle.checked;
        });
    }
}

function setupConfigPositionButtons() {
    // Hero position buttons
    const heroButtons = document.querySelectorAll('#config-hero-positions .config-position-btn');
    heroButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                selectConfigHeroPosition(btn.dataset.position);
            }
        });
    });
    
    // Villain position buttons
    const villainButtons = document.querySelectorAll('#config-villain-positions .config-position-btn');
    villainButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                selectConfigVillainPosition(btn.dataset.position);
            }
        });
    });
}

function selectConfigHeroPosition(position) {
    // Update active hero button
    document.querySelectorAll('#config-hero-positions .config-position-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`#config-hero-positions .config-position-btn[data-position="${position}"]`).classList.add('active');
    
    practiceConfig.heroPosition = position;
    
    // Update disabled states
    updateConfigPositionButtons();
}

function selectConfigVillainPosition(position) {
    // Update active villain button
    document.querySelectorAll('#config-villain-positions .config-position-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`#config-villain-positions .config-position-btn[data-position="${position}"]`).classList.add('active');
    
    practiceConfig.villainPosition = position;
    
    // Update disabled states
    updateConfigPositionButtons();
}

function updateConfigPositionButtons() {
    // Enable all buttons first
    document.querySelectorAll('.config-position-btn').forEach(btn => {
        btn.disabled = false;
    });
    
    // Cannot select same position unless it's "Any"
    if (practiceConfig.heroPosition !== 'Any' && practiceConfig.villainPosition !== 'Any') {
        // Disable hero position in villain buttons
        const villainHeroBtn = document.querySelector(`#config-villain-positions .config-position-btn[data-position="${practiceConfig.heroPosition}"]`);
        if (villainHeroBtn) {
            villainHeroBtn.disabled = true;
        }
        
        // Disable villain position in hero buttons
        const heroVillainBtn = document.querySelector(`#config-hero-positions .config-position-btn[data-position="${practiceConfig.villainPosition}"]`);
        if (heroVillainBtn) {
            heroVillainBtn.disabled = true;
        }
    }
}

function setupHistoryTracker() {
    // Add click event listeners to history slots
    const historySlots = document.querySelectorAll('.history-slot');
    historySlots.forEach(slot => {
        slot.addEventListener('click', () => {
            const handNumber = parseInt(slot.dataset.hand);
            const handIndex = handNumber - 1;
            if (practiceState.handHistory[handIndex]) {
                showHandDetails(practiceState.handHistory[handIndex]);
            }
        });
    });
    
    // Setup navigation buttons
    const prevBtn = document.getElementById('history-prev-btn');
    const nextBtn = document.getElementById('history-next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            navigateHistoryPrevious();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            navigateHistoryNext();
        });
    }
    
    // Setup detail panel close button
    const closeDetailBtn = document.getElementById('close-detail');
    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', hideHandDetails);
    }
    
    // Close detail panel when clicking overlay
    const detailOverlay = document.getElementById('hand-detail-panel');
    if (detailOverlay) {
        detailOverlay.addEventListener('click', (e) => {
            if (e.target === detailOverlay) {
                hideHandDetails();
            }
        });
    }
}

function setupConfigOptionButtons() {
    // Game type buttons
    const gameTypeButtons = document.querySelectorAll('#game-type-buttons .config-option-btn');
    gameTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectConfigOption('game-type', btn.dataset.value, btn);
        });
    });
    
    // Hand start buttons
    const handStartButtons = document.querySelectorAll('#hand-start-buttons .config-option-btn');
    handStartButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectConfigOption('hand-start', btn.dataset.value, btn);
            updateHandStartHint(btn.dataset.value);
        });
    });
}

function selectConfigOption(groupType, value, clickedBtn) {
    // Remove active class from all buttons in the group
    const groupSelector = groupType === 'game-type' ? '#game-type-buttons' : '#hand-start-buttons';
    document.querySelectorAll(`${groupSelector} .config-option-btn`).forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    clickedBtn.classList.add('active');
    
    // Update config
    if (groupType === 'game-type') {
        practiceConfig.gameType = value;
    } else if (groupType === 'hand-start') {
        practiceConfig.handStart = value;
    }
}

function updateHandStartHint(value) {
    const hintElement = document.getElementById('hand-start-hint');
    if (!hintElement) return;
    
    const hints = {
        'both': 'Both action types: OR and 3BET scenarios',
        'early-vs-late': 'Early positions vs Later (OR/FOLD, OR/CALL)',
        'late-vs-early': 'Later positions vs Early (3BET/FOLD, 3BET/CALL)'
    };
    
    hintElement.textContent = hints[value] || '';
}

function generateConfigHandMatrix() {
    const matrix = document.getElementById('config-hand-matrix');
    if (!matrix) return;
    
    matrix.innerHTML = '';
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    for (let row = 0; row < 13; row++) {
        for (let col = 0; col < 13; col++) {
            const cell = document.createElement('button');
            cell.className = 'config-hand-cell selected'; // All selected by default
            
            let handText = '';
            if (row === col) {
                handText = ranks[row] + ranks[col];
            } else if (row < col) {
                handText = ranks[row] + ranks[col] + 's';
            } else {
                handText = ranks[col] + ranks[row] + 'o';
            }
            
            cell.textContent = handText;
            cell.dataset.hand = handText;
            
            cell.addEventListener('click', function() {
                this.classList.toggle('selected');
                if (this.classList.contains('selected')) {
                    practiceConfig.selectedHands.add(handText);
                } else {
                    practiceConfig.selectedHands.delete(handText);
                }
            });
            
            matrix.appendChild(cell);
        }
    }
}

function applyPracticeConfiguration() {
    // Configuration values are already set in practiceConfig by button clicks
    // No need to read from DOM as buttons update practiceConfig directly
    
    // Validate that at least one hand is selected
    if (practiceConfig.selectedHands.size === 0) {
        alert('Please select at least one hand to practice with.');
        return;
    }
    
    // Hide config panel
    const configPanel = document.getElementById('practice-config-panel');
    if (configPanel) {
        configPanel.classList.add('hidden');
    }
    
    // Start session timer if this is a new session
    if (!sessionStartTime) {
        sessionStartTime = Date.now();
    }
    
    // Generate available hands for practice
    generateAvailableHands();
    
    // Reset practice state
    practiceState.currentHandIndex = 0;
    practiceState.handHistory = [];
    
    // Start first hand
    dealNextPracticeHand();
    
    // Update action buttons based on game type
    updatePracticeActionButtons();
}

function generateAvailableHands() {
    practiceState.availableHands = [];
    const positions = ['MP', 'CO', 'BU', 'SB', 'BB'];
    
    // Get all possible position matchups based on configuration
    const possibleMatchups = [];
    
    if (practiceConfig.heroPosition === 'Any' && practiceConfig.villainPosition === 'Any') {
        // All possible matchups
        positions.forEach(hero => {
            positions.forEach(villain => {
                if (hero !== villain) {
                    possibleMatchups.push({ hero, villain });
                }
            });
        });
    } else if (practiceConfig.heroPosition === 'Any') {
        // Hero can be any position, villain is fixed
        positions.forEach(hero => {
            if (hero !== practiceConfig.villainPosition) {
                possibleMatchups.push({ hero, villain: practiceConfig.villainPosition });
            }
        });
    } else if (practiceConfig.villainPosition === 'Any') {
        // Villain can be any position, hero is fixed
        positions.forEach(villain => {
            if (villain !== practiceConfig.heroPosition) {
                possibleMatchups.push({ hero: practiceConfig.heroPosition, villain });
            }
        });
    } else {
        // Both positions are fixed
        possibleMatchups.push({ hero: practiceConfig.heroPosition, villain: practiceConfig.villainPosition });
    }
    
    // Filter matchups based on hand start mode
    const filteredMatchups = possibleMatchups.filter(matchup => {
        if (practiceConfig.handStart === 'both') return true;
        
        const heroIndex = positions.indexOf(matchup.hero);
        const villainIndex = positions.indexOf(matchup.villain);
        
        if (practiceConfig.handStart === 'early-vs-late') {
            // Early positions vs Later positions (OR actions)
            return heroIndex < villainIndex || (matchup.hero === 'BU' && matchup.villain === 'SB');
        } else if (practiceConfig.handStart === 'late-vs-early') {
            // Later positions vs Early positions (3BET actions)
            return heroIndex > villainIndex || (matchup.hero === 'SB' && matchup.villain === 'BU');
        }
        
        return true;
    });
    
    // Generate hands for each valid matchup
    let totalRangesChecked = 0;
    let rangesWithData = 0;
    
    filteredMatchups.forEach(matchup => {
        const rangeKey = `${matchup.hero}_vs_${matchup.villain}`;
        const range = rangeData[rangeKey] || defaultRanges[rangeKey];
        totalRangesChecked++;
        
        if (range && Object.keys(range).length > 0) {
            rangesWithData++;
            practiceConfig.selectedHands.forEach(hand => {
                if (practiceConfig.onlyPlayableHands) {
                    // Only include hands with explicit actions (original behavior)
                    if (range[hand]) {
                        practiceState.availableHands.push({
                            hero: matchup.hero,
                            villain: matchup.villain,
                            hand: hand,
                            correctAction: range[hand]
                        });
                    }
                } else {
                    // Include all selected hands, defaulting to 'fold' if no action is specified
                    const correctAction = range[hand] || 'fold';
                    practiceState.availableHands.push({
                        hero: matchup.hero,
                        villain: matchup.villain,
                        hand: hand,
                        correctAction: correctAction
                    });
                }
            });
        }
    });
    
    // Provide feedback about range data availability
    console.log(`Range data status: ${rangesWithData}/${totalRangesChecked} matchups have data`);
    console.log(`Generated ${practiceState.availableHands.length} practice hands`);
    
    if (practiceState.availableHands.length === 0) {
        console.warn('⚠️ No practice hands available! This could be because:');
        console.warn('  - Default ranges failed to load');
        console.warn('  - No hands are selected for practice');
        console.warn('  - The selected position matchup has no range data');
    }
    
    // Shuffle available hands
    practiceState.availableHands = shuffleArray(practiceState.availableHands);
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function dealNextPracticeHand() {
    if (practiceState.availableHands.length === 0) {
        // Provide more helpful error message
        const hasDefaultRanges = Object.keys(defaultRanges).length > 0;
        const hasUserRanges = Object.keys(rangeData).length > 0;
        
        let errorMessage = 'No hands available for practice!\n\n';
        
        if (!hasDefaultRanges && !hasUserRanges) {
            errorMessage += 'Possible causes:\n' +
                          '• Default ranges failed to load from ' + DEFAULT_RANGES_PATH + '\n' +
                          '• No custom ranges have been created\n\n' +
                          'Please check the console for more details or try reloading the page.';
        } else {
            errorMessage += 'Possible causes:\n' +
                          '• No hands are selected in the practice configuration\n' +
                          '• The selected position matchup has no range data\n' +
                          '• Try selecting "Any Position" to include all matchups';
        }
        
        alert(errorMessage);
        return;
    }
    
    // Get next hand (cycle through available hands)
    const handIndex = practiceState.currentHandIndex % practiceState.availableHands.length;
    const nextHand = practiceState.availableHands[handIndex];
    
    practiceState.currentHand = nextHand;
    practiceState.currentHeroPosition = nextHand.hero;
    practiceState.currentVillainPosition = nextHand.villain;
    
    // Update table display
    updatePracticeTable(nextHand);
    
    // Update facing positions display
    updateFacingPositions(nextHand.hero, nextHand.villain);
    
    // Update action buttons
    updatePracticeActionButtons();
}

function updatePracticeTable(hand) {
    // Convert hand string to card objects
    const cards = convertHandStringToCards(hand.hand);
    
    // Update hero cards
    const heroCards = document.querySelectorAll('.hero .hole-card.face-up');
    if (heroCards.length >= 2 && cards.length >= 2) {
        heroCards[0].textContent = cards[0].rank;
        heroCards[0].className = `hole-card face-up ${cards[0].suit}`;
        heroCards[0].dataset.card = cards[0].rank + cards[0].suitSymbol;
        
        heroCards[1].textContent = cards[1].rank;
        heroCards[1].className = `hole-card face-up ${cards[1].suit}`;
        heroCards[1].dataset.card = cards[1].rank + cards[1].suitSymbol;
    }
    
    // Update position labels and show appropriate players
    updateTablePositions(hand.hero, hand.villain);
    
    // Update hole card visibility
    updateHoleCardVisibility(hand.hero, hand.villain);
    
    // Update chip and bet visibility
    updateChipVisibility(hand.hero, hand.villain);
}

function convertHandStringToCards(handString) {
    // Parse hand string like "AKs", "72o", "AA"
    let card1Rank, card2Rank, suited = false;
    
    if (handString.length === 2) {
        // Pocket pair
        card1Rank = card2Rank = handString[0];
    } else {
        card1Rank = handString[0];
        card2Rank = handString[1];
        suited = handString[2] === 's';
    }
    
    // Assign random suits
    const suits = ['spades', 'clubs', 'hearts', 'diamonds'];
    const suitSymbols = { spades: '♠', clubs: '♣', hearts: '♥', diamonds: '♦' };
    
    let card1Suit, card2Suit;
    
    if (suited && handString.length > 2) {
        // Same suit
        card1Suit = suits[Math.floor(Math.random() * suits.length)];
        card2Suit = card1Suit;
    } else if (!suited && handString.length > 2) {
        // Different suits
        card1Suit = suits[Math.floor(Math.random() * suits.length)];
        do {
            card2Suit = suits[Math.floor(Math.random() * suits.length)];
        } while (card2Suit === card1Suit);
    } else {
        // Pocket pair - different suits
        card1Suit = suits[Math.floor(Math.random() * suits.length)];
        do {
            card2Suit = suits[Math.floor(Math.random() * suits.length)];
        } while (card2Suit === card1Suit);
    }
    
    return [
        { rank: card1Rank, suit: card1Suit, suitSymbol: suitSymbols[card1Suit] },
        { rank: card2Rank, suit: card2Suit, suitSymbol: suitSymbols[card2Suit] }
    ];
}

function updateTablePositions(heroPos, villainPos) {
    // Rotate table based on hero position
    rotateTableForHero(heroPos);
    
    // Update hero position
    const hero = document.querySelector('.practice-player.hero');
    if (hero) {
        hero.dataset.position = heroPos;
        const heroLabel = hero.querySelector('.position-label-practice');
        if (heroLabel) heroLabel.textContent = heroPos;
    }
}

function rotateTableForHero(heroPos) {
    // Define the table position mapping based on hero position
    // Hero is always at the bottom center
    const positionMappings = {
        'MP': {
            'villain-1': 'CO',  // Bottom Left
            'villain-3': 'BU',  // Top Left  
            'villain-4': 'SB',  // Top Right
            'villain-2': 'BB'   // Bottom Right
        },
        'CO': {
            'villain-1': 'BU',  // Bottom Left
            'villain-3': 'SB',  // Top Left
            'villain-4': 'BB',  // Top Right
            'villain-2': 'MP'   // Bottom Right
        },
        'BU': {
            'villain-1': 'SB',  // Bottom Left
            'villain-3': 'BB',  // Top Left
            'villain-4': 'MP',  // Top Right
            'villain-2': 'CO'   // Bottom Right
        },
        'SB': {
            'villain-1': 'BB',  // Bottom Left
            'villain-3': 'MP',  // Top Left
            'villain-4': 'CO',  // Top Right
            'villain-2': 'BU'   // Bottom Right
        },
        'BB': {
            'villain-1': 'MP',  // Bottom Left
            'villain-3': 'CO',  // Top Left
            'villain-4': 'BU',  // Top Right
            'villain-2': 'SB'   // Bottom Right
        }
    };
    
    const mapping = positionMappings[heroPos];
    if (!mapping) return;
    
    // Update each villain player's position and label
    Object.keys(mapping).forEach(villainClass => {
        const newPosition = mapping[villainClass];
        const player = document.querySelector(`.practice-player.${villainClass}`);
        
        if (player) {
            player.dataset.position = newPosition;
            const positionLabel = player.querySelector('.position-label-practice');
            if (positionLabel) {
                positionLabel.textContent = newPosition;
            }
        }
    });
}

function updateHoleCardVisibility(heroPos, villainPos) {
    // Get all players
    const allPlayers = document.querySelectorAll('.practice-player');
    
    allPlayers.forEach(player => {
        const holeCardsContainer = player.querySelector('.player-hole-cards');
        if (!holeCardsContainer) return;
        
        const isHero = player.classList.contains('hero');
        const playerPosition = player.dataset.position;
        
        // Determine if this player should show hole cards
        // Hero always shows cards, villain shows cards only if they're the actual villain
        let shouldShowCards = false;
        
        if (isHero) {
            // Hero always shows cards
            shouldShowCards = true;
        } else {
            // For non-hero players, only show cards if they are the villain in this hand
            shouldShowCards = (playerPosition === villainPos);
        }
        
        if (shouldShowCards) {
            // Show hole cards
            holeCardsContainer.style.visibility = 'visible';
            holeCardsContainer.style.opacity = '1';
        } else {
            // Hide hole cards
            holeCardsContainer.style.visibility = 'hidden';
            holeCardsContainer.style.opacity = '0';
        }
    });
}

function updateChipVisibility(heroPos, villainPos) {
    // Get all players
    const allPlayers = document.querySelectorAll('.practice-player');
    const positions = ['MP', 'CO', 'BU', 'SB', 'BB'];
    const heroIndex = positions.indexOf(heroPos);
    const villainIndex = positions.indexOf(villainPos);
    
    // Determine if this is heads-up between SB and BB
    const isSBvsBB = (heroPos === 'SB' && villainPos === 'BB');
    const isBBvsSB = (heroPos === 'BB' && villainPos === 'SB');
    const isHeadsUp = isSBvsBB || isBBvsSB;
    
    // Determine spot type
    let isEarlyVsLate = false;
    let isLateVsEarly = false;
    
    if (heroIndex < villainIndex || (heroPos === 'BU' && villainPos === 'SB')) {
        isEarlyVsLate = true; // Hero is earlier position vs later position
    } else if (heroIndex > villainIndex || (heroPos === 'SB' && villainPos === 'BU')) {
        isLateVsEarly = true; // Hero is later position vs earlier position  
    }
    
    let totalPot = 0;
    
    allPlayers.forEach(player => {
        const betArea = player.querySelector('.player-bet-area');
        const betAmountElement = player.querySelector('.bet-amount');
        const stackAmountElement = player.querySelector('.stack-amount');
        const playerRectangle = player.querySelector('.player-rectangle');
        
        if (!betArea || !betAmountElement || !stackAmountElement) return;
        
        const isHero = player.classList.contains('hero');
        const playerPosition = player.dataset.position;
        
        let shouldShowChips = false;
        let betAmount = 0;
        let stackAmount = 100; // Starting stack
        
        // 1. Always visible blinds logic
        if (playerPosition === 'BB') {
            shouldShowChips = true;
            betAmount = 1; // BB is always 1
        } else if (playerPosition === 'SB') {
            shouldShowChips = true;
            // SB special cases:
            // - SB vs BB (normal): SB = 0.5
            // - BB vs SB (heads-up): SB = 3
            if (isBBvsSB) {
                betAmount = 3; // BB vs SB heads-up case
            } else {
                betAmount = 0.5; // Normal SB amount
            }
        }
        
        // 2. Handle heads-up scenarios
        if (isHeadsUp) {
            // In heads-up, only SB and BB should show chips (already handled above)
            if (playerPosition !== 'SB' && playerPosition !== 'BB') {
                shouldShowChips = false;
                betAmount = 0;
            }
        } else {
            // 3. Early vs Late hands (non-heads-up)
            if (isEarlyVsLate) {
                // Only SB and BB should display chips (already handled above)
                if (playerPosition !== 'SB' && playerPosition !== 'BB') {
                    shouldShowChips = false;
                    betAmount = 0;
                }
            }
            
            // 4. Late vs Early hands (non-heads-up)
            if (isLateVsEarly) {
                // Early player who opened must display their chip + bet amount = 3
                if (playerPosition === villainPos && playerPosition !== 'SB' && playerPosition !== 'BB') {
                    shouldShowChips = true;
                    betAmount = 3; // Opening bet
                }
                // SB and BB are already handled above
            }
        }
        
        // Update bet amount display and stack
        if (shouldShowChips) {
            betAmountElement.textContent = betAmount;
            stackAmount = 100 - betAmount;
            betArea.style.visibility = 'visible';
            betArea.style.opacity = '1';
            totalPot += betAmount;
        } else {
            betAmountElement.textContent = '';
            stackAmount = 100; // No bet, full stack
            betArea.style.visibility = 'hidden';
            betArea.style.opacity = '0';
        }
        
        // Update stack amount
        stackAmountElement.textContent = stackAmount;
    });
    
    // Update pot display
    updatePotDisplay(totalPot);
}

function updatePotDisplay(totalPot) {
    const potValueElement = document.querySelector('.pot-value');
    if (potValueElement) {
        potValueElement.textContent = totalPot;
    }
}

function updateFacingPositions(heroPos, villainPos) {
    const matchupElement = document.getElementById('current-matchup');
    if (matchupElement) {
        matchupElement.textContent = `${heroPos} vs ${villainPos}`;
    }
}

function updatePracticeActionButtons() {
    // Hide all action buttons first
    const allButtons = document.querySelectorAll('.practice-action-btn');
    allButtons.forEach(btn => {
        btn.style.display = 'none';
    });
    
    if (practiceConfig.gameType === 'fold-no-fold') {
        // Show only Fold and No Fold buttons
        const foldBtn = document.querySelector('.practice-action-btn.fold');
        const noFoldBtn = document.querySelector('.practice-action-btn.no-fold');
        
        if (foldBtn) foldBtn.style.display = 'inline-block';
        if (noFoldBtn) noFoldBtn.style.display = 'inline-block';
    } else {
        // Full mode - show all relevant actions for the matchup
        const foldBtn = document.querySelector('.practice-action-btn.fold');
        if (foldBtn) foldBtn.style.display = 'inline-block';
        
        // Get actions for current practice matchup
        const actions = getPracticeActionsForMatchup(practiceState.currentHeroPosition, practiceState.currentVillainPosition);
        
        // Show specific buttons based on matchup
        actions.forEach(action => {
            const btn = document.querySelector(`.practice-action-btn.${action.class}`);
            if (btn) {
                btn.style.display = 'inline-block';
            }
        });
    }
}

function getPracticeActionsForMatchup(hero, villain) {
    const positions = ['MP', 'CO', 'BU', 'SB', 'BB'];
    const heroIndex = positions.indexOf(hero);
    const villainIndex = positions.indexOf(villain);
    
    // BB has special actions - only 3BET and CALL actions
    if (hero === 'BB') {
        return [
            { label: 'Call', class: 'call' },
            { label: '3Bet/Fold', class: 'three-bet-fold' },
            { label: '3Bet/Call', class: 'three-bet-call' },
            { label: '3Bet/Push', class: 'three-bet-push' }
        ];
    }
    
    // Early to Later positions (e.g., MP vs BU, BU vs SB) - OR actions
    if (heroIndex < villainIndex || (hero === 'BU' && villain === 'SB')) {
        return [
            { label: 'OR/Fold', class: 'or-fold' },
            { label: 'OR/Call', class: 'or-call' },
            { label: 'OR/4Bet/Fold', class: 'or-4bet-fold' },
            { label: 'OR/4Bet/Call', class: 'or-4bet-call' }
        ];
    }
    
    // Later to Early positions (e.g., SB vs MP, BB vs BU) - 3BET actions
    return [
        { label: 'Call', class: 'call' },
        { label: '3Bet/Fold', class: 'three-bet-fold' },
        { label: '3Bet/Call', class: 'three-bet-call' },
        { label: '3Bet/Push', class: 'three-bet-push' }
    ];
}

function handlePracticeAction(actionClass) {
    if (!practiceState.currentHand) return;
    
    let isCorrect = false;
    let userAction = actionClass;
    
    if (practiceConfig.gameType === 'fold-no-fold') {
        // In fold/no-fold mode, check if hand should be played or folded
        const correctAction = practiceState.currentHand.correctAction;
        if (userAction === 'fold') {
            isCorrect = !correctAction || correctAction === 'fold';
        } else if (userAction === 'no-fold') {
            isCorrect = correctAction && correctAction !== 'fold';
        }
    } else {
        // In full mode, check exact action match
        isCorrect = userAction === practiceState.currentHand.correctAction;
    }
    
    // Show feedback
    showFeedback(isCorrect);
    
    // Update statistics
    handsPlayed++;
    if (isCorrect) {
        correctDecisions++;
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
    } else {
        currentStreak = 0;
    }
    
    // Store hand in history
    const handRecord = {
        ...practiceState.currentHand,
        userAction: userAction,
        isCorrect: isCorrect,
        handNumber: handsPlayed
    };
    practiceState.handHistory.push(handRecord);
    
    // Update history tracker
    updateHistoryTracker(isCorrect, handsPlayed);
    
    // Move to next hand after short delay
    setTimeout(() => {
        practiceState.currentHandIndex++;
        dealNextPracticeHand();
    }, 1500);
}

function showFeedback(isCorrect) {
    const feedbackOverlay = document.getElementById('practice-feedback-overlay');
    const feedbackMessage = document.getElementById('feedback-message');
    const feedbackText = feedbackMessage.querySelector('.feedback-text');
    
    if (!feedbackOverlay || !feedbackMessage || !feedbackText) return;
    
    // Update message
    feedbackText.textContent = isCorrect ? 'Correct!' : 'Wrong!';
    feedbackMessage.className = `feedback-message ${isCorrect ? 'correct' : 'incorrect'}`;
    
    // Show overlay
    feedbackOverlay.classList.add('visible');
    
    // Hide after delay
    setTimeout(() => {
        feedbackOverlay.classList.remove('visible');
    }, 1200);
}

function updateHistoryTracker(isCorrect, handNumber) {
    // Auto-shift view if we're showing the latest hands and a new hand is played
    if (handNumber > 5 && practiceState.historyViewStart === Math.max(0, handNumber - 6)) {
        practiceState.historyViewStart = handNumber - 4; // Show last 4 + current hand
    }
    
    updateHistoryDisplay(handNumber);
    updateNavigationButtons();
}

function updateHistoryDisplay(currentHandNumber) {
    const historySlots = document.querySelectorAll('.history-slot');
    
    historySlots.forEach((slot, index) => {
        const handNumber = practiceState.historyViewStart + index + 1;
        
        // Clear all classes
        slot.classList.remove('current', 'pending', 'correct', 'incorrect');
        
        if (handNumber <= practiceState.handHistory.length) {
            // This slot represents a completed hand
            const handRecord = practiceState.handHistory[handNumber - 1];
            slot.classList.add(handRecord.isCorrect ? 'correct' : 'incorrect');
            slot.dataset.hand = handNumber;
            slot.querySelector('.slot-number').textContent = handNumber;
        } else if (handNumber === currentHandNumber) {
            // This is the current hand
            slot.classList.add('current', 'pending');
            slot.dataset.hand = handNumber;
            slot.querySelector('.slot-number').textContent = handNumber;
        } else if (handNumber <= practiceState.maxHandsPerSession) {
            // Future hand slot
            slot.classList.add('pending');
            slot.dataset.hand = handNumber;
            slot.querySelector('.slot-number').textContent = handNumber;
        } else {
            // Hide slot if beyond max hands
            slot.style.display = 'none';
            return;
        }
        
        slot.style.display = 'flex';
    });
}

function navigateHistoryPrevious() {
    if (practiceState.historyViewStart > 0) {
        practiceState.historyViewStart = Math.max(0, practiceState.historyViewStart - 5);
        updateHistoryDisplay(handsPlayed + 1);
        updateNavigationButtons();
    }
}

function navigateHistoryNext() {
    const maxStart = Math.max(0, Math.min(practiceState.maxHandsPerSession - 5, handsPlayed - 4));
    if (practiceState.historyViewStart < maxStart) {
        practiceState.historyViewStart = Math.min(maxStart, practiceState.historyViewStart + 5);
        updateHistoryDisplay(handsPlayed + 1);
        updateNavigationButtons();
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('history-prev-btn');
    const nextBtn = document.getElementById('history-next-btn');
    
    if (prevBtn) {
        prevBtn.disabled = practiceState.historyViewStart <= 0;
    }
    
    if (nextBtn) {
        const maxStart = Math.max(0, Math.min(practiceState.maxHandsPerSession - 5, handsPlayed - 4));
        nextBtn.disabled = practiceState.historyViewStart >= maxStart;
    }
}

function setupSessionManagement() {
    // End session button
    const endSessionBtn = document.getElementById('end-session-btn');
    if (endSessionBtn) {
        endSessionBtn.addEventListener('click', endSession);
    }
    
    // Results panel buttons
    const closeResultsBtn = document.getElementById('close-results');
    const goToMainBtn = document.getElementById('go-to-main-btn');
    const newSessionBtn = document.getElementById('new-session-btn');
    const continueSessionBtn = document.getElementById('continue-session-btn');
    
    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', hideSessionResults);
    }
    
    if (goToMainBtn) {
        goToMainBtn.addEventListener('click', goToMainPage);
    }
    
    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', startNewSession);
    }
    
    if (continueSessionBtn) {
        continueSessionBtn.addEventListener('click', continueSession);
    }
    
    // Close results panel when clicking overlay
    const resultsOverlay = document.getElementById('session-results-panel');
    if (resultsOverlay) {
        resultsOverlay.addEventListener('click', (e) => {
            if (e.target === resultsOverlay) {
                hideSessionResults();
            }
        });
    }
}

function endSession() {
    // Calculate session stats
    const sessionDuration = sessionStartTime ? Date.now() - sessionStartTime : 0;
    const accuracy = handsPlayed > 0 ? Math.round((correctDecisions / handsPlayed) * 100) : 0;
    
    // Update results display
    updateSessionResults(handsPlayed, accuracy, sessionDuration, bestStreak);
    
    // Show results panel
    showSessionResults();
}

function updateSessionResults(totalHands, accuracy, duration, streak) {
    // Update stat values
    const totalHandsStat = document.getElementById('total-hands-stat');
    const accuracyStat = document.getElementById('accuracy-stat');
    const sessionTimeStat = document.getElementById('session-time-stat');
    const bestStreakStat = document.getElementById('best-streak-stat');
    
    if (totalHandsStat) totalHandsStat.textContent = totalHands;
    if (accuracyStat) accuracyStat.textContent = `${accuracy}%`;
    if (sessionTimeStat) sessionTimeStat.textContent = formatDuration(duration);
    if (bestStreakStat) bestStreakStat.textContent = streak;
}

function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function showSessionResults() {
    const resultsPanel = document.getElementById('session-results-panel');
    if (resultsPanel) {
        resultsPanel.classList.add('visible');
    }
}

function hideSessionResults() {
    const resultsPanel = document.getElementById('session-results-panel');
    if (resultsPanel) {
        resultsPanel.classList.remove('visible');
    }
}

function startNewSession() {
    // Save session data before resetting
    saveSessionData();
    
    // Reset all session data
    handsPlayed = 0;
    correctDecisions = 0;
    currentStreak = 0;
    bestStreak = 0;
    sessionStartTime = null;
    practiceState.currentHandIndex = 0;
    practiceState.handHistory = [];
    practiceState.historyViewStart = 0;
    
    // Hide results panel
    hideSessionResults();
    
    // Show configuration panel to start new session
    const configPanel = document.getElementById('practice-config-panel');
    if (configPanel) {
        configPanel.classList.remove('hidden');
    }
    
    // Reset history display
    updateHistoryDisplay(1);
    updateNavigationButtons();
    
    // Reset table
    resetTableToDefault();
}

function continueSession() {
    // Just hide the results panel and continue with current session
    hideSessionResults();
}

function goToMainPage() {
    // Save session data before going to main page
    saveSessionData();
    
    // Hide session results panel
    hideSessionResults();
    
    // Navigate to landing page
    showPage('landing-page');
}

function saveSessionData() {
    // Only save if there were hands played
    if (handsPlayed === 0) return;
    
    const sessionEndTime = Date.now();
    const sessionDuration = sessionStartTime ? sessionEndTime - sessionStartTime : 0;
    const accuracy = Math.round((correctDecisions / handsPlayed) * 100);
    
    // Format game type and hand start mode for display
    const gameTypeDisplay = practiceConfig.gameType === 'full-mode' ? 'Full Mode' : 'Fold/No Fold';
    const handStartDisplay = {
        'both': 'Both (OR + 3BET)',
        'early-vs-late': 'Early vs Late',
        'late-vs-early': 'Late vs Early'
    }[practiceConfig.handStart] || practiceConfig.handStart;
    
    const positionDisplay = practiceConfig.heroPosition === 'Any' && practiceConfig.villainPosition === 'Any' 
        ? 'Any Position' 
        : `${practiceConfig.heroPosition} vs ${practiceConfig.villainPosition}`;
    
    // Create session data object
    const sessionData = {
        id: sessionEndTime, // Unique session ID using end time
        sessionEndTime: sessionEndTime,
        sessionStartTime: sessionStartTime,
        timestamp: new Date(sessionEndTime).toISOString(),
        readableDate: formatSessionDate(sessionEndTime),
        totalHands: handsPlayed,
        correctHands: correctDecisions,
        accuracy: accuracy,
        sessionTime: sessionDuration,
        sessionTimeFormatted: formatDuration(sessionDuration),
        bestStreak: bestStreak,
        gameType: practiceConfig.gameType,
        gameTypeDisplay: gameTypeDisplay,
        handStartMode: practiceConfig.handStart,
        handStartDisplay: handStartDisplay,
        heroPosition: practiceConfig.heroPosition,
        villainPosition: practiceConfig.villainPosition,
        positionDisplay: positionDisplay,
        selectedHandsCount: practiceConfig.selectedHands.size
    };
    
    // Get existing session history from localStorage
    let sessionHistory = [];
    try {
        const existing = localStorage.getItem('practiceSessionHistory');
        if (existing) {
            sessionHistory = JSON.parse(existing);
        }
    } catch (error) {
        console.warn('Error loading session history:', error);
        sessionHistory = [];
    }
    
    // Add new session to history
    sessionHistory.push(sessionData);
    
    // Keep only last 50 sessions to avoid localStorage bloat
    if (sessionHistory.length > 50) {
        sessionHistory = sessionHistory.slice(-50);
    }
    
    // Save updated history
    try {
        localStorage.setItem('practiceSessionHistory', JSON.stringify(sessionHistory));
        console.log('Session data saved successfully');
        
        // Update statistics display if we're on the statistics page
        if (document.getElementById('statistics-page').classList.contains('active')) {
            loadAndDisplayStatistics();
        }
    } catch (error) {
        console.warn('Error saving session data:', error);
    }
}

function formatSessionDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function loadAndDisplayStatistics() {
    // Load session history from localStorage
    let sessionHistory = [];
    try {
        const existing = localStorage.getItem('practiceSessionHistory');
        if (existing) {
            sessionHistory = JSON.parse(existing);
        }
    } catch (error) {
        console.warn('Error loading session history:', error);
        sessionHistory = [];
    }
    
    // For demonstration purposes - add sample data if no sessions exist
    // Remove this block in production
    if (sessionHistory.length === 0 && window.location.hostname === 'localhost') {
        const sampleSession = {
            id: Date.now() - 3600000,
            sessionEndTime: Date.now() - 3600000,
            sessionStartTime: Date.now() - 3900000,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            readableDate: formatSessionDate(Date.now() - 3600000),
            totalHands: 25,
            correctHands: 20,
            accuracy: 80,
            sessionTime: 300000,
            sessionTimeFormatted: formatDuration(300000),
            bestStreak: 8,
            gameType: 'full-mode',
            gameTypeDisplay: 'Full Mode',
            handStartMode: 'both',
            handStartDisplay: 'Both (OR + 3BET)',
            heroPosition: 'BU',
            villainPosition: 'SB',
            positionDisplay: 'BU vs SB',
            selectedHandsCount: 169
        };
        sessionHistory = [sampleSession];
    }
    
    // Calculate overall statistics with safe fallbacks
    const totalSessions = sessionHistory.length;
    const totalHands = sessionHistory.reduce((sum, session) => sum + (session.totalHands || 0), 0);
    const totalCorrect = sessionHistory.reduce((sum, session) => sum + (session.correctHands || 0), 0);
    const totalTime = sessionHistory.reduce((sum, session) => sum + (session.sessionTime || 0), 0);
    const overallAccuracy = totalHands > 0 ? Math.round((totalCorrect / totalHands) * 100) : 0;
    
    // Update overall statistics display
    updateOverallStatistics(totalHands, overallAccuracy, totalSessions, totalTime);
    
    // Display session history
    displaySessionHistory(sessionHistory);
}

function updateOverallStatistics(totalHands, accuracy, totalSessions, totalTime) {
    const totalHandsEl = document.getElementById('total-hands-practiced');
    const overallAccuracyEl = document.getElementById('overall-accuracy');
    const totalSessionsEl = document.getElementById('total-sessions');
    const totalStudyTimeEl = document.getElementById('total-study-time');
    
    if (totalHandsEl) totalHandsEl.textContent = totalHands.toLocaleString();
    if (overallAccuracyEl) overallAccuracyEl.textContent = `${accuracy}%`;
    if (totalSessionsEl) totalSessionsEl.textContent = totalSessions;
    if (totalStudyTimeEl) totalStudyTimeEl.textContent = formatDurationHours(totalTime);
}

function formatDurationHours(milliseconds) {
    const totalMinutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) {
        return `${minutes}m`;
    } else if (minutes === 0) {
        return `${hours}h`;
    } else {
        return `${hours}h ${minutes}m`;
    }
}

function displaySessionHistory(sessionHistory) {
    const sessionList = document.getElementById('session-history-list');
    if (!sessionList) return;
    
    // Clear existing content
    sessionList.innerHTML = '';
    
    if (sessionHistory.length === 0) {
        // Show no sessions message
        const noSessionsMsg = document.createElement('div');
        noSessionsMsg.className = 'no-sessions-message';
        noSessionsMsg.innerHTML = '<p>No practice sessions yet. Start practicing to see your session history!</p>';
        sessionList.appendChild(noSessionsMsg);
        return;
    }
    
    // Sort sessions by end time (most recent first)
    const sortedSessions = [...sessionHistory].sort((a, b) => b.sessionEndTime - a.sessionEndTime);
    
    // Create session entries
    sortedSessions.forEach((session, index) => {
        const sessionEntry = createSessionEntry(session, index + 1);
        sessionList.appendChild(sessionEntry);
    });
}

function createSessionEntry(session, sessionNumber) {
    const entry = document.createElement('div');
    entry.className = 'session-entry';
    
    // Ensure backward compatibility with older session data
    const sessionData = {
        totalHands: session.totalHands || 0,
        correctHands: session.correctHands || 0,
        accuracy: session.accuracy || 0,
        bestStreak: session.bestStreak || 0,
        sessionTimeFormatted: session.sessionTimeFormatted || formatDuration(session.sessionTime || 0),
        readableDate: session.readableDate || formatSessionDate(session.sessionEndTime || session.timestamp || Date.now()),
        gameTypeDisplay: session.gameTypeDisplay || (session.gameType === 'full-mode' ? 'Full Mode' : 'Fold/No Fold'),
        handStartDisplay: session.handStartDisplay || session.handStartMode || 'Unknown',
        positionDisplay: session.positionDisplay || `${session.heroPosition || 'Any'} vs ${session.villainPosition || 'Any'}`,
        selectedHandsCount: session.selectedHandsCount || 0
    };
    
    // Determine accuracy class for color coding
    let accuracyClass = '';
    if (sessionData.accuracy >= 80) accuracyClass = 'accuracy-excellent';
    else if (sessionData.accuracy >= 60) accuracyClass = 'accuracy-good';
    else accuracyClass = 'accuracy-poor';
    
    entry.innerHTML = `
        <div class="session-header">
            <div class="session-title">Practice Session #${sessionNumber}</div>
            <div class="session-date">${sessionData.readableDate}</div>
        </div>
        
        <div class="session-stats">
            <div class="session-stat">
                <div class="session-stat-value">${sessionData.totalHands}</div>
                <div class="session-stat-label">Hands</div>
            </div>
            <div class="session-stat">
                <div class="session-stat-value">${sessionData.correctHands}</div>
                <div class="session-stat-label">Correct</div>
            </div>
            <div class="session-stat">
                <div class="session-stat-value ${accuracyClass}">${sessionData.accuracy}%</div>
                <div class="session-stat-label">Accuracy</div>
            </div>
            <div class="session-stat">
                <div class="session-stat-value">${sessionData.sessionTimeFormatted}</div>
                <div class="session-stat-label">Duration</div>
            </div>
            <div class="session-stat">
                <div class="session-stat-value">${sessionData.bestStreak}</div>
                <div class="session-stat-label">Best Streak</div>
            </div>
        </div>
        
        <div class="session-settings">
            <span class="session-tag game-mode">${sessionData.gameTypeDisplay}</span>
            <span class="session-tag">${sessionData.handStartDisplay}</span>
            <span class="session-tag position">${sessionData.positionDisplay}</span>
            <span class="session-tag hands">${sessionData.selectedHandsCount} hands selected</span>
        </div>
    `;
    
    return entry;
}

function showHandDetails(handRecord) {
    const detailOverlay = document.getElementById('hand-detail-panel');
    if (!detailOverlay) return;
    
    // Update detail content
    const heroPos = document.getElementById('detail-hero-position');
    const villainPos = document.getElementById('detail-villain-position');
    const heroHand = document.getElementById('detail-hero-hand');
    const correctAction = document.getElementById('detail-correct-action');
    const myAction = document.getElementById('detail-my-action');
    const resultIndicator = document.getElementById('detail-result-indicator');
    
    if (heroPos) heroPos.textContent = handRecord.hero;
    if (villainPos) villainPos.textContent = handRecord.villain;
    if (heroHand) heroHand.textContent = handRecord.hand;
    if (correctAction) correctAction.textContent = formatActionName(handRecord.correctAction);
    if (myAction) myAction.textContent = formatActionName(handRecord.userAction);
    
    // Update result indicator
    if (resultIndicator) {
        const resultText = resultIndicator.querySelector('.result-text');
        if (resultText) {
            resultText.textContent = handRecord.isCorrect ? 'Correct!' : 'Incorrect';
        }
        resultIndicator.className = 'result-indicator ' + (handRecord.isCorrect ? 'correct' : 'incorrect');
    }
    
    // Generate detail hand matrix
    generateDetailHandMatrix(handRecord);
    
    // Show overlay
    detailOverlay.classList.add('visible');
}

function formatActionName(action) {
    // Convert action class names to user-friendly display names
    const actionNames = {
        'fold': 'Fold',
        'or-fold': 'OR/Fold',
        'or-call': 'OR/Call',
        'or-4bet-fold': 'OR/4Bet/Fold',
        'or-4bet-call': 'OR/4Bet/Call',
        'three-bet-fold': '3Bet/Fold',
        'three-bet-call': '3Bet/Call',
        'three-bet-push': '3Bet/Push',
        'call': 'Call',
        'no-fold': 'No Fold'
    };
    
    return actionNames[action] || action;
}

function hideHandDetails() {
    const detailOverlay = document.getElementById('hand-detail-panel');
    if (detailOverlay) {
        detailOverlay.classList.remove('visible');
    }
}

function generateDetailHandMatrix(handRecord) {
    const matrix = document.getElementById('detail-hand-matrix');
    if (!matrix) return;
    
    matrix.innerHTML = '';
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    // Get range data for this matchup
    const rangeKey = `${handRecord.hero}_vs_${handRecord.villain}`;
    const range = rangeData[rangeKey] || defaultRanges[rangeKey] || {};
    
    for (let row = 0; row < 13; row++) {
        for (let col = 0; col < 13; col++) {
            const cell = document.createElement('div');
            cell.className = 'detail-hand-cell';
            
            let handText = '';
            if (row === col) {
                handText = ranks[row] + ranks[col];
            } else if (row < col) {
                handText = ranks[row] + ranks[col] + 's';
            } else {
                handText = ranks[col] + ranks[row] + 'o';
            }
            
            cell.textContent = handText;
            
            // Apply action color if this hand has an action
            if (range[handText]) {
                cell.classList.add(range[handText]);
            }
            
            // Highlight the current hand
            if (handText === handRecord.hand) {
                cell.style.border = '3px solid #fff';
                cell.style.fontWeight = '900';
            }
            
            matrix.appendChild(cell);
        }
    }
}

function formatActionName(action) {
    const actionNames = {
        'fold': 'Fold',
        'call': 'Call',
        'or-fold': 'OR/Fold',
        'or-call': 'OR/Call',
        'or-4bet-fold': 'OR/4Bet/Fold',
        'or-4bet-call': 'OR/4Bet/Call',
        'three-bet-fold': '3Bet/Fold',
        'three-bet-call': '3Bet/Call',
        'three-bet-push': '3Bet/Push'
    };
    return actionNames[action] || action;
}

// Update the practice page initialization in the showPage function
function initializePracticePage() {
    // Show config panel when entering practice page
    const configPanel = document.getElementById('practice-config-panel');
    if (configPanel) {
        configPanel.classList.remove('hidden');
    }
    
    // Reset practice state
    practiceState.currentHandIndex = 0;
    practiceState.handHistory = [];
    practiceState.historyViewStart = 0;
    handsPlayed = 0;
    correctDecisions = 0;
    
    // Reset history tracker
    updateHistoryDisplay(1);
    updateNavigationButtons();
    
    // Reset table to default positions for initial state
    resetTableToDefault();
}

function resetTableToDefault() {
    // Reset all players to their default positions
    const defaultPositions = {
        'villain-3': 'MP',   // Top Left
        'villain-4': 'CO',   // Top Right  
        'villain-1': 'SB',   // Bottom Left
        'villain-2': 'BTN'   // Bottom Right
    };
    
    Object.keys(defaultPositions).forEach(villainClass => {
        const position = defaultPositions[villainClass];
        const player = document.querySelector(`.practice-player.${villainClass}`);
        
        if (player) {
            player.dataset.position = position;
            const positionLabel = player.querySelector('.position-label-practice');
            if (positionLabel) {
                positionLabel.textContent = position;
            }
        }
    });
    
    // Reset hero to default
    const hero = document.querySelector('.practice-player.hero');
    if (hero) {
        hero.dataset.position = 'BB';
        const heroLabel = hero.querySelector('.position-label-practice');
        if (heroLabel) heroLabel.textContent = 'BB';
    }
}

// ==========================================
// IMPORT/EXPORT FUNCTIONALITY
// ==========================================

function setupImportExportControls() {
    const exportBtn = document.getElementById('export-ranges-btn');
    const fileInput = document.getElementById('file-input');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportRanges);
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', importRanges);
    }
}

function exportRanges() {
    try {
        // Create export data with timestamp
        const exportData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            ranges: rangeData
        };
        
        // Create download link
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        // Create temporary download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `preflop-ranges-${new Date().toISOString().split('T')[0]}.json`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up URL
        URL.revokeObjectURL(url);
        
        console.log('Ranges exported successfully');
        
        // Visual feedback
        const exportBtn = document.getElementById('export-ranges-btn');
        const originalText = exportBtn.textContent;
        exportBtn.textContent = 'Downloaded!';
        exportBtn.style.background = '#4caf50';
        
        setTimeout(() => {
            exportBtn.textContent = originalText;
            exportBtn.style.background = '';
        }, 2000);
        
    } catch (error) {
        console.error('Error exporting ranges:', error);
        
        // Error feedback
        const exportBtn = document.getElementById('export-ranges-btn');
        const originalText = exportBtn.textContent;
        exportBtn.textContent = 'Export Failed';
        exportBtn.style.background = '#f44336';
        
        setTimeout(() => {
            exportBtn.textContent = originalText;
            exportBtn.style.background = '';
        }, 2000);
    }
}

function importRanges(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Validate import data structure
            if (!importData.ranges && !importData.version) {
                // Assume it's just the ranges object for backward compatibility
                rangeData = importData;
            } else if (importData.ranges) {
                // New format with metadata
                rangeData = importData.ranges;
            } else {
                throw new Error('Invalid file format');
            }
            
            // Save to localStorage
            saveRangeDataToStorage();
            
            // Reload current range if in edit mode
            if (currentPageId === 'edit-ranges-page') {
                loadCurrentRange();
            }
            
            // Update status indicator if import-export page is active
            if (currentPageId === 'import-export-page') {
                updateRangeDataStatus();
            }
            
            console.log('Ranges imported successfully');
            
            // Visual feedback - need to find the import button
            const importBtn = document.querySelector('.settings-btn.secondary');
            if (importBtn) {
                const originalText = importBtn.textContent;
                importBtn.textContent = 'Imported!';
                importBtn.style.background = '#4caf50';
                
                setTimeout(() => {
                    importBtn.textContent = originalText;
                    importBtn.style.background = '';
                }, 2000);
            }
            
        } catch (error) {
            console.error('Error importing ranges:', error);
            
            // Error feedback
            const importBtn = document.querySelector('.settings-btn.secondary');
            if (importBtn) {
                const originalText = importBtn.textContent;
                importBtn.textContent = 'Import Failed';
                importBtn.style.background = '#f44336';
                
                setTimeout(() => {
                    importBtn.textContent = originalText;
                    importBtn.style.background = '';
                }, 2000);
            }
            
            alert('Error importing file: Invalid format or corrupted data');
        }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function generateRandomHand() {
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const suits = ['♠', '♥', '♦', '♣'];
    
    const card1Rank = ranks[Math.floor(Math.random() * ranks.length)];
    const card1Suit = suits[Math.floor(Math.random() * suits.length)];
    const card2Rank = ranks[Math.floor(Math.random() * ranks.length)];
    const card2Suit = suits[Math.floor(Math.random() * suits.length)];
    
    return {
        card1: card1Rank + card1Suit,
        card2: card2Rank + card2Suit
    };
}

// Position management for practice mode
function updateHeroPosition(position) {
    // This would update the table layout based on hero position
    // For now, it's just a placeholder
    console.log(`Hero position changed to: ${position}`);
}

// ==========================================
// RANGE STATUS INDICATOR
// ==========================================

function updateRangeDataStatus() {
    const statusElement = document.getElementById('range-data-status');
    if (!statusElement) return;
    
    const statusIcon = statusElement.querySelector('.status-icon');
    const statusTitle = statusElement.querySelector('.status-title');
    const statusDescription = statusElement.querySelector('.status-description');
    
    // Clear existing status classes
    statusElement.classList.remove('default-ranges', 'custom-ranges', 'no-ranges');
    
    // Check data sources
    const hasDefaultRanges = Object.keys(defaultRanges).length > 0;
    const hasUserRanges = Object.keys(rangeData).length > 0;
    const rangeDataFromDefaults = hasUserRanges && hasDefaultRanges && JSON.stringify(rangeData) === JSON.stringify(defaultRanges);
    
    if (!hasUserRanges && !hasDefaultRanges) {
        // No data at all
        statusElement.classList.add('no-ranges');
        statusIcon.textContent = '❌';
        statusTitle.textContent = 'No Range Data';
        statusDescription.textContent = 'No range data is currently loaded. Default ranges failed to load and no custom ranges exist.';
    } else if (hasUserRanges && !rangeDataFromDefaults) {
        // Custom ranges (user has modified ranges)
        statusElement.classList.add('custom-ranges');
        statusIcon.textContent = '🎯';
        statusTitle.textContent = 'Custom Ranges';
        statusDescription.textContent = `Using custom range data. ${Object.keys(rangeData).length} position matchups configured.`;
    } else {
        // Default ranges
        statusElement.classList.add('default-ranges');
        statusIcon.textContent = '📊';
        statusTitle.textContent = 'Default Ranges';
        statusDescription.textContent = `Using default preflop ranges loaded from ${DEFAULT_RANGES_PATH}. ${Object.keys(defaultRanges).length} matchups available.`;
    }
}

// ==========================================
// PWA SERVICE WORKER REGISTRATION
// ==========================================

function registerServiceWorker() {
    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
        console.log('[PWA] Service Worker support detected');
        
        window.addEventListener('load', async () => {
            try {
                // Add version parameter to force GitHub Pages to serve latest version
                // Update this version number when you want to force cache refresh
                const SW_VERSION = '2.1.0';
                const swUrl = `./sw.js?v=${SW_VERSION}`;
                const registration = await navigator.serviceWorker.register(swUrl, {
                    scope: './'
                });
                
                console.log('[PWA] Service Worker registered successfully:', registration.scope);
                
                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('[PWA] New Service Worker found, installing...');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA] New Service Worker installed, ready to activate');
                            // Optionally show update notification to user
                            showUpdateAvailable(registration);
                        }
                    });
                });
                
                // Listen for controlling service worker changes
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('[PWA] Service Worker controller changed, reloading page...');
                    window.location.reload();
                });
                
            } catch (error) {
                console.warn('[PWA] Service Worker registration failed:', error);
            }
        });
        
        // Handle install prompt for PWA
        window.addEventListener('beforeinstallprompt', (event) => {
            console.log('[PWA] Install prompt available');
            // Prevent the default prompt
            event.preventDefault();
            // Store the event for later use
            window.deferredPrompt = event;
            // Optionally show custom install button
            showInstallButton();
        });
        
        // Handle successful PWA installation
        window.addEventListener('appinstalled', (event) => {
            console.log('[PWA] App successfully installed');
            // Hide install button if shown
            hideInstallButton();
            // Clear the deferred prompt
            window.deferredPrompt = null;
        });
        
    } else {
        console.log('[PWA] Service Workers not supported in this browser');
    }
}

// Enhanced PWA functionality for iOS standalone mode
function enhancePWAForIOS() {
    // Detect if running in standalone mode (iOS PWA)
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    if (isStandalone) {
        console.log('[PWA] Running in standalone mode (iOS PWA)');
        
        // Add specific handling for standalone mode
        document.documentElement.classList.add('pwa-standalone');
        
        // Handle navigation in standalone mode
        document.addEventListener('click', (event) => {
            const target = event.target.closest('a');
            if (target && target.href && target.target !== '_blank') {
                // Prevent default navigation that might cause issues in standalone mode
                const url = new URL(target.href);
                if (url.origin === window.location.origin) {
                    event.preventDefault();
                    
                    // Use history API for in-app navigation
                    if (url.hash) {
                        window.location.hash = url.hash;
                    } else if (url.pathname !== window.location.pathname) {
                        window.location.href = target.href;
                    }
                }
            }
        });
        
        // Handle back navigation in standalone mode
        window.addEventListener('popstate', (event) => {
            console.log('[PWA] Navigation state changed in standalone mode');
        });
    }
}

// Force service worker update for existing installations
function forceServiceWorkerUpdate() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
                console.log('[PWA] Forcing service worker update');
                registration.update();
            });
        });
    }
}

function showUpdateAvailable(registration) {
    // Create a simple notification for updates
    // You can customize this to match your UI
    console.log('[PWA] App update available');
    
    // For now, just log to console. You could show a toast notification here
    if (confirm('A new version of Preflop Builder is available. Update now?')) {
        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }
}

function showInstallButton() {
    // Show install button - you can customize this for your UI
    console.log('[PWA] Install button should be shown');
    
    // Example: You could add an install button to your header
    // For now, we'll just log that the option is available
    console.log('[PWA] User can install this app to their home screen');
}

function hideInstallButton() {
    // Hide install button after successful installation
    console.log('[PWA] Install button should be hidden');
}

// Utility function to manually trigger app install
function installPWA() {
    if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        window.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('[PWA] User accepted the install prompt');
            } else {
                console.log('[PWA] User dismissed the install prompt');
            }
            window.deferredPrompt = null;
        });
    }
}

// Check if app is running in standalone mode (installed PWA)
function isRunningStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}

// Initialize PWA features
function initializePWAFeatures() {
    if (isRunningStandalone()) {
        console.log('[PWA] App is running in standalone mode');
        document.body.classList.add('pwa-standalone');
    } else {
        console.log('[PWA] App is running in browser mode');
        document.body.classList.add('pwa-browser');
    }
}

// Call PWA initialization
document.addEventListener('DOMContentLoaded', () => {
    initializePWAFeatures();
    
    // Enhanced PWA functionality for iOS
    enhancePWAForIOS();
    
    // Force service worker update for existing installations
    forceServiceWorkerUpdate();
});

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});
