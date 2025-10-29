/**
 * Translation Settings Page for Refyne Chrome Extension
 * Manages translation settings and preferences
 */

document.addEventListener('DOMContentLoaded', async function() {
  // Add animation to cards
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 100 * index);
  });
  // DOM Elements
  const toggleEnabled = document.getElementById('toggleEnabled');
  const nativeLanguage = document.getElementById('nativeLanguage');
  const translationMode = document.getElementsByName('translationMode');
  const showOriginal = document.getElementById('showOriginal');
  const showTranslation = document.getElementById('showTranslation');
  const showLanguageBadge = document.getElementById('showLanguageBadge');
  const replaceOriginal = document.getElementById('replaceOriginal');
  // Note: Removed provider radio buttons as they're no longer used
  // Note: apiKey element is referenced but doesn't exist in HTML
  const languagesList = document.getElementById('languagesList');
  const addLanguageBtn = document.getElementById('addLanguage');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const languageModal = document.getElementById('languageModal');
  const languageForm = document.getElementById('languageForm');
  const languageSelect = document.getElementById('languageSelect');
  const cancelLanguageBtn = document.getElementById('cancelLanguageBtn');
  const closeBtn = document.querySelector('.close');
  const toast = document.getElementById('toast');
  const translationStatus = document.getElementById('translation-status'); // Added for status display
  // Advanced feature elements
  const useGlossary = document.getElementById('useGlossary');
  const useCustomModel = document.getElementById('useCustomModel');
  const glossaryName = document.getElementById('glossaryName');
  const modelName = document.getElementById('modelName');
  const enableSentimentAnalysis = document.getElementById('enableSentimentAnalysis');
  const enableEntityRecognition = document.getElementById('enableEntityRecognition');
  const enableContentClassification = document.getElementById('enableContentClassification');
  
  // State
  let translationSettings = {
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
  };
  
  // Language names mapping
  const languageNames = {
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
  };
  
  // Initialize
  await loadSettings();
  renderPreferredLanguages();
  
  // Call updateTranslationProvider on page load
  updateTranslationProvider();
  
  // Event Listeners
  toggleEnabled.addEventListener('change', saveSettings);
  nativeLanguage.addEventListener('change', saveSettings);
  Array.from(translationMode).forEach(radio => {
    radio.addEventListener('change', saveSettings);
  });
  showOriginal.addEventListener('change', saveSettings);
  showTranslation.addEventListener('change', saveSettings);
  showLanguageBadge.addEventListener('change', saveSettings);
  replaceOriginal.addEventListener('change', saveSettings);
  // Note: Removed provider radio button event listeners
  // Note: apiKey event listener removed since element doesn't exist
  addLanguageBtn.addEventListener('click', openLanguageModal);
  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetToDefaults);
  languageForm.addEventListener('submit', addLanguage);
  cancelLanguageBtn.addEventListener('click', closeLanguageModal);
  
  // Add event listeners for automatic detection
  window.addEventListener('online', updateTranslationProvider);
  window.addEventListener('offline', updateTranslationProvider);
  
  // Advanced feature event listeners
  if (useGlossary) useGlossary.addEventListener('change', saveSettings);
  if (useCustomModel) useCustomModel.addEventListener('change', saveSettings);
  if (glossaryName) glossaryName.addEventListener('change', saveSettings);
  if (modelName) modelName.addEventListener('change', saveSettings);
  if (enableSentimentAnalysis) enableSentimentAnalysis.addEventListener('change', saveSettings);
  if (enableEntityRecognition) enableEntityRecognition.addEventListener('change', saveSettings);
  if (enableContentClassification) enableContentClassification.addEventListener('change', saveSettings);
  
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === languageModal) {
      closeLanguageModal();
    }
  });
  
  /**
   * Update translation provider based on API key and online status
   */
  async function updateTranslationProvider() {
    try {
      // Get current settings from storage
      const result = await chrome.storage.sync.get(['translation']);
      if (result.translation) {
        translationSettings = result.translation;
      }
      
      // Determine provider based on API key and online status
      const isApiKeyPresent = translationSettings.apiKey && translationSettings.apiKey.trim() !== '';
      const isOnline = navigator.onLine;
      
      let provider;
      if (isApiKeyPresent && isOnline) {
        provider = "google";
      } else {
        provider = "offline";
      }
      
      // Save provider to storage
      translationSettings.provider = provider;
      await chrome.storage.sync.set({
        translation: translationSettings
      });
      
      // Update status UI
      if (translationStatus) {
        if (provider === "google") {
          translationStatus.textContent = "Online (Google Translate API)";
        } else {
          translationStatus.textContent = "Offline (Local ML Model)";
        }
      }
    } catch (error) {
      console.error('Failed to update translation provider:', error);
    }
  }
  
  // Load settings from chrome.storage
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['translation']);
      if (result.translation) {
        translationSettings = result.translation;
      }
      
      // Update UI
      toggleEnabled.checked = translationSettings.enabled;
      nativeLanguage.value = translationSettings.nativeLanguage;
      
      Array.from(translationMode).forEach(radio => {
        radio.checked = radio.value === translationSettings.translationMode;
      });
      
      showOriginal.checked = translationSettings.displayOptions.showOriginal;
      showTranslation.checked = translationSettings.displayOptions.showTranslation;
      showLanguageBadge.checked = translationSettings.displayOptions.showLanguageBadge;
      replaceOriginal.checked = translationSettings.displayOptions.replaceOriginal;
      
      // Note: Removed provider radio button UI updates
      
      // Note: apiKey.value assignment removed since element doesn't exist
      
      // Advanced features
      if (useGlossary) useGlossary.checked = translationSettings.useGlossary;
      if (useCustomModel) useCustomModel.checked = translationSettings.useCustomModel;
      if (glossaryName) glossaryName.value = translationSettings.glossaryName;
      if (modelName) modelName.value = translationSettings.modelName;
      if (enableSentimentAnalysis) enableSentimentAnalysis.checked = translationSettings.enableSentimentAnalysis;
      if (enableEntityRecognition) enableEntityRecognition.checked = translationSettings.enableEntityRecognition;
      if (enableContentClassification) enableContentClassification.checked = translationSettings.enableContentClassification;
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToast('Failed to load settings', 'error');
    }
  }
  
  // Save settings to chrome.storage
  async function saveSettings() {
    try {
      translationSettings.enabled = toggleEnabled.checked;
      translationSettings.nativeLanguage = nativeLanguage.value;
      
      Array.from(translationMode).forEach(radio => {
        if (radio.checked) {
          translationSettings.translationMode = radio.value;
        }
      });
      
      translationSettings.displayOptions.showOriginal = showOriginal.checked;
      translationSettings.displayOptions.showTranslation = showTranslation.checked;
      translationSettings.displayOptions.showLanguageBadge = showLanguageBadge.checked;
      translationSettings.displayOptions.replaceOriginal = replaceOriginal.checked;
      
      // Note: Removed provider radio button saving logic
      
      // Note: apiKey.value saving removed since element doesn't exist
      
      // Advanced features
      if (useGlossary) translationSettings.useGlossary = useGlossary.checked;
      if (useCustomModel) translationSettings.useCustomModel = useCustomModel.checked;
      if (glossaryName) translationSettings.glossaryName = glossaryName.value;
      if (modelName) translationSettings.modelName = modelName.value;
      if (enableSentimentAnalysis) translationSettings.enableSentimentAnalysis = enableSentimentAnalysis.checked;
      if (enableEntityRecognition) translationSettings.enableEntityRecognition = enableEntityRecognition.checked;
      if (enableContentClassification) translationSettings.enableContentClassification = enableContentClassification.checked;
      
      await chrome.storage.sync.set({
        translation: translationSettings
      });
      
      // Update provider after saving settings
      updateTranslationProvider();
      
      showToast('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings', 'error');
    }
  }
  
  // Render preferred languages in the table
  function renderPreferredLanguages() {
    languagesList.innerHTML = '';
    
    if (!translationSettings.preferredLanguages || translationSettings.preferredLanguages.length === 0) {
      document.getElementById('emptyState').style.display = 'block';
      return;
    }
    
    document.getElementById('emptyState').style.display = 'none';
    
    translationSettings.preferredLanguages.forEach((langCode, index) => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${languageNames[langCode] || langCode}</td>
        <td class="actions">
          <button class="btn-icon delete-btn" data-index="${index}" title="Remove">
            🗑️
          </button>
        </td>
      `;
      
      // Add animation
      row.style.opacity = '0';
      row.style.transform = 'translateX(20px)';
      
      languagesList.appendChild(row);
      
      // Add animation
      setTimeout(() => {
        row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
      }, 50 * index);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.getAttribute('data-index'));
        removeLanguage(index);
      });
    });
  }
  
  // Open modal for adding a new language
  function openLanguageModal() {
    languageSelect.value = '';
    languageModal.style.display = 'block';
    languageSelect.focus();
  }
  
  // Close language modal
  function closeLanguageModal() {
    languageModal.style.display = 'none';
  }
  
  // Add language to preferred languages
  async function addLanguage(e) {
    e.preventDefault();
    
    const langCode = languageSelect.value.trim();
    
    // Validation
    if (!langCode) {
      showToast('Please select a language', 'error');
      return;
    }
    
    // Check for duplicate languages
    if (translationSettings.preferredLanguages.includes(langCode)) {
      showToast('This language is already in your preferred languages', 'error');
      return;
    }
    
    try {
      translationSettings.preferredLanguages.push(langCode);
      
      // Save to storage
      await chrome.storage.sync.set({
        translation: translationSettings
      });
      
      // Update UI
      renderPreferredLanguages();
      closeLanguageModal();
      showToast('Language added successfully');
    } catch (error) {
      console.error('Failed to add language:', error);
      showToast('Failed to add language', 'error');
    }
  }
  
  // Remove language from preferred languages
  async function removeLanguage(index) {
    if (index < 0 || index >= translationSettings.preferredLanguages.length) return;
    
    try {
      translationSettings.preferredLanguages.splice(index, 1);
      
      // Save to storage
      await chrome.storage.sync.set({
        translation: translationSettings
      });
      
      // Update UI
      renderPreferredLanguages();
      showToast('Language removed successfully');
    } catch (error) {
      console.error('Failed to remove language:', error);
      showToast('Failed to remove language', 'error');
    }
  }
  
  // Reset settings to defaults
  async function resetToDefaults() {
    if (!confirm('Are you sure you want to reset all translation settings to defaults?')) {
      return;
    }
    
    try {
      const defaultSettings = {
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
        preferredLanguages: []
      };
      
      translationSettings = defaultSettings;
      
      // Save to storage
      await chrome.storage.sync.set({
        translation: translationSettings
      });
      
      // Update UI
      await loadSettings();
      renderPreferredLanguages();
      showToast('Settings reset to defaults');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showToast('Failed to reset settings', 'error');
    }
  }
  
  // Show toast notification
  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = type;
    
    // Add animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
});