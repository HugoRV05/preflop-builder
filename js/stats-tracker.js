// ==========================================
// STATS TRACKER FOR PREFLOP ASSISTANT
// Version 1.0.0 - Session statistics and feedback
// ==========================================

/**
 * Session statistics tracker
 * Records correct/wrong decisions by position and hand category
 */
const sessionStats = {
    byPosition: {
        MP: { correct: 0, wrong: 0 },
        CO: { correct: 0, wrong: 0 },
        BU: { correct: 0, wrong: 0 },
        SB: { correct: 0, wrong: 0 },
        BB: { correct: 0, wrong: 0 }
    },
    byCategory: {
        pocket_pair: { correct: 0, wrong: 0 },
        suited_broadway: { correct: 0, wrong: 0 },
        offsuit_broadway: { correct: 0, wrong: 0 },
        suited_connector: { correct: 0, wrong: 0 },
        suited_gapper: { correct: 0, wrong: 0 },
        suited_ace: { correct: 0, wrong: 0 },
        offsuit_ace: { correct: 0, wrong: 0 },
        suited_king: { correct: 0, wrong: 0 },
        trash: { correct: 0, wrong: 0 }
    },
    totalHands: 0,
    totalCorrect: 0,
    sessionStartTime: null
};

// ==========================================
// FEEDBACK TEMPLATES
// ==========================================

/**
 * Positive feedback templates for positions
 */
const positionSuccessTemplates = [
    "Nice! You're crushing {position} spots. Keep it up! 💪",
    "Strong play from {position}! You really know this position.",
    "{position} is your playground today. Great read!",
    "You rarely miss from {position}. Solid fundamentals!"
];

/**
 * Negative feedback templates for positions
 */
const positionStruggleTemplates = [
    "You're finding {position} tricky today. Consider tightening up.",
    "{position} seems challenging. Review the ranges for this spot.",
    "Struggling from {position}? Focus on the core opens here.",
    "Take a breath. {position} spots take practice to master."
];

/**
 * Positive feedback templates for hand categories
 */
const categorySuccessTemplates = [
    "You're nailing {category}! These hands are second nature to you.",
    "Great instincts with {category}. You know when to play them.",
    "{category} = easy money for you today!",
    "Solid reads on {category}. Your range knowledge is paying off."
];

/**
 * Negative feedback templates for hand categories
 */
const categoryStruggleTemplates = [
    "Watch your {category} plays. Consider your position more carefully.",
    "{category} is costing you today. Remember: context matters!",
    "You're overplaying {category}. Tighten up in early positions.",
    "{category} tripping you up? Focus on when these hands are profitable."
];

/**
 * Neutral/Encouraging templates
 */
const neutralTemplates = [
    "Keep grinding! Every hand is practice.",
    "Focus on the process, not just results.",
    "Good awareness. Stay in the zone!",
    "You're building solid habits. Keep going!"
];

// ==========================================
// CORE FUNCTIONS
// ==========================================

/**
 * Record a hand result
 * @param {string} position - MP, CO, BU, SB, BB
 * @param {string} category - Hand category from rule-engine
 * @param {boolean} isCorrect - Whether the decision was correct
 */
function recordResult(position, category, isCorrect) {
    // Initialize session start if needed
    if (!sessionStats.sessionStartTime) {
        sessionStats.sessionStartTime = Date.now();
    }
    
    // Update totals
    sessionStats.totalHands++;
    if (isCorrect) sessionStats.totalCorrect++;
    
    // Update position stats
    if (sessionStats.byPosition[position]) {
        if (isCorrect) {
            sessionStats.byPosition[position].correct++;
        } else {
            sessionStats.byPosition[position].wrong++;
        }
    }
    
    // Update category stats
    if (sessionStats.byCategory[category]) {
        if (isCorrect) {
            sessionStats.byCategory[category].correct++;
        } else {
            sessionStats.byCategory[category].wrong++;
        }
    }
    
    console.log(`[Stats] Recorded: ${position}/${category} = ${isCorrect ? 'correct' : 'wrong'}`);
}

/**
 * Generate contextual feedback after a hand
 * @param {string} position - Position played
 * @param {string} category - Hand category
 * @param {boolean} isCorrect - Whether correct
 * @returns {object} - { message, type, stat }
 */
function generateFeedback(position, category, isCorrect) {
    const posStats = sessionStats.byPosition[position] || { correct: 0, wrong: 0 };
    const catStats = sessionStats.byCategory[category] || { correct: 0, wrong: 0 };
    
    // Calculate accuracy rates
    const posTotal = posStats.correct + posStats.wrong;
    const catTotal = catStats.correct + catStats.wrong;
    const posAccuracy = posTotal > 0 ? posStats.correct / posTotal : 0;
    const catAccuracy = catTotal > 0 ? catStats.correct / catTotal : 0;
    
    // Need minimum samples for meaningful feedback
    const minSamples = 3;
    
    let message = '';
    let type = 'neutral';
    let stat = null;
    
    // Prioritize position-based feedback if enough data
    if (posTotal >= minSamples) {
        if (posAccuracy >= 0.7 && isCorrect) {
            message = getRandomTemplate(positionSuccessTemplates, position);
            type = 'success';
            stat = { label: position, value: Math.round(posAccuracy * 100) + '%' };
        } else if (posAccuracy < 0.5 && !isCorrect) {
            message = getRandomTemplate(positionStruggleTemplates, position);
            type = 'warning';
            stat = { label: position, value: Math.round(posAccuracy * 100) + '%' };
        }
    }
    
    // Try category-based feedback if no position feedback
    if (!message && catTotal >= minSamples) {
        const categoryName = formatCategoryForFeedback(category);
        if (catAccuracy >= 0.7 && isCorrect) {
            message = getRandomTemplate(categorySuccessTemplates, categoryName);
            type = 'success';
            stat = { label: categoryName, value: Math.round(catAccuracy * 100) + '%' };
        } else if (catAccuracy < 0.5 && !isCorrect) {
            message = getRandomTemplate(categoryStruggleTemplates, categoryName);
            type = 'warning';
            stat = { label: categoryName, value: Math.round(catAccuracy * 100) + '%' };
        }
    }
    
    // Default to neutral if nothing specific
    if (!message) {
        message = getRandomTemplate(neutralTemplates);
        type = 'neutral';
    }
    
    return { message, type, stat };
}

/**
 * Get random template and replace placeholder
 * @param {Array} templates - Array of template strings
 * @param {string} replacement - Value to replace {position} or {category}
 * @returns {string} - Formatted message
 */
function getRandomTemplate(templates, replacement = '') {
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace(/{position}|{category}/g, replacement);
}

/**
 * Format category name for feedback display
 * @param {string} category - Internal category name
 * @returns {string} - User-friendly name
 */
function formatCategoryForFeedback(category) {
    const names = {
        pocket_pair: 'pocket pairs',
        suited_broadway: 'suited broadways',
        offsuit_broadway: 'offsuit broadways',
        suited_connector: 'suited connectors',
        suited_gapper: 'suited gappers',
        suited_ace: 'suited aces',
        offsuit_ace: 'offsuit aces',
        suited_king: 'suited kings',
        trash: 'marginal hands'
    };
    return names[category] || category;
}

/**
 * Get current session statistics
 * @returns {object} - Session stats summary
 */
function getSessionStats() {
    const accuracy = sessionStats.totalHands > 0 
        ? Math.round((sessionStats.totalCorrect / sessionStats.totalHands) * 100) 
        : 0;
    
    // Find weakest position
    let weakestPosition = null;
    let lowestPosAccuracy = 1;
    for (const [pos, stats] of Object.entries(sessionStats.byPosition)) {
        const total = stats.correct + stats.wrong;
        if (total >= 3) {
            const acc = stats.correct / total;
            if (acc < lowestPosAccuracy) {
                lowestPosAccuracy = acc;
                weakestPosition = pos;
            }
        }
    }
    
    // Find weakest category
    let weakestCategory = null;
    let lowestCatAccuracy = 1;
    for (const [cat, stats] of Object.entries(sessionStats.byCategory)) {
        const total = stats.correct + stats.wrong;
        if (total >= 3) {
            const acc = stats.correct / total;
            if (acc < lowestCatAccuracy) {
                lowestCatAccuracy = acc;
                weakestCategory = cat;
            }
        }
    }
    
    return {
        totalHands: sessionStats.totalHands,
        totalCorrect: sessionStats.totalCorrect,
        accuracy,
        weakestPosition,
        weakestPositionAccuracy: Math.round(lowestPosAccuracy * 100),
        weakestCategory,
        weakestCategoryAccuracy: Math.round(lowestCatAccuracy * 100),
        byPosition: { ...sessionStats.byPosition },
        byCategory: { ...sessionStats.byCategory }
    };
}

/**
 * Reset session statistics
 */
function resetSession() {
    sessionStats.totalHands = 0;
    sessionStats.totalCorrect = 0;
    sessionStats.sessionStartTime = null;
    
    for (const pos of Object.keys(sessionStats.byPosition)) {
        sessionStats.byPosition[pos] = { correct: 0, wrong: 0 };
    }
    
    for (const cat of Object.keys(sessionStats.byCategory)) {
        sessionStats.byCategory[cat] = { correct: 0, wrong: 0 };
    }
    
    console.log('[Stats] Session reset');
}

// ==========================================
// EXPORTS
// ==========================================

if (typeof window !== 'undefined') {
    window.StatsTracker = {
        recordResult,
        generateFeedback,
        getSessionStats,
        resetSession,
        sessionStats
    };
}
