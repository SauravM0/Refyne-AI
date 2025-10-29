/**
 * Translation UI Handler for Refyne Chrome Extension
 * Handles the UI elements for translation in messaging platforms
 */

(function() {
  'use strict';

  // Namespace to avoid conflicts
  const TranslationUI = {
    settings: {},
    initialized: false,
    
    // Initialize the translation UI handler
    async init() {
      if (this.initialized) return;
      
      console.log('TranslationUI: Initializing...');
      
      // Load settings from storage
      await this.loadSettings();
      
      // Listen for storage changes
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.translation) {
          this.updateSettings(changes.translation.newValue);
        }
      });
      
      // Start observing DOM changes
      this.observeDOM();
      
      this.initialized = true;
      console.log('TranslationUI: Initialized');
    },
    
    // Load settings from chrome.storage
    async loadSettings() {
      try {
        const result = await chrome.storage.sync.get(['translation']);
        this.updateSettings(result.translation);
      } catch (error) {
        console.warn('TranslationUI: Failed to load settings', error);
      }
    },
    
    // Update settings
    updateSettings(settings) {
      if (settings) {
        this.settings = settings;
        console.log('TranslationUI: Settings updated', settings);
      }
    },
    
    // Observe DOM changes to detect new messages
    observeDOM() {
      if (!this.settings.enabled) return;
      
      // Use a more lightweight approach to avoid performance issues
      const observer = new MutationObserver((mutations) => {
        // Process mutations in a debounced way to avoid performance issues
        clearTimeout(this.observerTimeout);
        this.observerTimeout = setTimeout(() => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.processNewContent(node);
              }
            });
          });
        }, 100); // Debounce for 100ms
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Process existing content
      this.processExistingContent();
    },
    
    // Process existing content on the page
    processExistingContent() {
      // Only process content on messaging platforms to avoid performance issues
      const isMessagingPlatform = this.isMessagingPlatform();
      if (!isMessagingPlatform) return;
      
      // Different selectors for different messaging platforms
      const selectors = [
        // WhatsApp Web
        '.message-in .copyable-text',
        '.message-out .copyable-text',
        // Facebook Messenger
        '._3oh-',
        // Telegram
        '.message',
        // Gmail
        '.a3s.aiL',
        // Slack
        '.c-message__body',
        // Discord
        '.message-content',
        // Generic selectors
        '[data-testid="message-container"]',
        '.message-text'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (!element.dataset.refyneTranslated) {
            this.processElement(element);
          }
        });
      });
    },
    
    // Check if current page is a messaging platform
    isMessagingPlatform() {
      const messagingPlatforms = [
        'web.whatsapp.com',
        'messenger.com',
        'web.telegram.org',
        'mail.google.com',
        'slack.com',
        'discord.com'
      ];
      
      return messagingPlatforms.some(platform => 
        window.location.hostname.includes(platform));
    },
    
    // Process new content added to the DOM
    processNewContent(node) {
      if (!this.settings.enabled) return;
      
      // Only process content on messaging platforms to avoid performance issues
      const isMessagingPlatform = this.isMessagingPlatform();
      if (!isMessagingPlatform) return;
      
      // Check if the node itself matches any selectors
      this.checkAndProcessElement(node);
      
      // Check if any of its children match selectors
      const selectors = [
        '.copyable-text',
        '._3oh-',
        '.message',
        '.a3s.aiL',
        '.c-message__body',
        '.message-content',
        '[data-testid="message-container"]',
        '.message-text'
      ];
      
      selectors.forEach(selector => {
        const elements = node.querySelectorAll(selector);
        elements.forEach(element => {
          this.checkAndProcessElement(element);
        });
      });
    },
    
    // Check and process an element if it matches criteria
    checkAndProcessElement(element) {
      if (!element.dataset.refyneTranslated && 
          element.textContent && 
          element.textContent.trim().length > 0 &&
          !this.isInputElement(element)) {
        this.processElement(element);
      }
    },
    
    // Process an individual element
    async processElement(element) {
      if (!this.settings.enabled || !TranslationService) return;
      
      const text = element.textContent.trim();
      if (text.length < 3) return;
      
      // Mark as processed to avoid re-processing
      element.dataset.refyneTranslated = 'true';
      
      // Detect language
      const sourceLang = await TranslationService.detectLanguage(text);
      const targetLang = this.settings.nativeLanguage;
      
      // If source language is the same as target, no need to translate
      if (sourceLang === targetLang) return;
      
      // Translate the text
      const translation = await TranslationService.translateText(text, targetLang, sourceLang);
      if (!translation || translation === text) return;
      
      // Analyze text if advanced features are enabled
      let analysis = null;
      if (TranslationService.settings.enableSentimentAnalysis || 
          TranslationService.settings.enableEntityRecognition || 
          TranslationService.settings.enableContentClassification) {
        analysis = await TranslationService.analyzeText(text);
      }
      
      // Add translation UI
      this.addTranslationUI(element, text, translation, sourceLang, targetLang, analysis);
    },
    
    // Add translation UI to an element
    addTranslationUI(element, originalText, translation, sourceLang, targetLang, analysis = null) {
      if (!this.settings.displayOptions.showTranslation) return;
      
      // Create translation container
      const translationContainer = document.createElement('div');
      translationContainer.className = 'refyne-translation-container';
      translationContainer.style.cssText = `
        margin-top: 5px;
        padding: 8px 12px;
        background-color: #e8f5e8;
        border-left: 3px solid #4caf50;
        border-radius: 4px;
        font-size: 14px;
        color: #2e7d32;
        display: flex;
        flex-direction: column;
        gap: 5px;
      `;
      
      // Add language badge if enabled
      if (this.settings.displayOptions.showLanguageBadge) {
        const langBadge = document.createElement('div');
        langBadge.className = 'refyne-language-badge';
        langBadge.style.cssText = `
          font-size: 12px;
          color: #666;
          display: flex;
          align-items: center;
          gap: 5px;
        `;
        
        const flag = TranslationService.getLanguageFlag(sourceLang);
        const langName = TranslationService.getLanguageName(sourceLang);
        
        langBadge.innerHTML = `
          <span>${flag}</span>
          <span>${langName}</span>
          <span style="margin: 0 5px;">→</span>
          <span>🌐</span>
          <span>${TranslationService.getLanguageName(targetLang)}</span>
        `;
        
        translationContainer.appendChild(langBadge);
      }
      
      // Add translation text
      const translationText = document.createElement('div');
      translationText.className = 'refyne-translation-text';
      translationText.textContent = translation;
      translationContainer.appendChild(translationText);
      
      // Add analysis results if available
      if (analysis) {
        this.addAnalysisUI(translationContainer, analysis);
      }
      
      // Add action buttons
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'refyne-translation-actions';
      actionsContainer.style.cssText = `
        display: flex;
        gap: 10px;
        margin-top: 5px;
        font-size: 12px;
      `;
      
      // Listen button
      const listenButton = document.createElement('button');
      listenButton.className = 'refyne-listen-button';
      listenButton.textContent = '🔊 Listen';
      listenButton.style.cssText = `
        background: none;
        border: 1px solid #4caf50;
        color: #4caf50;
        padding: 3px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      `;
      
      listenButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.speakText(translation);
      });
      
      // Copy button
      const copyButton = document.createElement('button');
      copyButton.className = 'refyne-copy-button';
      copyButton.textContent = '📋 Copy';
      copyButton.style.cssText = `
        background: none;
        border: 1px solid #2196f3;
        color: #2196f3;
        padding: 3px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      `;
      
      copyButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.copyText(translation);
      });
      
      actionsContainer.appendChild(listenButton);
      actionsContainer.appendChild(copyButton);
      translationContainer.appendChild(actionsContainer);
      
      // Insert translation container after the original element
      if (this.settings.displayOptions.replaceOriginal) {
        // Replace original with translation
        element.style.display = 'none';
        element.parentNode.insertBefore(translationContainer, element.nextSibling);
      } else {
        // Show both original and translation
        element.parentNode.insertBefore(translationContainer, element.nextSibling);
      }
    },
    
    // Add text analysis UI
    addAnalysisUI(container, analysis) {
      if (!analysis) return;
      
      const analysisContainer = document.createElement('div');
      analysisContainer.className = 'refyne-analysis-container';
      analysisContainer.style.cssText = `
        margin-top: 8px;
        padding: 8px;
        background-color: #f5f5f5;
        border-radius: 4px;
        font-size: 12px;
      `;
      
      // Add sentiment analysis if available
      if (analysis.documentSentiment) {
        const sentimentContainer = document.createElement('div');
        sentimentContainer.className = 'refyne-sentiment';
        sentimentContainer.style.cssText = `
          margin-bottom: 5px;
          padding-bottom: 5px;
          border-bottom: 1px solid #ddd;
        `;
        
        const score = analysis.documentSentiment.score;
        const magnitude = analysis.documentSentiment.magnitude;
        let sentimentLabel = 'Neutral';
        let sentimentColor = '#666';
        
        if (score > 0.1) {
          sentimentLabel = 'Positive';
          sentimentColor = '#4caf50';
        } else if (score < -0.1) {
          sentimentLabel = 'Negative';
          sentimentColor = '#f44336';
        }
        
        sentimentContainer.innerHTML = `
          <strong>Sentiment:</strong> 
          <span style="color: ${sentimentColor};">${sentimentLabel}</span> 
          (Score: ${score.toFixed(2)}, Magnitude: ${magnitude.toFixed(2)})
        `;
        
        analysisContainer.appendChild(sentimentContainer);
      }
      
      // Add entities if available
      if (analysis.entities && analysis.entities.length > 0) {
        const entitiesContainer = document.createElement('div');
        entitiesContainer.className = 'refyne-entities';
        entitiesContainer.style.cssText = `
          margin-bottom: 5px;
          padding-bottom: 5px;
          border-bottom: 1px solid #ddd;
        `;
        
        const entitiesTitle = document.createElement('strong');
        entitiesTitle.textContent = 'Entities: ';
        entitiesContainer.appendChild(entitiesTitle);
        
        const entitiesList = document.createElement('span');
        entitiesList.textContent = analysis.entities
          .slice(0, 5) // Limit to first 5 entities
          .map(entity => `${entity.name} (${entity.type})`)
          .join(', ');
        
        entitiesContainer.appendChild(entitiesList);
        analysisContainer.appendChild(entitiesContainer);
      }
      
      // Add categories if available
      if (analysis.categories && analysis.categories.length > 0) {
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'refyne-categories';
        
        const categoriesTitle = document.createElement('strong');
        categoriesTitle.textContent = 'Categories: ';
        categoriesContainer.appendChild(categoriesTitle);
        
        const categoriesList = document.createElement('span');
        categoriesList.textContent = analysis.categories
          .slice(0, 3) // Limit to first 3 categories
          .map(category => `${category.name} (${(category.confidence * 100).toFixed(1)}%)`)
          .join(', ');
        
        categoriesContainer.appendChild(categoriesList);
        analysisContainer.appendChild(categoriesContainer);
      }
      
      container.appendChild(analysisContainer);
    },
    
    // Speak text using text-to-speech
    speakText(text) {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        utterance.onend = () => {
          console.log("Finished speaking translation");
        };
        
        utterance.onerror = (event) => {
          console.error("Speech synthesis error:", event);
        };
        
        speechSynthesis.speak(utterance);
      }
    },
    
    // Copy text to clipboard
    copyText(text) {
      navigator.clipboard.writeText(text).then(() => {
        // Show a temporary confirmation
        const originalText = event.target.textContent;
        event.target.textContent = '✓ Copied!';
        setTimeout(() => {
          event.target.textContent = originalText;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    },
    
    // Check if element is an input element
    isInputElement(element) {
      const inputElements = ['INPUT', 'TEXTAREA', 'SELECT'];
      return inputElements.includes(element.tagName) || element.isContentEditable;
    }
  };

  // Expose TranslationUI globally for use by other scripts
  window.TranslationUI = TranslationUI;
})();