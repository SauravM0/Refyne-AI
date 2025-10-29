/**
 * Translation Service for Refyne Chrome Extension
 * Handles language detection and translation of text
 */

(function() {
  'use strict';

  // Namespace to avoid conflicts
  const TranslationService = {
    enabled: true,
    settings: {},
    debounceTimer: null,
    translationCache: new Map(),
    languageNames: {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'pl': 'Polish',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'hi': 'Hindi',
      'mr': 'Marathi',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'pa': 'Punjabi',
      'ur': 'Urdu',
      'zh': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      'ja': 'Japanese',
      'ko': 'Korean',
      'vi': 'Vietnamese',
      'th': 'Thai',
      'ar': 'Arabic',
      'he': 'Hebrew',
      'fa': 'Persian',
      'tr': 'Turkish',
      'id': 'Indonesian',
      'fil': 'Filipino',
      'sw': 'Swahili',
      'zu': 'Zulu'
    },
    
    // Initialize the translation service
    async init() {
      console.log('TranslationService: Initializing...');
      
      // Load settings from storage
      await this.loadSettings();
      
      // Listen for storage changes
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.translation) {
          this.updateSettings(changes.translation.newValue);
        }
      });
      
      console.log('TranslationService: Initialized');
    },
    
    // Load settings from chrome.storage
    async loadSettings() {
      try {
        const result = await chrome.storage.sync.get(['translation']);
        this.updateSettings(result.translation);
      } catch (error) {
        console.warn('TranslationService: Failed to load settings', error);
        // Use default settings
        this.updateSettings({
          enabled: true,
          nativeLanguage: 'en',
          translationMode: 'auto',
          displayOptions: {
            showOriginal: true,
            showTranslation: true,
            showLanguageBadge: true,
            replaceOriginal: false
          },
          provider: 'offline',
          apiKey: '',
          preferredLanguages: [],
          // Advanced features
          useGlossary: false,
          useCustomModel: false,
          glossaryName: '',
          modelName: 'default',
          enableSentimentAnalysis: false,
          enableEntityRecognition: false,
          enableContentClassification: false
        });
      }
    },
    
    // Update settings
    updateSettings(settings) {
      if (settings) {
        this.settings = settings;
        this.enabled = settings.enabled !== false;
        console.log('TranslationService: Settings updated', settings);
      }
    },
    
    // Detect language of text
    async detectLanguage(text) {
      if (!text || text.trim().length < 3) return null;
      
      // For now, we'll use a simple approach
      // In a real implementation, you would use a language detection API or library
      const commonWords = {
        'en': ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'],
        'es': ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se'],
        'fr': ['le', 'de', 'et', 'à', 'un', 'être', 'en', 'avoir', 'que', 'pour'],
        'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
        'it': ['il', 'di', 'che', 'e', 'la', 'in', 'un', 'è', 'per', 'a'],
        'pt': ['o', 'de', 'e', 'que', 'a', 'do', 'da', 'em', 'um', 'para'],
        'ru': ['и', 'в', 'не', 'на', 'я', 'быть', 'с', 'а', 'как', 'то'],
        'hi': ['कि', 'है', 'और', 'के', 'से', 'इस', 'पर', 'एक', 'यह', 'को'],
        'zh': ['的', '一', '是', '在', '不', '了', '有', '和', '人', '这']
      };
      
      // Convert text to lowercase and split into words
      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      
      // Count occurrences of common words for each language
      const scores = {};
      Object.keys(commonWords).forEach(lang => {
        scores[lang] = 0;
        commonWords[lang].forEach(word => {
          scores[lang] += words.filter(w => w === word).length;
        });
      });
      
      // Find language with highest score
      let detectedLang = 'en';
      let maxScore = 0;
      Object.keys(scores).forEach(lang => {
        if (scores[lang] > maxScore) {
          maxScore = scores[lang];
          detectedLang = lang;
        }
      });
      
      // If no common words found, return null
      return maxScore > 0 ? detectedLang : null;
    },
    
    // Translate text using the configured provider
    async translateText(text, targetLang, sourceLang = 'auto') {
      if (!text || !targetLang) return null;
      
      // Check cache first
      const cacheKey = `${text}_${sourceLang}_${targetLang}`;
      if (this.translationCache.has(cacheKey)) {
        const cached = this.translationCache.get(cacheKey);
        // Check if cache is still valid (less than 7 days old)
        if (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
          return cached.translation;
        }
      }
      
      // If source language is auto, detect it
      if (sourceLang === 'auto') {
        sourceLang = await this.detectLanguage(text) || 'en';
      }
      
      // If source and target languages are the same, return original text
      if (sourceLang === targetLang) {
        return text;
      }
      
      let translation = '';
      
      try {
        switch (this.settings.provider) {
          case 'google':
            translation = await this.translateWithGoogle(text, targetLang, sourceLang);
            break;
          case 'microsoft':
            translation = await this.translateWithMicrosoft(text, targetLang, sourceLang);
            break;
          case 'libre':
            translation = await this.translateWithLibre(text, targetLang, sourceLang);
            break;
          case 'offline':
          default:
            translation = await this.translateOffline(text, targetLang, sourceLang);
            break;
        }
        
        // Cache the translation
        this.translationCache.set(cacheKey, {
          translation: translation,
          timestamp: Date.now()
        });
        
        return translation;
      } catch (error) {
        console.error('TranslationService: Translation failed', error);
        return null;
      }
    },
    
    // Translate using Google Translate API
    async translateWithGoogle(text, targetLang, sourceLang) {
      // In a real implementation, you would make an API call to Google Translate
      // This is a mock implementation for demonstration
      console.log(`Translating with Google: ${text} (${sourceLang} -> ${targetLang})`);
      
      // If advanced features are enabled, use the Cloud Translation API
      if (this.settings.apiKey && (this.settings.useGlossary || this.settings.useCustomModel)) {
        return await this.translateWithCloudAPI(text, targetLang, sourceLang);
      }
      
      return `[Google] ${text}`;
    },
    
    // Translate using Cloud Translation API with advanced features
    async translateWithCloudAPI(text, targetLang, sourceLang) {
      if (!this.settings.apiKey) {
        console.warn('Cloud Translation API key not provided');
        return `[Google] ${text}`;
      }
      
      try {
        // Prepare request body with advanced features
        const requestBody = {
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        };
        
        // Add glossary if enabled
        if (this.settings.useGlossary && this.settings.glossaryName) {
          requestBody.glossaryConfig = {
            glossary: `projects/YOUR_PROJECT_ID/locations/global/glossaries/${this.settings.glossaryName}`
          };
        }
        
        // Add model if custom model is enabled
        if (this.settings.useCustomModel) {
          if (this.settings.modelName === 'latest') {
            requestBody.model = 'projects/YOUR_PROJECT_ID/locations/global/models/translation-latest';
          } else {
            requestBody.model = `projects/YOUR_PROJECT_ID/locations/global/models/${this.settings.modelName}`;
          }
        }
        
        const response = await fetch(
          `https://translation.googleapis.com/v3/projects/YOUR_PROJECT_ID:translateText`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Authorization': `Bearer ${this.settings.apiKey}`
            },
            body: JSON.stringify(requestBody)
          }
        );
        
        if (!response.ok) {
          throw new Error(`Cloud Translation API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.translations[0].translatedText;
      } catch (error) {
        console.error('Cloud Translation API error:', error);
        return `[Cloud API Error] ${text}`;
      }
    },
    
    // Analyze text using Cloud Natural Language API
    async analyzeText(text) {
      if (!this.settings.apiKey || 
          (!this.settings.enableSentimentAnalysis && 
           !this.settings.enableEntityRecognition && 
           !this.settings.enableContentClassification)) {
        return null;
      }
      
      try {
        const features = {};
        if (this.settings.enableSentimentAnalysis) features.extractSentiment = true;
        if (this.settings.enableEntityRecognition) features.extractEntities = true;
        if (this.settings.enableContentClassification) features.classifyText = true;
        
        const requestBody = {
          document: {
            content: text,
            type: 'PLAIN_TEXT'
          },
          features: features
        };
        
        const response = await fetch(
          `https://language.googleapis.com/v1/documents:annotateText`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Authorization': `Bearer ${this.settings.apiKey}`
            },
            body: JSON.stringify(requestBody)
          }
        );
        
        if (!response.ok) {
          throw new Error(`Cloud Natural Language API error: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Cloud Natural Language API error:', error);
        return null;
      }
    },
    
    // Translate using Microsoft Translator API
    async translateWithMicrosoft(text, targetLang, sourceLang) {
      // In a real implementation, you would make an API call to Microsoft Translator
      // This is a mock implementation for demonstration
      console.log(`Translating with Microsoft: ${text} (${sourceLang} -> ${targetLang})`);
      return `[Microsoft] ${text}`;
    },
    
    // Translate using LibreTranslate
    async translateWithLibre(text, targetLang, sourceLang) {
      // In a real implementation, you would make an API call to LibreTranslate
      // This is a mock implementation for demonstration
      console.log(`Translating with LibreTranslate: ${text} (${sourceLang} -> ${targetLang})`);
      return `[Libre] ${text}`;
    },
    
    // Offline translation using simple rules
    async translateOffline(text, targetLang, sourceLang) {
      // In a real implementation, you would use a local ML model or dictionary-based approach
      // This is a mock implementation for demonstration
      console.log(`Translating offline: ${text} (${sourceLang} -> ${targetLang})`);
      return `[Offline] ${text}`;
    },
    
    // Get language name from code
    getLanguageName(code) {
      return this.languageNames[code] || code;
    },
    
    // Get language flag emoji from code
    getLanguageFlag(code) {
      const flagMap = {
        'en': '🇺🇸',
        'es': '🇪🇸',
        'fr': '🇫🇷',
        'de': '🇩🇪',
        'it': '🇮🇹',
        'pt': '🇵🇹',
        'ru': '🇷🇺',
        'pl': '🇵🇱',
        'nl': '🇳🇱',
        'sv': '🇸🇪',
        'hi': '🇮🇳',
        'mr': '🇮🇳',
        'bn': '🇧🇩',
        'ta': '🇮🇳',
        'te': '🇮🇳',
        'gu': '🇮🇳',
        'kn': '🇮🇳',
        'ml': '🇮🇳',
        'pa': '🇮🇳',
        'ur': '🇵🇰',
        'zh': '🇨🇳',
        'zh-TW': '🇹🇼',
        'ja': '🇯🇵',
        'ko': '🇰🇷',
        'vi': '🇻🇳',
        'th': '🇹🇭',
        'ar': '🇸🇦',
        'he': '🇮🇱',
        'fa': '🇮🇷',
        'tr': '🇹🇷',
        'id': '🇮🇩',
        'fil': '🇵🇭',
        'sw': '🇰🇪',
        'zu': '🇿🇦'
      };
      
      return flagMap[code] || '🌐';
    }
  };

  // Expose TranslationService globally for use by other scripts
  window.TranslationService = TranslationService;
})();