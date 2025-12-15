// ==========================================
// POKI AI - Hugging Face Integration
// Version 1.2.0
// ==========================================

var POKI_AI_CONFIG = {
    // Using HuggingFace's OpenAI-compatible endpoint with fast model selection
    model: 'Qwen/Qwen2.5-Coder-32B-Instruct:fastest',
    apiUrl: 'https://router.huggingface.co/v1/chat/completions',
    // Use local responses only (no API calls) - set to true for reliable offline operation
    useLocalOnly: true,
    // Alternative CORS proxies to try if direct fails
    corsProxies: [
        '', // Try direct first
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://cors.sh/?'
    ],
    debug: false // Set to false for production
};

var POKI_SYSTEM_PROMPT = 'You are Poki, a friendly poker coach. Answer short and helpful.';

// Comprehensive smart poker responses - works offline!
var POKER_RESPONSES = {
    // Position-related
    position: [
        "Position is EVERYTHING in poker! 🎯 Play tight from early positions (UTG, MP), and loosen up on the Button and Cutoff. The button is the most profitable seat because you act last post-flop!",
        "Think of position like information. Late position = more info = better decisions. From the button, you can see how everyone else acts before deciding!"
    ],
    button: [
        "The button is the best seat at the table! 🔥 You act last on every post-flop street. From here you can open 40-50% of hands and steal blinds profitably.",
        "Love the button! It's where pros make most of their money. You have maximum information and can control the pot size perfectly."
    ],
    blinds: [
        "The blinds are tough spots - you're forced to put money in with random hands AND you're out of position. Defend your big blind with a wider range, but be selective from small blind.",
        "Small blind is the worst position - you're OOP vs everyone. Big blind is better since you close the action preflop and get good pot odds to defend."
    ],
    
    // Ranges
    range: [
        "Ranges vary by position! 📊 UTG: ~15% (big pairs, AK-AJ, KQs). Button: ~40% (add suited connectors, suited aces, broadway). BB defense: ~40% vs a button open.",
        "Starting hand ranges are your foundation. Tight from early position (less than 15% of hands), wider from late position (35-50% from button)."
    ],
    
    // Specific hands
    aces: [
        "Pocket Aces - the best starting hand! 🚀 Always raise preflop. Don't slowplay too often - you want to build a pot. Be okay with getting it in preflop!",
        "AA is bullet-proof preflop but remember: it's still just one pair. After the flop, evaluate the board and your opponent's actions carefully."
    ],
    kings: [
        "Pocket Kings are monsters! 👑 Raise and 3-bet aggressively. The main worry is an Ace on the flop - but even then, don't automatically give up.",
        "KK is the second-best hand. Play it aggressively preflop. If an Ace hits, look for signs of strength from your opponent before continuing."
    ],
    queens: [
        "Pocket Queens are strong but tricky! 👸 Great hand to 3-bet. Be cautious when facing 4-bets - sometimes you're up against AA/KK.",
        "QQ is premium but vulnerable. Raise, 3-bet, but consider the action. Against a tight player's 4-bet, folding is sometimes correct."
    ],
    suited: [
        "Suited hands are ~3-4% more valuable than offsuit. The flush potential adds nice equity. Suited connectors (like 76s, 98s) play great in position!",
        "Suited connectors are fun hands! ♠️ They make straights and flushes, which are easy to play. Best played in position with deep stacks."
    ],
    
    // Actions
    raise: [
        "Raising builds the pot with strong hands and puts pressure on opponents. Standard open raise is 2.5-3x the big blind. Raise for value OR as a bluff!",
        "Why raise? 1) Get value from worse hands 2) Deny equity to drawing hands 3) Take down the pot now. Pick your reason before raising!"
    ],
    fold: [
        "Folding is a skill! ✋ If you're beat, save your chips for better spots. One of the biggest leaks is calling too much - tight is right!",
        "Don't be afraid to fold. Even pros fold most of their hands. Discipline and patience win long-term."
    ],
    bluff: [
        "Bluffing works best when: 1) The board favors YOUR range 2) You block their strong hands 3) They seem weak. Don't bluff calling stations!",
        "Good bluffs tell a believable story. Your betting pattern should represent a strong hand. Pick the right spots against the right opponents! 🎭"
    ],
    bet: [
        "Bet sizing matters! Small bets (25-33% pot) on dry boards, larger bets (66-100% pot) on wet boards or for value. Make opponents pay to draw!",
        "Why bet? For value (they'll call with worse) or as a bluff (they'll fold better). Know your reason before putting chips in!"
    ],
    call: [
        "Calling is often the weakest action - you don't win the pot immediately and don't build it. But it's right when you have a medium-strength hand or good odds to draw.",
        "Think about pot odds before calling. If you need 25% equity to call and your draw has 30%, it's profitable long-term!"
    ],
    check: [
        "Checking can be deceptive! Check with monsters to trap, check weak hands to control pot size, or check to induce bluffs from aggressive opponents.",
        "Don't always bet when you can check. Some hands play better as check-calls or check-raises!"
    ],
    
    // Strategy concepts
    pot_odds: [
        "Pot odds = what you need to call vs what you can win. If the pot is 100 and you must call 25, you're getting 4:1. You need 20% equity to break even!",
        "Quick pot odds math: divide your call by the total pot after calling. That's the equity you need to call profitably. 🧮"
    ],
    equity: [
        "Equity is your share of the pot based on your winning chances. AA vs KK is 80/20 - Aces have 80% equity. Think in percentages, not feelings!",
        "Hand equity changes on every street. A flush draw has ~35% equity on the flop vs an overpair. Know your numbers!"
    ],
    variance: [
        "Variance is the natural swings in poker. Even with perfect play, you'll have losing sessions. Focus on making good decisions, not results! 📈📉",
        "Bad beats happen! That's variance. If you played the hand correctly, don't stress. Long-term, good decisions = good results."
    ],
    tilt: [
        "Tilt destroys bankrolls! 😤 When you feel frustrated, take a break. Deep breaths. Remember: each hand is independent. Stay focused on good decisions.",
        "Recognize your tilt triggers. Lost a big pot? Take 5 minutes. Playing tired? Stop for the day. Emotional control is a skill!"
    ],
    bankroll: [
        "Bankroll management is crucial! Have 20-30 buy-ins for cash games, 50-100 for tournaments. Never risk money you can't afford to lose.",
        "Protect your bankroll like a business asset. Move down in stakes when running bad. Don't chase losses by playing higher! 💰"
    ],
    
    // Game types
    tournament: [
        "Tournament strategy changes with stack depth! Early: play tight, accumulate chips. Middle: open up, steal blinds. Late: ICM pressure, survival matters!",
        "In tournaments, preserving chips is key. One bad decision can end your tournament. Be patient and wait for good spots! 🏆"
    ],
    cash: [
        "Cash games = deep stacks usually. You can reload if you lose. Focus on maximizing expected value every decision. No ICM pressure!",
        "Cash game tip: be willing to reload and play your A-game. Leave when tired. The game will always be there tomorrow."
    ],
    
    // Greetings and misc
    hello: [
        "Hey there! 👋 I'm Poki, your poker coach! Ask me about hands, positions, strategy - anything poker! What's on your mind?",
        "Hi! Ready to talk poker? I can help with preflop ranges, position play, bet sizing, and more! Fire away! 🃏"
    ],
    thanks: [
        "You're welcome! 😊 Good luck at the tables! Remember: patience, position, and discipline win long-term!",
        "Happy to help! Keep grinding and trust the process. See you at the final table! 🏆"
    ],
    help: [
        "I can help with: 📚 Position play, starting hand ranges, bet sizing, pot odds, bluffing, tournament strategy, tilt control, and more! Just ask!",
        "Ask me anything about poker! Examples: 'What hands to play from UTG?', 'How to bluff?', 'What are pot odds?' I'm here to help! 🎓"
    ]
};

// Default responses for unmatched queries
var DEFAULT_RESPONSES = [
    "Great question! 🤔 In poker, context matters a lot. Consider your position, stack sizes, and opponent tendencies. Want me to explain any of these?",
    "That's a good thought! Generally: play tight from early position, loosen up in late position, and always think about what your opponent might have. What specific situation are you in?",
    "Interesting! Every poker decision comes down to: is this profitable long-term? Think about pot odds, your equity, and opponent tendencies. Need help with any of these concepts?"
];

function getRandomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getSmartFallback(userMessage) {
    var msg = userMessage.toLowerCase();
    
    // Check each topic for matches
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('hola')) {
        return getRandomFromArray(POKER_RESPONSES.hello);
    }
    if (msg.includes('thank') || msg.includes('gracias')) {
        return getRandomFromArray(POKER_RESPONSES.thanks);
    }
    if (msg.includes('help') || msg.includes('what can you') || msg.includes('ayuda')) {
        return getRandomFromArray(POKER_RESPONSES.help);
    }
    
    // Position topics
    if (msg.includes('button') || msg.includes('btn') || msg.includes('dealer')) {
        return getRandomFromArray(POKER_RESPONSES.button);
    }
    if (msg.includes('blind') || msg.includes('sb') || msg.includes('bb')) {
        return getRandomFromArray(POKER_RESPONSES.blinds);
    }
    if (msg.includes('position') || msg.includes('seat') || msg.includes('utg') || msg.includes('cutoff') || msg.includes('co')) {
        return getRandomFromArray(POKER_RESPONSES.position);
    }
    
    // Specific hands
    if (msg.includes('aces') || msg.includes('aa') || msg.includes('pocket aces') || msg.includes('bullets')) {
        return getRandomFromArray(POKER_RESPONSES.aces);
    }
    if (msg.includes('kings') || msg.includes('kk') || msg.includes('pocket kings') || msg.includes('cowboys')) {
        return getRandomFromArray(POKER_RESPONSES.kings);
    }
    if (msg.includes('queens') || msg.includes('qq') || msg.includes('pocket queens') || msg.includes('ladies')) {
        return getRandomFromArray(POKER_RESPONSES.queens);
    }
    if (msg.includes('suited') || msg.includes('connector') || msg.includes('flush draw')) {
        return getRandomFromArray(POKER_RESPONSES.suited);
    }
    
    // Actions
    if (msg.includes('raise') || msg.includes('open') || msg.includes('3bet') || msg.includes('3-bet')) {
        return getRandomFromArray(POKER_RESPONSES.raise);
    }
    if (msg.includes('fold') || msg.includes('muck')) {
        return getRandomFromArray(POKER_RESPONSES.fold);
    }
    if (msg.includes('bluff') || msg.includes('bluffing') || msg.includes('represent')) {
        return getRandomFromArray(POKER_RESPONSES.bluff);
    }
    if (msg.includes('bet') || msg.includes('sizing') || msg.includes('how much')) {
        return getRandomFromArray(POKER_RESPONSES.bet);
    }
    if (msg.includes('call') || msg.includes('calling')) {
        return getRandomFromArray(POKER_RESPONSES.call);
    }
    if (msg.includes('check') || msg.includes('checking')) {
        return getRandomFromArray(POKER_RESPONSES.check);
    }
    
    // Strategy concepts
    if (msg.includes('pot odds') || msg.includes('odds')) {
        return getRandomFromArray(POKER_RESPONSES.pot_odds);
    }
    if (msg.includes('equity') || msg.includes('percentage') || msg.includes('chance')) {
        return getRandomFromArray(POKER_RESPONSES.equity);
    }
    if (msg.includes('variance') || msg.includes('luck') || msg.includes('bad beat') || msg.includes('unlucky')) {
        return getRandomFromArray(POKER_RESPONSES.variance);
    }
    if (msg.includes('tilt') || msg.includes('angry') || msg.includes('frustrated') || msg.includes('emotional')) {
        return getRandomFromArray(POKER_RESPONSES.tilt);
    }
    if (msg.includes('bankroll') || msg.includes('money management') || msg.includes('stakes')) {
        return getRandomFromArray(POKER_RESPONSES.bankroll);
    }
    
    // Game types
    if (msg.includes('tournament') || msg.includes('tourney') || msg.includes('mtt') || msg.includes('sng')) {
        return getRandomFromArray(POKER_RESPONSES.tournament);
    }
    if (msg.includes('cash') || msg.includes('ring') || msg.includes('cash game')) {
        return getRandomFromArray(POKER_RESPONSES.cash);
    }
    
    // Ranges
    if (msg.includes('range') || msg.includes('hand') || msg.includes('start') || msg.includes('play')) {
        return getRandomFromArray(POKER_RESPONSES.range);
    }
    
    // Default response
    return getRandomFromArray(DEFAULT_RESPONSES);
}

function cleanResponse(text) {
    if (!text) return '';
    return text.trim();
}

function debugLog() {
    if (POKI_AI_CONFIG.debug) {
        console.log.apply(console, ['[Poki AI Debug]'].concat(Array.prototype.slice.call(arguments)));
    }
}

function formatMessagesForModel(messages) {
    // T5 is a text-to-text model, not a chat model.
    // We'll format it as a simple instruction + context.
    var lastUserMessage = '';
    for (var i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
            lastUserMessage = messages[i].content;
            break;
        }
    }
    
    // Better prompt for poker advice
    return 'You are a poker coach. Give a short helpful answer: ' + lastUserMessage;
}

async function tryFetchWithProxy(proxyUrl, fullUrl, options) {
    var url = proxyUrl ? proxyUrl + encodeURIComponent(fullUrl) : fullUrl;
    debugLog('Trying URL:', url);
    
    var response = await fetch(url, options);
    debugLog('Response status:', response.status);
    return response;
}

async function sendToPokiAI(userMessage, chatHistory) {
    chatHistory = chatHistory || [];
    
    debugLog('sendToPokiAI called with:', userMessage);
    debugLog('Chat history length:', chatHistory.length);
    
    // Use local responses for reliable offline operation
    if (POKI_AI_CONFIG.useLocalOnly) {
        debugLog('Using local responses (useLocalOnly=true)');
        // Add small delay to feel more natural
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
        return getSmartFallback(userMessage);
    }
    
    try {
        var messages = [{ role: 'system', content: POKI_SYSTEM_PROMPT }];
        
        var recentHistory = chatHistory.slice(-8);
        for (var i = 0; i < recentHistory.length; i++) {
            var msg = recentHistory[i];
            messages.push({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            });
        }
        
        messages.push({ role: 'user', content: userMessage });
        
        debugLog('Messages:', messages);
        
        // OpenAI-compatible chat format
        var requestBody = {
            model: POKI_AI_CONFIG.model,
            messages: messages,
            max_tokens: 150,
            temperature: 0.7
        };
        
        var fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        };
        
        // Note: API token removed - using local responses only
        
        debugLog('Request body:', requestBody);
        
        var response = null;
        var lastError = null;
        
        // Try each proxy option
        for (var p = 0; p < POKI_AI_CONFIG.corsProxies.length; p++) {
            var proxy = POKI_AI_CONFIG.corsProxies[p];
            try {
                debugLog('Attempting with proxy index:', p, proxy || '(direct)');
                response = await tryFetchWithProxy(proxy, POKI_AI_CONFIG.apiUrl, fetchOptions);
                
                if (response.ok) {
                    debugLog('Success with proxy index:', p);
                    break;
                } else {
                    var errorText = await response.text();
                    debugLog('Failed with status:', response.status, 'body:', errorText);
                    lastError = 'Status ' + response.status + ': ' + errorText;
                    response = null;
                }
            } catch (proxyError) {
                debugLog('Proxy error:', proxyError.message);
                lastError = proxyError.message;
                response = null;
            }
        }
        
        if (!response || !response.ok) {
            console.error('[Poki AI] All proxies failed. Last error:', lastError);
            // Return smart fallback instead of generic error
            return getSmartFallback(userMessage);
        }
        
        var data = await response.json();
        debugLog('Response data:', data);
        
        var generatedText = '';
        // OpenAI-compatible chat format
        if (data.choices && data.choices[0] && data.choices[0].message) {
            generatedText = data.choices[0].message.content;
        }
        // Legacy format fallback
        else if (Array.isArray(data) && data[0] && data[0].generated_text) {
            generatedText = data[0].generated_text;
        } else if (data.generated_text) {
            generatedText = data.generated_text;
        } else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
            generatedText = data[0];
        } else {
            debugLog('Unexpected response format:', data);
            return getSmartFallback(userMessage);
        }
        
        generatedText = cleanResponse(generatedText);
        debugLog('Cleaned response:', generatedText);
        
        // If the model returns empty or very short response, use fallback
        if (!generatedText || generatedText.length < 10) {
            return getSmartFallback(userMessage);
        }
        
        return generatedText;
        
    } catch (error) {
        console.error('[Poki AI] Error:', error);
        debugLog('Full error:', error.stack || error);
        return getSmartFallback(userMessage);
    }
}

// Test function to verify API connectivity
async function testPokiAI() {
    console.log('[Poki AI] Running connectivity test...');
    console.log('[Poki AI] Config:', {
        model: POKI_AI_CONFIG.model,
        apiUrl: POKI_AI_CONFIG.apiUrl,
        useLocalOnly: POKI_AI_CONFIG.useLocalOnly
    });
    
    var result = await sendToPokiAI('What is a good opening hand in poker?');
    console.log('[Poki AI] Test result:', result);
    return result;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.sendToPokiAI = sendToPokiAI;
    window.testPokiAI = testPokiAI;
    window.POKI_AI_CONFIG = POKI_AI_CONFIG;
}

console.log('[Poki AI] Module loaded - v1.2.0');
console.log('[Poki AI] Run testPokiAI() in console to test connectivity');
