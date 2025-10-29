// Autofill Injector Content Script
(function() {
  // Simple string similarity function (using word overlap)
  function calculateSimilarity(str1, str2) {
    // Convert to lowercase and split into words
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    
    // Find common words
    const commonWords = words1.filter(word => words2.includes(word));
    
    // Calculate similarity as the ratio of common words to total unique words
    const uniqueWords = new Set([...words1, ...words2]);
    return commonWords.length / uniqueWords.size;
  }

  // Find the best matching saved entry for a question
  function findBestMatch(question, savedEntries) {
    let bestMatch = null;
    let bestScore = 0;
    
    savedEntries.forEach(entry => {
      const score = calculateSimilarity(question, entry.question);
      if (score > bestScore && score > 0.3) { // Threshold for similarity
        bestScore = score;
        bestMatch = entry;
      }
    });
    
    return bestMatch;
  }

  // Create and inject the autofill icon
  function createAutofillIcon(input, savedEntry) {
    // Create the icon element
    const icon = document.createElement('span');
    icon.innerHTML = ' Autofill'; // Text with icon
    icon.style.cursor = 'pointer';
    icon.style.marginLeft = '8px';
    icon.style.padding = '2px 6px';
    icon.style.backgroundColor = '#4285f4';
    icon.style.color = 'white';
    icon.style.borderRadius = '3px';
    icon.style.fontSize = '12px';
    icon.style.fontWeight = '500';
    icon.style.whiteSpace = 'nowrap';
    icon.title = 'Auto-fill available - Click to see options';
    
    // Add click event to show tooltip
    icon.addEventListener('click', function(e) {
      e.stopPropagation();
      showTooltip(icon, input, savedEntry);
    });
    
    return icon;
  }

  // Show tooltip with saved answer and options
  function showTooltip(icon, input, savedEntry) {
    // Remove any existing tooltips
    removeTooltips();
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'autofill-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = '#fff';
    tooltip.style.border = '1px solid #ccc';
    tooltip.style.borderRadius = '6px';
    tooltip.style.padding = '15px';
    tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    tooltip.style.zIndex = '10000';
    tooltip.style.width = '320px';
    tooltip.style.fontFamily = 'sans-serif';
    tooltip.style.fontSize = '14px';
    tooltip.style.boxSizing = 'border-box';
    
    // Position tooltip near the icon
    const rect = icon.getBoundingClientRect();
    const tooltipTop = rect.bottom + window.scrollY + 5;
    const tooltipLeft = rect.left + window.scrollX;
    
    // Adjust position if tooltip would go off screen
    tooltip.style.top = tooltipTop + 'px';
    tooltip.style.left = tooltipLeft + 'px';
    
    // Check if tooltip would go off the right edge of the screen
    const tooltipRight = tooltipLeft + 320; // 320px is the width
    if (tooltipRight > window.innerWidth) {
      tooltip.style.left = (window.innerWidth - 320 - 10) + 'px';
    }
    
    // Check if tooltip would go off the bottom of the screen
    const tooltipHeight = 250; // Approximate height
    const tooltipBottom = tooltipTop + tooltipHeight;
    if (tooltipBottom > window.innerHeight + window.scrollY) {
      tooltip.style.top = (rect.top + window.scrollY - tooltipHeight - 5) + 'px';
    }
    
    // Add header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '12px';
    header.style.paddingBottom = '8px';
    header.style.borderBottom = '1px solid #eee';
    
    const title = document.createElement('strong');
    title.textContent = 'Auto-fill Suggestion';
    title.style.color = '#333';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '0';
    closeBtn.style.width = '24px';
    closeBtn.style.height = '24px';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.style.borderRadius = '50%';
    closeBtn.addEventListener('click', function() {
      document.body.removeChild(tooltip);
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    tooltip.appendChild(header);
    
    // Add saved answer
    const answerLabel = document.createElement('div');
    answerLabel.textContent = 'Saved Answer:';
    answerLabel.style.fontSize = '12px';
    answerLabel.style.fontWeight = '600';
    answerLabel.style.color = '#666';
    answerLabel.style.marginBottom = '5px';
    tooltip.appendChild(answerLabel);
    
    const answerDiv = document.createElement('div');
    answerDiv.textContent = savedEntry.answer;
    answerDiv.style.marginBottom = '15px';
    answerDiv.style.padding = '10px';
    answerDiv.style.backgroundColor = '#f9f9f9';
    answerDiv.style.borderRadius = '4px';
    answerDiv.style.maxHeight = '100px';
    answerDiv.style.overflowY = 'auto';
    answerDiv.style.wordBreak = 'break-word';
    answerDiv.style.lineHeight = '1.4';
    tooltip.appendChild(answerDiv);
    
    // Add buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    
    // Fill button
    const fillButton = document.createElement('button');
    fillButton.textContent = 'Fill Answer';
    fillButton.style.flex = '1';
    fillButton.style.padding = '8px 12px';
    fillButton.style.backgroundColor = '#f1f1f1';
    fillButton.style.border = '1px solid #ddd';
    fillButton.style.borderRadius = '4px';
    fillButton.style.cursor = 'pointer';
    fillButton.style.fontWeight = '500';
    fillButton.addEventListener('click', function() {
      input.value = savedEntry.answer;
      document.body.removeChild(tooltip);
      showToast('Answer filled successfully');
    });
    buttonContainer.appendChild(fillButton);
    
    // Rewrite & Fill button
    const rewriteButton = document.createElement('button');
    rewriteButton.textContent = 'Rewrite & Fill';
    rewriteButton.style.flex = '1';
    rewriteButton.style.padding = '8px 12px';
    rewriteButton.style.backgroundColor = '#4285f4';
    rewriteButton.style.color = 'white';
    rewriteButton.style.border = 'none';
    rewriteButton.style.borderRadius = '4px';
    rewriteButton.style.cursor = 'pointer';
    rewriteButton.style.fontWeight = '500';
    rewriteButton.addEventListener('click', function() {
      // Show loading indicator
      const originalText = rewriteButton.textContent;
      rewriteButton.textContent = 'Rewriting...';
      rewriteButton.disabled = true;
      rewriteButton.style.opacity = '0.7';
      
      // Show loading toast
      showToast('Rewriting with AI...');
      
      // In a real implementation, this would call your AI service
      // For now, we'll simulate with a timeout
      setTimeout(function() {
        // Simulate AI rewrite (in reality, you would call your AI service here)
        const rewrittenText = savedEntry.answer + " (AI enhanced version)";
        input.value = rewrittenText;
        document.body.removeChild(tooltip);
        showToast('Answer rewritten and filled');
      }, 2000);
    });
    buttonContainer.appendChild(rewriteButton);
    
    tooltip.appendChild(buttonContainer);
    
    // Add to document
    document.body.appendChild(tooltip);
    
    // Close tooltip when clicking elsewhere
    setTimeout(function() {
      document.addEventListener('click', function closeTooltip(e) {
        if (!tooltip.contains(e.target) && e.target !== icon) {
          if (document.body.contains(tooltip)) {
            document.body.removeChild(tooltip);
          }
          document.removeEventListener('click', closeTooltip);
        }
      });
    }, 0);
  }

  // Remove any existing tooltips
  function removeTooltips() {
    const tooltips = document.querySelectorAll('.autofill-tooltip');
    tooltips.forEach(tooltip => {
      if (document.body.contains(tooltip)) {
        document.body.removeChild(tooltip);
      }
    });
  }

  // Show simple toast notification
  function showToast(message) {
    // Remove any existing toast
    const existingToast = document.querySelector('.autofill-toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'autofill-toast';
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '10001';
    toast.style.fontFamily = 'sans-serif';
    toast.style.fontSize = '14px';
    toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    toast.style.maxWidth = '300px';
    toast.style.wordBreak = 'break-word';
    
    // Add to document
    document.body.appendChild(toast);
    
    // Remove after delay
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }
    }, 3000);
  }

  // Process input fields and add autofill functionality
  function processInputFields() {
    // Get saved entries from storage
    chrome.storage.sync.get(['savedEntries'], function(result) {
      const savedEntries = result.savedEntries || [];
      
      if (savedEntries.length === 0) return; // No saved entries to work with
      
      // Select all text input fields
      const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
      
      inputs.forEach(input => {
        // Get the associated question
        let question = '';
        
        // Try to find a label with the 'for' attribute pointing to this input
        const id = input.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) {
            question = label.textContent.trim();
          }
        }
        
        // If not found, try to find the closest preceding label
        if (!question) {
          let sibling = input.previousElementSibling;
          while (sibling) {
            if (sibling.tagName === 'LABEL') {
              question = sibling.textContent.trim();
              break;
            }
            sibling = sibling.previousElementSibling;
          }
        }
        
        // Check parent elements for labels
        if (!question) {
          const parent = input.parentElement;
          if (parent) {
            const label = parent.querySelector('label');
            if (label) {
              question = label.textContent.trim();
            }
          }
        }
        
        // If we have a question, try to find a matching saved entry
        if (question) {
          const bestMatch = findBestMatch(question, savedEntries);
          
          if (bestMatch) {
            // Create and inject the autofill icon
            const icon = createAutofillIcon(input, bestMatch);
            input.parentNode.insertBefore(icon, input.nextSibling);
          }
        }
      });
    });
  }

  // Initialize when the DOM is loaded with error handling
  function init() {
    try {
      processInputFields();
    } catch (error) {
      console.warn('Autofill injector initialization failed:', error);
    }
  }
  
  // Also process fields when the page content changes dynamically
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is an input field or contains input fields
            if (node.matches && node.matches('input[type="text"], input[type="email"], input[type="tel"], textarea')) {
              // Process this specific input
              processSingleInput(node);
            } else {
              // Check if the node contains input fields
              const inputs = node.querySelectorAll && node.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
              if (inputs && inputs.length > 0) {
                inputs.forEach(processSingleInput);
              }
            }
          }
        });
      }
    });
  });
  
  // Function to process a single input field
  function processSingleInput(input) {
    // Skip if already processed
    if (input.nextSibling && input.nextSibling.classList && input.nextSibling.classList.contains('autofill-icon')) {
      return;
    }
    
    // Get saved entries from storage
    chrome.storage.sync.get(['savedEntries'], function(result) {
      const savedEntries = result.savedEntries || [];
      
      if (savedEntries.length === 0) return; // No saved entries to work with
      
      // Get the associated question
      let question = '';
      
      // Try to find a label with the 'for' attribute pointing to this input
      const id = input.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) {
          question = label.textContent.trim();
        }
      }
      
      // If not found, try to find the closest preceding label
      if (!question) {
        let sibling = input.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === 'LABEL') {
            question = sibling.textContent.trim();
            break;
          }
          sibling = sibling.previousElementSibling;
        }
      }
      
      // Check parent elements for labels
      if (!question) {
        const parent = input.parentElement;
        if (parent) {
          const label = parent.querySelector('label');
          if (label) {
            question = label.textContent.trim();
          }
        }
      }
      
      // If we have a question, try to find a matching saved entry
      if (question) {
        const bestMatch = findBestMatch(question, savedEntries);
        
        if (bestMatch) {
          // Create and inject the autofill icon
          const icon = createAutofillIcon(input, bestMatch);
          icon.classList.add('autofill-icon'); // Add class to identify processed icons
          input.parentNode.insertBefore(icon, input.nextSibling);
        }
      }
    });
  }
  
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