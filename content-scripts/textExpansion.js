/**
 * Text Expansion Feature for Refyne Chrome Extension
 * Allows users to type shortcuts and automatically expand them into full predefined messages
 */

(function() {
  'use strict';

  // Namespace to avoid conflicts
  const TextExpansion = {
    enabled: true,
    shortcuts: [],
    debounceTimer: null,
    
    // Initialize the text expansion feature
    async init() {
      console.log('TextExpansion: Initializing...');
      
      // Load settings from storage
      await this.loadSettings();
      
      // Listen for storage changes
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.textExpansion) {
          this.updateSettings(changes.textExpansion.newValue);
        }
      });
      
      console.log('TextExpansion: Initialized');
    },
    
    // Load settings from chrome.storage
    async loadSettings() {
      try {
        const result = await chrome.storage.sync.get(['textExpansion']);
        this.updateSettings(result.textExpansion);
      } catch (error) {
        console.warn('TextExpansion: Failed to load settings', error);
        // Use default settings
        this.updateSettings({
          enabled: true,
          shortcuts: [
            {trigger: "thank", expansion: "Thank you for your message!"},
            {trigger: "regards", expansion: "Best regards,"},
            {trigger: "meeting", expansion: "I'd be happy to schedule a meeting with you."},
            {trigger: "sorry", expansion: "I apologize for any inconvenience."},
            {trigger: "welcome", expansion: "You're welcome! Let me know if you need anything else."}
          ]
        });
      }
    },
    
    // Update settings
    updateSettings(settings) {
      if (settings) {
        this.enabled = settings.enabled !== false;
        this.shortcuts = settings.shortcuts || [];
        console.log('TextExpansion: Settings updated', settings);
      }
    },
    
    // Check if element is a password or sensitive field
    isSensitiveField(element) {
      if (!element) return true;
      
      // Check for password fields
      if (element.type === 'password') return true;
      
      // Check for credit card fields
      if (element.autocomplete && 
          (element.autocomplete.includes('cc-') || 
           element.autocomplete.includes('card') ||
           element.autocomplete === 'credit-card-number')) {
        return true;
      }
      
      return false;
    },
    
    // Handle input events
    handleInput(event) {
      // Skip if feature is disabled
      if (!this.enabled) return;
      
      const target = event.target;
      
      // Check if target is a text input field
      const isTextInput = target.isContentEditable || 
                         target.tagName === 'TEXTAREA' || 
                         (target.tagName === 'INPUT' && 
                          ['text', 'search', 'email', 'url'].includes(target.type));
      
      // Skip if not a text input or if it's a sensitive field
      if (!isTextInput || this.isSensitiveField(target)) return;
      
      // Debounce to avoid performance issues
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.processText(target);
      }, 100);
    },
    
    // Handle keydown events for activation keys
    handleKeyDown(event) {
      // Skip if feature is disabled
      if (!this.enabled) return;
      
      // Activation keys: Space, Tab, Enter
      if (event.key === ' ' || event.key === 'Tab' || event.key === 'Enter') {
        const target = event.target;
        
        // Check if target is a text input field
        const isTextInput = target.isContentEditable || 
                           target.tagName === 'TEXTAREA' || 
                           (target.tagName === 'INPUT' && 
                            ['text', 'search', 'email', 'url'].includes(target.type));
        
        // Skip if not a text input or if it's a sensitive field
        if (!isTextInput || this.isSensitiveField(target)) return;
        
        // Process text when activation key is pressed
        setTimeout(() => {
          this.processText(target);
        }, 0);
      }
    },
    
    // Process text in the input field
    processText(element) {
      if (!element || !this.shortcuts || this.shortcuts.length === 0) return;
      
      try {
        let text;
        let selectionStart;
        
        if (element.isContentEditable) {
          const selection = window.getSelection();
          if (!selection.rangeCount) return;
          
          const range = selection.getRangeAt(0);
          const container = range.startContainer;
          
          // Get text content
          text = container.textContent || container.nodeValue || '';
          selectionStart = range.startOffset;
        } else {
          text = element.value || '';
          selectionStart = element.selectionStart || 0;
        }
        
        // Check for shortcuts at the current cursor position
        this.checkForShortcuts(element, text, selectionStart);
      } catch (error) {
        console.warn('TextExpansion: Error processing text', error);
      }
    },
    
    // Check for shortcuts in the text
    checkForShortcuts(element, text, cursorPosition) {
      if (!text || cursorPosition === 0) return;
      
      // Get text before cursor
      const textBeforeCursor = text.substring(0, cursorPosition);
      
      // Check each shortcut
      for (const shortcut of this.shortcuts) {
        const { trigger, expansion } = shortcut;
        
        if (!trigger || !expansion) continue;
        
        // Create regex pattern to match trigger at word boundary
        // Match at beginning of text or after whitespace
        const pattern = new RegExp(`(?:^|\\s)${this.escapeRegex(trigger)}(?=\\s|$)`, 'gi');
        const matches = [...textBeforeCursor.matchAll(pattern)];
        
        if (matches.length > 0) {
          // Get the last match (closest to cursor)
          const match = matches[matches.length - 1];
          const matchIndex = match.index;
          const matchText = match[0];
          
          // Calculate positions
          const triggerStart = matchIndex + (matchText.length - trigger.length);
          const triggerEnd = triggerStart + trigger.length;
          
          // Only expand if trigger ends at cursor position
          if (triggerEnd === cursorPosition) {
            this.expandShortcut(element, text, triggerStart, triggerEnd, expansion);
            break;
          }
        }
      }
    },
    
    // Expand a shortcut with its full text
    expandShortcut(element, text, start, end, expansion) {
      try {
        const newText = text.substring(0, start) + expansion + text.substring(end);
        
        if (element.isContentEditable) {
          // Handle contenteditable elements
          element.textContent = newText;
          
          // Restore cursor position
          const selection = window.getSelection();
          const range = document.createRange();
          range.setStart(element.firstChild, start + expansion.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // Handle input/textarea elements
          element.value = newText;
          
          // Restore cursor position
          const newCursorPosition = start + expansion.length;
          element.setSelectionRange(newCursorPosition, newCursorPosition);
        }
        
        // Dispatch input event to notify other scripts
        const inputEvent = new Event('input', {
          bubbles: true,
          cancelable: true
        });
        element.dispatchEvent(inputEvent);
        
        console.log(`TextExpansion: Expanded "${text.substring(start, end)}" to "${expansion}"`);
      } catch (error) {
        console.warn('TextExpansion: Error expanding shortcut', error);
      }
    },
    
    // Escape special regex characters
    escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  };

  // Expose TextExpansion globally for use by other scripts
  window.TextExpansion = TextExpansion;
  
  // Also set up event listeners
  document.addEventListener('input', TextExpansion.handleInput.bind(TextExpansion), true);
  document.addEventListener('keydown', TextExpansion.handleKeyDown.bind(TextExpansion), true);
})();