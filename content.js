console.log("Refyne content script loaded");

// Create a single initialization function that loads all features
function initRefyne() {
  // Initialize all features in a non-blocking way
  setTimeout(() => {
    try {
      initCoreFeatures();
    } catch (error) {
      console.error("Refyne core features initialization failed:", error);
    }
  }, 10);
  
  // Initialize UI features after a longer delay
  setTimeout(() => {
    try {
      initUIFeatures();
    } catch (error) {
      console.error("Refyne UI features initialization failed:", error);
    }
  }, 50);
}

// Initialize core features (grammar checking, text expansion, etc.)
async function initCoreFeatures() {
  console.log("Initializing Refyne core features...");
  
  // Initialize text expansion
  try {
    if (typeof window.TextExpansion !== 'undefined') {
      await window.TextExpansion.init();
      console.log("Text expansion initialized");
    }
  } catch (error) {
    console.warn("Text expansion initialization failed:", error);
  }
  
  // Initialize translation service
  try {
    if (typeof window.TranslationService !== 'undefined') {
      await window.TranslationService.init();
      console.log("Translation service initialized");
    }
  } catch (error) {
    console.warn("Translation service initialization failed:", error);
  }
  
  // Initialize offline checker
  try {
    initializeOfflineChecker();
    console.log("Offline checker initialized");
  } catch (error) {
    console.warn("Offline checker initialization failed:", error);
  }
  
  // Initialize AI features if available
  try {
    await initializeRewriter();
    console.log("AI features initialized");
  } catch (error) {
    console.warn("AI features initialization failed:", error);
  }
  
  // Set up event listeners
  setupEventListeners();
  
  console.log("Refyne core features initialized");
}

// Initialize UI features (translation UI, autofill, etc.)
async function initUIFeatures() {
  console.log("Initializing Refyne UI features...");
  
  // Initialize translation UI
  try {
    if (typeof window.TranslationUI !== 'undefined') {
      await window.TranslationUI.init();
      console.log("Translation UI initialized");
    }
  } catch (error) {
    console.warn("Translation UI initialization failed:", error);
  }
  
  console.log("Refyne UI features initialized");
}

// Set up event listeners
function setupEventListeners() {
  try {
    document.addEventListener("input", handleInput, true);
    document.addEventListener("click", (e) => { 
      try {
        if (tooltip && tooltip.contains && !tooltip.contains(e.target)) hideTooltip(); 
      } catch (error) {
        console.warn("Click handler error:", error);
      }
    }, true);
    document.addEventListener("scroll", () => {
      try {
        hideTooltip();
      } catch (error) {
        console.warn("Scroll handler error:", error);
      }
    }, true);
  } catch (error) {
    console.warn("Failed to add event listeners:", error);
  }
}

// ... rest of the existing code remains the same ...

let tooltip = null;
function createTooltip() {
    if (tooltip) return tooltip;
    
    tooltip = document.createElement("div");
    Object.assign(tooltip.style, {
        position: "fixed",
        background: "#fff",
        border: "1px solid #ccc",
        padding: "12px 16px",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        zIndex: "1000000",
        display: "none",
        fontSize: "14px",
        maxWidth: "400px",
        minWidth: "300px",
        cursor: "pointer",
        fontFamily: "Arial, sans-serif",
        lineHeight: "1.5"
    });
    
    // Only append to document body when we're sure it exists
    if (document.body) {
        document.body.appendChild(tooltip);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.body) {
                document.body.appendChild(tooltip);
            }
        });
    }
    
    return tooltip;
}

// Initialize variables only when needed
let debounceTimeout = null;
let activeTarget = null;
let activeSuggestion = null;
let rewriterInstance = null;
let isDownloading = false;
let isEnabled = true;
let downloadAttempted = false;
let downloadProgress = 0;
let offlineMode = false;
let offlineChecker = null;

function initializeOfflineChecker() {
    offlineChecker = {
        rules: [
            {
                name: "subject_verb_agreement",
                pattern: /\b(He|She|It)\s+(have|do|are|were)\b/gi,
                replacement: (match, p1, p2) => {
                    const corrections = {
                        'have': 'has', 'do': 'does', 'are': 'is', 'were': 'was'
                    };
                    return `${p1} ${corrections[p2.toLowerCase()] || p2}`;
                }
            },
            {
                name: "apostrophe_its",
                pattern: /\b(it's)\b/gi,
                replacement: (match) => {
                    return match.toLowerCase() === "it's" ? "its" : match;
                }
            },
            {
                name: "your_youre",
                pattern: /\b(your)\s+(welcome|amazing|great|awesome)\b/gi,
                replacement: "you're $2"
            },
            {
                name: "then_than",
                pattern: /\b(then)\b/gi,
                replacement: (match, offset, string) => {
                    const nearbyWords = string.slice(Math.max(0, offset - 10), offset + 10);
                    if (/\b(more|less|better|worse|rather|other)\b/i.test(nearbyWords)) {
                        return 'than';
                    }
                    return match;
                }
            },
            {
                name: "there_their",
                pattern: /\b(there)\s+(house|car|home|family|friend|team)\b/gi,
                replacement: "their $2"
            }
        ],
        
        dictionary: {
            'recieve': 'receive',
            'seperate': 'separate',
            'definately': 'definitely',
            'occured': 'occurred',
            'alot': 'a lot',
            'untill': 'until',
            'wich': 'which',
            'teh': 'the',
            'adn': 'and',
            'thier': 'their',
            'tounge': 'tongue',
            'truely': 'truly',
            'wierd': 'weird',
            'neccessary': 'necessary',
            'pronounciation': 'pronunciation'
        },

        checkText(text) {
            if (!text || text.trim().length < 3) return null;

            let corrected = text;
            let corrections = [];
            let hasCorrections = false;
            Object.keys(this.dictionary).forEach(misspelling => {
                const regex = new RegExp(`\\b${misspelling}\\b`, 'gi');
                if (regex.test(corrected)) {
                    const original = misspelling;
                    const fixed = this.dictionary[misspelling];
                    corrected = corrected.replace(regex, fixed);
                    corrections.push({
                        original: original,
                        corrected: fixed,
                        type: 'spelling'
                    });
                    hasCorrections = true;
                }
            });
            this.rules.forEach(rule => {
                const regex = new RegExp(rule.pattern.source, 'gi');
                let match;
                while ((match = regex.exec(corrected)) !== null) {
                    const original = match[0];
                    const fixed = typeof rule.replacement === 'function' 
                        ? rule.replacement(...match, match.index, corrected)
                        : original.replace(regex, rule.replacement);
                    
                    if (fixed !== original) {
                        corrected = corrected.slice(0, match.index) + fixed + 
                                   corrected.slice(match.index + original.length);
                        corrections.push({
                            original: original,
                            corrected: fixed,
                            type: 'grammar',
                            rule: rule.name
                        });
                        hasCorrections = true;
                        regex.lastIndex = 0;
                    }
                }
            });
            if (corrected.length > 0 && corrected[0] !== corrected[0].toUpperCase()) {
                corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
                hasCorrections = true;
            }

            if (!hasCorrections) return null;

            return {
                original: text,
                corrected: corrected,
                corrections: corrections,
                reason: "Offline grammar and spelling check",
                source: "offline"
            };
        }
    };
    return true;
}

function isChromeAIAvailable() {
    // Check if we're in a secure context first
    if (!window.isSecureContext) {
        console.log("Not in secure context - Chrome AI APIs require HTTPS or localhost");
        return false;
    }
    
    // More robust check for Rewriter API
    try {
        return typeof self.Rewriter !== 'undefined';
    } catch (e) {
        console.log("Error checking Rewriter API:", e);
        return false;
    }
}

async function monitorDownloadProgress() {
    if (!isChromeAIAvailable()) return;
    
    try {
        const checkProgress = setInterval(async () => {
            const availability = await Rewriter.availability();
            
            if (availability === 'available') {
                console.log("Download completed!");
                isDownloading = false;
                offlineMode = false;
                showStatusMessage("AI model ready! Start typing to get suggestions.", "success");
                setTimeout(hideStatusMessage, 3000);
                clearInterval(checkProgress);
            } else if (availability === 'downloading') {
                console.log("Download in progress...");
                isDownloading = true;
                showStatusMessage("Downloading AI model...", "info");
            }
        }, 2000);
        setTimeout(() => {
            clearInterval(checkProgress);
        }, 300000);
        
    } catch (error) {
        console.error("Download monitoring error:", error);
    }
}

async function speakSuggestion(text) {
    const settings = await new Promise(resolve => {
        chrome.storage.sync.get(['enableTTS'], resolve);
    });
    
    if (settings.enableTTS === false) return;
    
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        utterance.onstart = () => {
            console.log("Started speaking suggestion");
        };
        
        utterance.onend = () => {
            console.log("Finished speaking suggestion");
        };
        
        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            showStatusMessage("Text-to-speech failed", "error");
            setTimeout(hideStatusMessage, 2000);
        };
        
        speechSynthesis.speak(utterance);
    } else {
        showStatusMessage("Text-to-speech not supported", "error");
        setTimeout(hideStatusMessage, 2000);
    }
}

function stopSpeaking() {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
}

// Make initialization non-blocking and defer heavy operations
async function initializeRewriter() {
    // First check if we're in a supported environment
    if (!window.isSecureContext) {
        console.log("Chrome AI features require HTTPS or localhost");
        showStatusMessage("AI features require secure context - using offline mode", "warning");
        offlineMode = true;
        return false;
    }

    if (!isChromeAIAvailable()) {
        console.log("Rewriter API not available in this browser/environment");
        showStatusMessage("AI features not available in this browser - using offline mode", "warning");
        offlineMode = true;
        return false;
    }

    try {
        const availability = await Rewriter.availability();
        console.log("Rewriter availability:", availability);

        if (availability === 'unavailable') {
            console.log("Rewriter API is unavailable");
            showStatusMessage("AI model unavailable - using offline mode", "warning");
            offlineMode = true;
            return false;
        }

        if (availability === 'downloadable' && !downloadAttempted) {
            console.log("AI model needs download - triggering...");
            isDownloading = true;
            downloadAttempted = true;
            showStatusMessage("Downloading AI model... This may take a few minutes. Using offline mode meanwhile.", "info");
            
            monitorDownloadProgress();
        }

        console.log("Creating Rewriter instance...");
        rewriterInstance = await Rewriter.create({
            outputLanguage: 'en',
            expectedInputLanguages: ['en'],
            expectedContextLanguages: ['en']
        });

        console.log("Rewriter initialized successfully");
        const finalAvailability = await Rewriter.availability();
        console.log("Final availability:", finalAvailability);
        
        if (finalAvailability === 'available') {
            console.log("Model is ready to use!");
            isDownloading = false;
            offlineMode = false;
            showStatusMessage("AI model ready!", "success");
            setTimeout(hideStatusMessage, 2000);
        } else if (finalAvailability === 'downloading') {
            console.log("Download in progress...");
            isDownloading = true;
            offlineMode = true;
            showStatusMessage("Downloading AI model... Using offline mode.", "info");
        }
        
        return true;
    } catch (error) {
        console.error("Failed to initialize Rewriter:", error);
        
        // More specific error handling
        if (error.message && (error.message.includes('secure context') || error.message.includes('HTTPS'))) {
            showStatusMessage("AI features require HTTPS or localhost", "error");
        } else if (error.message && (error.message.includes('download') || error.message?.includes('Download'))) {
            showStatusMessage("Download in progress... Using offline mode.", "info");
            offlineMode = true;
            monitorDownloadProgress();
        } else {
            showStatusMessage("AI features not available - using offline mode", "warning");
        }
        offlineMode = true;
        return false;
    }
}

function showStatusMessage(message, type = "info") {
    // Only show status messages on pages with editable content
    const isEditablePage = document.querySelector('input, textarea, [contenteditable]');
    if (!isEditablePage) return;
    
    let statusDiv = document.getElementById("refyne-status-message");
    if (!statusDiv) {
        statusDiv = document.createElement("div");
        statusDiv.id = "refyne-status-message";
        Object.assign(statusDiv.style, {
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "12px 16px",
            borderRadius: "6px",
            zIndex: "1000001",
            fontSize: "14px",
            fontFamily: "Arial, sans-serif",
            fontWeight: "500",
            maxWidth: "300px",
            transition: "opacity 0.3s"
        });
        document.body.appendChild(statusDiv);
    }

    const colors = {
        info: { bg: "#2196F3", text: "white" },
        success: { bg: "#4CAF50", text: "white" },
        error: { bg: "#F44336", text: "white" },
        warning: { bg: "#FF9800", text: "white" }
    };

    const color = colors[type] || colors.info;
    statusDiv.style.background = color.bg;
    statusDiv.style.color = color.text;
    statusDiv.textContent = message;
    statusDiv.style.display = "block";
    statusDiv.style.opacity = "1";
}

function hideStatusMessage() {
    const statusDiv = document.getElementById("refyne-status-message");
    if (statusDiv) {
        statusDiv.style.opacity = "0";
        setTimeout(() => {
            statusDiv.style.display = "none";
        }, 300);
    }
}

async function getAISuggestions(text) {
    if (!rewriterInstance || isDownloading || !isEnabled) return null;

    try {
        const availability = await Rewriter.availability();
        if (availability !== 'available') return null;

        console.log("Getting AI suggestions for text:", text.substring(0, 50) + "...");
        
        const result = await rewriterInstance.rewrite(text, {
            context: "Improve this text for clarity, grammar, and professionalism while keeping the original meaning."
        });
        
        if (!result || result.trim() === text.trim()) return null;

        return {
            original: text,
            corrected: result,
            reason: "AI-improved version",
            source: "ai"
        };
    } catch (err) {
        console.error("Rewriter API error:", err);
        return null;
    }
}

function getOfflineSuggestions(text) {
    if (!offlineChecker || !isEnabled) return null;
    
    try {
        const result = offlineChecker.checkText(text);
        return result;
    } catch (error) {
        console.error("Offline checker error:", error);
        return null;
    }
}

async function getSuggestions(text) {
    if (!text || text.trim().length < 3) return null;
    if (!isEnabled) return null;
    if (!offlineMode && !isDownloading) {
        const aiSuggestion = await getAISuggestions(text);
        if (aiSuggestion) return aiSuggestion;
    }
    const offlineSuggestion = getOfflineSuggestions(text);
    if (offlineSuggestion) return offlineSuggestion;

    return null;
}

async function showTooltip(html, x, y, applyCallback, source = "ai", suggestionText = "") {
    const tooltip = createTooltip();
    
    const sourceIndicator = source === "offline" 
        ? '<div style="font-size:10px;color:#888;text-align:right;margin-top:8px;">🔒 Offline Mode</div>'
        : '<div style="font-size:10px;color:#888;text-align:right;margin-top:8px;">🤖 AI Powered</div>';
    
    let listenButton = '';
    if (suggestionText) {
        const settings = await new Promise(resolve => {
            chrome.storage.sync.get(['enableTTS'], resolve);
        });
        
        if (settings.enableTTS !== false) {
            listenButton = `<button id="listenSuggestion" style="margin-top: 8px; padding: 6px 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
               Listen
            </button>`;
        }
    }
    
    tooltip.innerHTML = html + listenButton + sourceIndicator;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let finalX = x;
    let finalY = y;
    
    if (x + 400 > viewportWidth) finalX = viewportWidth - 420;
    if (y + 200 > viewportHeight) finalY = y - 220;
    
    tooltip.style.left = finalX + "px";
    tooltip.style.top = finalY + "px";
    tooltip.style.display = "block";

    if (suggestionText && listenButton) {
        const listenBtn = tooltip.querySelector('#listenSuggestion');
        if (listenBtn) {
            listenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                speakSuggestion(suggestionText);
            });
        }
    }

    tooltip.onclick = (e) => {
        if (!e.target.closest('#listenSuggestion')) {
            e.stopPropagation();
            applyCallback();
            hideTooltip();
        }
    };
}

function hideTooltip() {
    if (tooltip) {
        tooltip.style.display = "none";
    }
}

function getTextFromElement(el) {
    if (el.isContentEditable) return el.textContent || el.innerText || "";
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value || "";
    return "";
}

function applySuggestion(target, original, corrected) {
    const currentText = getTextFromElement(target);
    if (!currentText.includes(original)) return false;

    try {
        if (target.isContentEditable) {
            // More robust approach for contenteditable elements
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(target);
            selection.removeAllRanges();
            selection.addRange(range);
            
            const newText = currentText.replace(original, corrected);
            target.textContent = newText;
            
            // Safer event dispatching
            const inputEvent = new Event('input', {
                bubbles: true,
                cancelable: true
            });
            target.dispatchEvent(inputEvent);
        } else {
            // Handle form inputs with better error handling
            const newText = currentText.replace(original, corrected);
            target.value = newText;
            
            // Set cursor position safely
            try {
                const pos = currentText.indexOf(original) + corrected.length;
                if (pos >= 0 && target.setSelectionRange) {
                    target.setSelectionRange(pos, pos);
                }
            } catch (posError) {
                // Ignore cursor positioning errors on restricted sites
                console.log("Could not set cursor position:", posError);
            }
            
            // Safer event dispatching for inputs
            try {
                const inputEvent = new Event('input', {
                    bubbles: true,
                    cancelable: true
                });
                target.dispatchEvent(inputEvent);
            } catch (eventError) {
                // Fallback for restricted contexts
                console.log("Could not dispatch input event:", eventError);
            }
        }

        chrome.runtime.sendMessage({ 
            action: 'correctionApplied', 
            original, 
            corrected,
            source: offlineMode ? 'offline' : 'ai'
        }).catch(err => console.log('Background message failed:', err));
        
        showStatusMessage("Suggestion applied!", "success");
        setTimeout(hideStatusMessage, 2000);
        return true;
    } catch (error) {
        console.error("Failed to apply suggestion:", error);
        // More specific error handling
        if (error.name === 'DOMException' || error.name === 'SecurityError') {
            showStatusMessage("Cannot modify content on this page (restricted)", "error");
        } else {
            showStatusMessage("Failed to apply suggestion", "error");
        }
        setTimeout(hideStatusMessage, 3000);
        return false;
    }
}

async function handleInput(e) {
    const target = e.target;
    const isEditable = target.isContentEditable || 
                      target.tagName === "TEXTAREA" || 
                      (target.tagName === "INPUT" && ['text','email','search','url','textarea'].includes(target.type));

    if (!isEditable || !isEnabled) return;
    
    hideTooltip();
    clearTimeout(debounceTimeout);
    
    debounceTimeout = setTimeout(async () => {
        const text = getTextFromElement(target);
        if (!text || text.trim().length < 3) return;

        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'checkEnabled' }, resolve);
            });
            isEnabled = response?.enabled !== false;
        } catch (err) {
            isEnabled = true;
        }

        if (!isEnabled) return;

        const suggestion = await getSuggestions(text);
        if (!suggestion) return;

        activeTarget = target;
        activeSuggestion = suggestion;

        const source = suggestion.source || (offlineMode ? "offline" : "ai");
        const titleColor = source === "offline" ? "#FF9800" : "#4caf50";
        const titleText = source === "offline" ? "Refyne Offline Suggestion" : "Refyne AI Suggestion";
        
        const tooltipContent = `
            <div style="font-weight:bold;color:${titleColor};margin-bottom:8px;font-size:16px;">${titleText}</div>
            <div style="color:#666;text-decoration:line-through;font-size:13px;margin-bottom:6px;padding:4px;background:#f5f5f5;border-radius:4px;">${suggestion.original}</div>
            <div style="color:#2e7d32;font-weight:500;margin-bottom:8px;padding:4px;background:#e8f5e8;border-radius:4px;">${suggestion.corrected}</div>
            <div style="font-size:12px;color:#666;text-align:center;border-top:1px solid #eee;padding-top:8px;">Click to apply suggestion</div>
        `;
        
        const rect = target.getBoundingClientRect();
        showTooltip(
            tooltipContent,
            rect.left + window.scrollX,
            rect.bottom + window.scrollY + 8,
            () => {
                applySuggestion(target, suggestion.original, suggestion.corrected);
                activeTarget = null;
                activeSuggestion = null;
            },
            source,
            suggestion.corrected 
        );
    }, 2000);
}

async function getAIStatus() {
    if (!isChromeAIAvailable()) {
        return { 
            status: 'unavailable', 
            message: 'AI API Not Available',
            offline: true,
            mode: 'offline'
        };
    }

    try {
        const availability = await Rewriter.availability();
        
        let message = '';
        let mode = 'ai';
        switch(availability) {
            case 'available': 
                message = 'AI Model Ready'; 
                mode = 'ai';
                break;
            case 'downloadable': 
                message = 'AI Model Needs Download'; 
                mode = 'offline';
                break;
            case 'downloading': 
                message = 'Downloading AI Model'; 
                mode = 'offline';
                break;
            case 'unavailable': 
            default: 
                message = 'AI Model Unavailable'; 
                mode = 'offline';
                break;
        }
        
        return { 
            status: availability, 
            message: message,
            progress: downloadProgress,
            offline: mode === 'offline',
            mode: mode
        };
    } catch (error) {
        return { 
            status: 'unavailable', 
            message: 'Error Checking Status',
            offline: true,
            mode: 'offline'
        };
    }
}

// Initialize when DOM is ready but don't block page loading
// Use a more robust initialization approach
function robustInit() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRefyne);
    } else if (document.readyState === 'interactive') {
        // DOM is partially loaded, init with a small delay
        setTimeout(initRefyne, 10);
    } else {
        // DOM is fully loaded
        initRefyne();
    }
}

// Add an additional safety check to ensure we don't block page loading
if (typeof window !== 'undefined') {
    // Ensure we don't block the page from loading
    if (document.readyState === 'complete') {
        // Page is fully loaded, initialize immediately
        setTimeout(initRefyne, 10);
    } else {
        // Page is still loading, wait for the right moment
        robustInit();
    }
} else {
    console.warn("Refyne: Window object not available, skipping initialization");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'enabledStateChanged') {
        isEnabled = request.enabled;
        if (!isEnabled) {
            hideTooltip();
            stopSpeaking(); 
        }
        showStatusMessage(isEnabled ? "Refyne enabled" : "Refyne disabled", isEnabled ? "success" : "warning");
        setTimeout(hideStatusMessage, 2000);
    }
    
    if (request.action === 'getAIStatus') {
        getAIStatus().then(status => sendResponse(status));
        return true;
    }
    
    if (request.action === 'checkText' && request.text) {
        showStatusMessage("Checking selected text...", "info");
        getSuggestions(request.text).then(suggestion => {
            if (suggestion) {
                const source = suggestion.source || (offlineMode ? "offline" : "ai");
                const titleColor = source === "offline" ? "#FF9800" : "#4caf50";
                const titleText = source === "offline" ? "Refyne Offline Suggestion" : "Refyne AI Suggestion";
                
                showTooltip(
                    `<div style="font-weight:bold;color:${titleColor};margin-bottom:8px;">${titleText}</div>
                     <div>${suggestion.corrected}</div>`,
                    window.innerWidth / 2,
                    window.innerHeight / 2,
                    () => {
                        showStatusMessage("Copy the suggestion manually", "info");
                        setTimeout(hideStatusMessage, 3000);
                        hideTooltip();
                    },
                    source,
                    suggestion.corrected 
                );
            } else {
                showStatusMessage("No suggestions available", "info");
                setTimeout(hideStatusMessage, 3000);
            }
        });
    }
});