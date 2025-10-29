// Autofill Recorder Content Script
(function() {
  // Function to get the associated label for an input field
  function getLabelForInput(input) {
    // First try to find a label with the 'for' attribute pointing to this input
    const id = input.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent.trim();
      }
    }
    
    // If not found, try to find the closest preceding label
    let sibling = input.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === 'LABEL') {
        return sibling.textContent.trim();
      }
      sibling = sibling.previousElementSibling;
    }
    
    // Check parent elements for labels
    const parent = input.parentElement;
    if (parent) {
      const label = parent.querySelector('label');
      if (label) {
        return label.textContent.trim();
      }
    }
    
    // If still not found, return empty string
    return '';
  }

  // Function to save Q&A pair to storage
  function saveQA(question, answer) {
    chrome.storage.sync.get(['savedEntries'], function(result) {
      let savedEntries = result.savedEntries || [];
      
      // Check if question already exists
      const existingIndex = savedEntries.findIndex(entry => entry.question === question);
      
      if (existingIndex >= 0) {
        // Update existing entry
        savedEntries[existingIndex].answer = answer;
      } else {
        // Add new entry
        savedEntries.push({
          question: question,
          answer: answer
        });
      }
      
      // Save back to storage
      chrome.storage.sync.set({savedEntries: savedEntries});
    });
  }

  // Function to handle blur events on input fields
  function handleBlur(event) {
    const input = event.target;
    
    // Check if recording is enabled
    chrome.storage.sync.get(['recordFormData'], function(result) {
      if (!result.recordFormData) {
        return; // Recording is disabled
      }
      
      // Get the associated question
      const question = getLabelForInput(input);
      
      // Get the answer (input value)
      const answer = input.value.trim();
      
      // Validate both question and answer
      if (question && answer) {
        saveQA(question, answer);
      }
    });
  }

  // Function to attach event listeners to input fields
  function attachListeners() {
    // Select all text input fields
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
    
    // Attach blur event listeners
    inputs.forEach(input => {
      // Skip if already processed
      if (input.dataset.autofillRecorded) {
        return;
      }
      
      input.addEventListener('blur', handleBlur);
      input.dataset.autofillRecorded = 'true'; // Mark as processed
    });
  }

  // Initialize when the DOM is loaded with error handling
  function init() {
    try {
      attachListeners();
      // Also check periodically for new forms
      setInterval(attachListeners, 3000);
    } catch (error) {
      console.warn('Autofill recorder initialization failed:', error);
    }
  }
  
  // Also attach listeners when the page content changes dynamically
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is an input field or contains input fields
            if (node.matches && node.matches('input[type="text"], input[type="email"], input[type="tel"], textarea')) {
              // Attach listener to this specific input
              if (!node.dataset.autofillRecorded) {
                node.addEventListener('blur', handleBlur);
                node.dataset.autofillRecorded = 'true';
              }
            } else {
              // Check if the node contains input fields
              const inputs = node.querySelectorAll && node.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
              if (inputs && inputs.length > 0) {
                inputs.forEach(input => {
                  if (!input.dataset.autofillRecorded) {
                    input.addEventListener('blur', handleBlur);
                    input.dataset.autofillRecorded = 'true';
                  }
                });
              }
            }
          }
        });
      }
    });
  });
  
  // Start observing with a more lightweight approach
  function startObserver() {
    // Only start observer on forms or pages with input fields
    const hasInputFields = document.querySelector('input, textarea, select');
    if (hasInputFields) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  
  // Initialize in a non-blocking way
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
      init();
      startObserver();
    }, 10);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      startObserver();
    });
  }
})();