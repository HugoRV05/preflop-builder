// ==========================================
// RULE ENGINE FOR PREFLOP ASSISTANT
// Version 1.0.0 - Position and hand category hints
// ==========================================

/**
 * Hand category definitions
 * Used to classify any poker hand into a strategic category
 */
const HAND_CATEGORIES = {
    POCKET_PAIR: 'pocket_pair',
    SUITED_BROADWAY: 'suited_broadway',
    OFFSUIT_BROADWAY: 'offsuit_broadway',
    SUITED_CONNECTOR: 'suited_connector',
    SUITED_GAPPER: 'suited_gapper',
    SUITED_ACE: 'suited_ace',
    OFFSUIT_ACE: 'offsuit_ace',
    SUITED_KING: 'suited_king',
    TRASH: 'trash'
};

/**
 * Position-specific hints for each hand category
 * These are educational tips, NOT prescriptive ranges
 */
const positionHints = {
    MP: {
        pocket_pair: "From MP, open pocket pairs 55+. Premium pairs (QQ+) can stack off vs 3-bets in most lineups.",
        suited_broadway: "AKs-AJs and KQs are standard opens. KJs/QJs are marginal - consider table dynamics.",
        offsuit_broadway: "AKo/AQo are opens. AJo and KQo depend on table - tighter in tough games.",
        suited_connector: "Most suited connectors are folds from MP. 98s+ might work in soft games.",
        suited_gapper: "Suited gappers are generally too weak for MP. Save them for later positions.",
        suited_ace: "A5s-A2s have blockers and nut potential. A5s/A4s are borderline opens.",
        offsuit_ace: "Offsuit aces weaker than AT are folds from MP.",
        suited_king: "K9s and worse are folds. KTs is marginal depending on lineup.",
        trash: "Fold these hands from MP. The blinds aren't worth the risk."
    },
    CO: {
        pocket_pair: "Open all pocket pairs from CO. Small pairs (22-44) can be opened or folded depending on action.",
        suited_broadway: "Open all suited broadways from CO. These hands play well postflop.",
        offsuit_broadway: "AKo-ATo and KQo-KJo are opens. QJo is borderline.",
        suited_connector: "Open 54s+ from CO. These have good playability when in position.",
        suited_gapper: "Suited one-gappers like 86s/97s become opens from CO.",
        suited_ace: "All suited aces become opens from CO. Great for nut flush potential.",
        offsuit_ace: "A9o+ are opens. A8o and below are marginal.",
        suited_king: "K8s+ are opens from CO. Nice blocker hands.",
        trash: "Even from CO, avoid pure trash. You still face 3 players behind."
    },
    BU: {
        pocket_pair: "Open 100% of pocket pairs from BTN. Even 22 has value vs the blinds.",
        suited_broadway: "Open all suited broadways. Premium hands in this position.",
        offsuit_broadway: "Open all broadway combos from BTN. Position compensates for weaker holdings.",
        suited_connector: "Open 32s+ from BTN. Position makes these very profitable.",
        suited_gapper: "Open all playable gappers. 85s/96s etc. become profitable here.",
        suited_ace: "Open all suited aces. These are auto-opens from BTN.",
        offsuit_ace: "A2o-A9o become opens. Position is everything.",
        suited_king: "K2s+ are opens from BTN in most games.",
        trash: "Even pure trash can be opened vs weak/passive blinds. Use reads."
    },
    SB: {
        pocket_pair: "From SB, open pocket pairs for value or complete. 22-55 can go either way.",
        suited_broadway: "Open or complete all suited broadways. Raising often preferred vs weak BB.",
        offsuit_broadway: "AKo-ATo and broadway combos are opens. Some prefer limping to see flop cheap.",
        suited_connector: "Suited connectors can open or complete. Consider BB's tendencies.",
        suited_gapper: "Borderline hands - can complete or fold depending on BB aggression.",
        suited_ace: "Suited aces good for opens. Nut potential valuable headsup.",
        offsuit_ace: "Weaker aces can complete. A5o-A2o have some blocker value.",
        suited_king: "K7s+ reasonable opens. Weaker kings can complete.",
        trash: "Can complete trash vs passive BB, but generally fold vs aggressive opponents."
    },
    BB: {
        pocket_pair: "Defend all pocket pairs vs opens. 3-bet JJ+ for value, TT/99 is player-dependent.",
        suited_broadway: "Defend all suited broadways. 3-bet AKs/KQs for value.",
        offsuit_broadway: "Defend broadway combos. AKo/KQo can 3-bet or call based on opponent.",
        suited_connector: "Great defends from BB. Call to set-mine or 3-bet as a bluff.",
        suited_gapper: "Solid calls vs wide openers. Fold vs tight EP opens.",
        suited_ace: "Defend all suited aces. A5s/A4s can 3-bet as bluffs.",
        offsuit_ace: "Call weaker aces vs LP opens. Fold vs EP.",
        suited_king: "K8s+ are defends vs most opens.",
        trash: "Even from BB, some hands are too weak. Fold worst combos vs EP opens."
    }
};

/**
 * General tips that apply regardless of specific hand
 */
const generalTips = {
    MP: "Middle Position is the tightest opening spot. Quality over quantity here.",
    CO: "Cutoff opens wider than MP but still respects the BTN behind.",
    BU: "Button is the best position. Maximum aggression, maximum profit.",
    SB: "Small Blind is tricky - worst postflop position. Raise or fold, avoid limping weak.",
    BB: "Big Blind is about defending correctly. Don't over-defend vs tight ranges."
};

// ==========================================
// HAND CATEGORIZATION FUNCTIONS
// ==========================================

/**
 * Categorize a poker hand into a strategic category
 * @param {string} hand - Hand notation like "AKs", "77", "T9o"
 * @returns {string} - Category from HAND_CATEGORIES
 */
function categorizeHand(hand) {
    if (!hand || hand.length < 2) return HAND_CATEGORIES.TRASH;
    
    // Normalize hand
    const normalized = hand.toUpperCase().trim();
    
    // Extract components
    const card1 = normalized[0];
    const card2 = normalized[1];
    const suited = normalized.includes('S') || normalized.length === 2;
    
    // Rank order for comparison
    const ranks = 'AKQJT98765432';
    const rank1 = ranks.indexOf(card1);
    const rank2 = ranks.indexOf(card2);
    
    // Invalid cards
    if (rank1 === -1 || rank2 === -1) return HAND_CATEGORIES.TRASH;
    
    // Pocket pair
    if (card1 === card2) {
        return HAND_CATEGORIES.POCKET_PAIR;
    }
    
    // Broadway definition (T+)
    const isBroadway1 = rank1 <= 4; // A, K, Q, J, T
    const isBroadway2 = rank2 <= 4;
    
    // Suited vs offsuit
    const isSuited = normalized.includes('S');
    
    // Suited Broadway
    if (isBroadway1 && isBroadway2 && isSuited) {
        return HAND_CATEGORIES.SUITED_BROADWAY;
    }
    
    // Offsuit Broadway
    if (isBroadway1 && isBroadway2 && !isSuited) {
        return HAND_CATEGORIES.OFFSUIT_BROADWAY;
    }
    
    // Suited Ace
    if (card1 === 'A' && isSuited) {
        return HAND_CATEGORIES.SUITED_ACE;
    }
    
    // Offsuit Ace
    if (card1 === 'A' && !isSuited) {
        return HAND_CATEGORIES.OFFSUIT_ACE;
    }
    
    // Suited King (non-broadway)
    if (card1 === 'K' && isSuited) {
        return HAND_CATEGORIES.SUITED_KING;
    }
    
    // Connected (gap of 1)
    const gap = Math.abs(rank1 - rank2);
    
    if (gap === 1 && isSuited) {
        return HAND_CATEGORIES.SUITED_CONNECTOR;
    }
    
    if (gap === 2 && isSuited) {
        return HAND_CATEGORIES.SUITED_GAPPER;
    }
    
    // Everything else
    return HAND_CATEGORIES.TRASH;
}

/**
 * Get a contextual hint for a position + hand combination
 * @param {string} position - MP, CO, BU, SB, BB
 * @param {string} hand - Hand notation like "AKs"
 * @returns {object} - { hint, category, generalTip }
 */
function getHint(position, hand) {
    const category = categorizeHand(hand);
    const posHints = positionHints[position] || positionHints.BU;
    const hint = posHints[category] || "No specific advice for this hand type.";
    const generalTip = generalTips[position] || "";
    
    return {
        hint,
        category,
        categoryName: formatCategoryName(category),
        generalTip,
        position
    };
}

/**
 * Get a hint based on hand category only (no specific hand)
 * @param {string} position - MP, CO, BU, SB, BB
 * @param {string} category - Category from HAND_CATEGORIES
 * @returns {string} - Hint text
 */
function getHintByCategory(position, category) {
    const posHints = positionHints[position] || positionHints.BU;
    return posHints[category] || "No specific advice for this hand type.";
}

/**
 * Format category name for display
 * @param {string} category - Internal category name
 * @returns {string} - Human-readable name
 */
function formatCategoryName(category) {
    const names = {
        pocket_pair: 'Pocket Pair',
        suited_broadway: 'Suited Broadway',
        offsuit_broadway: 'Offsuit Broadway',
        suited_connector: 'Suited Connector',
        suited_gapper: 'Suited Gapper',
        suited_ace: 'Suited Ace',
        offsuit_ace: 'Offsuit Ace',
        suited_king: 'Suited King',
        trash: 'Marginal Hand'
    };
    return names[category] || 'Unknown';
}

/**
 * Get all available categories
 * @returns {object} - HAND_CATEGORIES constant
 */
function getCategories() {
    return HAND_CATEGORIES;
}

// ==========================================
// EXPORTS
// ==========================================

if (typeof window !== 'undefined') {
    window.RuleEngine = {
        categorizeHand,
        getHint,
        getHintByCategory,
        formatCategoryName,
        getCategories,
        HAND_CATEGORIES,
        positionHints,
        generalTips
    };
}
