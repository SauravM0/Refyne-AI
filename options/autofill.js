let currentEditIndex = null;

// Load state on page load
document.addEventListener('DOMContentLoaded', function() {
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
  // Load the recording toggle state
  chrome.storage.sync.get(['recordFormData'], function(result) {
    const recordToggle = document.getElementById('record-toggle');
    if (result.recordFormData !== undefined) {
      recordToggle.checked = result.recordFormData;
    } else {
      // Default to false if not set
      recordToggle.checked = false;
    }
  });

  // Load saved Q&A pairs
  loadSavedEntries();

  // Add event listener to the toggle
  const recordToggle = document.getElementById('record-toggle');
  recordToggle.addEventListener('change', function() {
    chrome.storage.sync.set({recordFormData: this.checked});
    
    // Show notification
    showToast(this.checked ? 'Recording enabled' : 'Recording disabled', 'success');
  });

  // Add event listener for the "Add New" button
  document.getElementById('add-new-entry').addEventListener('click', function() {
    openEntryModal();
  });

  // Add event listener for the entry form
  document.getElementById('entry-form').addEventListener('submit', function(e) {
    e.preventDefault();
    saveEntry();
  });

  // Add event listener for the cancel button in the modal
  document.getElementById('cancel-entry').addEventListener('click', function() {
    closeEntryModal();
  });

  // Add event listener for the close button in the modal
  document.querySelector('#entry-modal .close').addEventListener('click', function() {
    closeEntryModal();
  });

  // Add event listener for the accordion
  document.querySelector('.accordion-header').addEventListener('click', function() {
    this.classList.toggle('active');
    const content = this.nextElementSibling;
    content.classList.toggle('expanded');
    
    // Add animation effect
    if (this.classList.contains('active')) {
      this.style.transform = 'scale(1.02)';
      setTimeout(() => {
        this.style.transform = '';
      }, 300);
    }
  });

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('entry-modal');
    if (event.target === modal) {
      closeEntryModal();
    }
  });

  // Handle ESC key to close modal
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const modal = document.getElementById('entry-modal');
      if (modal.style.display === 'block') {
        closeEntryModal();
      }
    }
  });

  // Handle window resize for modal
  window.addEventListener('resize', function() {
    const modal = document.getElementById('entry-modal');
    if (modal.style.display === 'block') {
      // Ensure modal stays within bounds
      const modalContent = modal.querySelector('.modal-content');
      if (window.innerWidth < 768) {
        modalContent.style.width = '95%';
      } else {
        modalContent.style.width = '90%';
        modalContent.style.maxWidth = '500px';
      }
    }
  });
});

// Load and render saved entries
function loadSavedEntries() {
  chrome.storage.sync.get(['savedEntries'], function(result) {
    const savedEntries = result.savedEntries || [];
    renderEntries(savedEntries);
  });
}

// Render saved entries
function renderEntries(entries) {
  const listContainer = document.getElementById('autofill-list');
  const emptyState = document.getElementById('empty-state');
  
  // Clear existing entries
  listContainer.innerHTML = '';
  
  if (entries.length === 0) {
    // Show empty state
    emptyState.style.display = 'block';
    return;
  }
  
  // Hide empty state
  emptyState.style.display = 'none';

  const template = document.getElementById('entry-template');

  entries.forEach((entry, index) => {
    const entryClone = template.content.cloneNode(true);
    
    // Set question and answer text
    entryClone.querySelector('.question-text').textContent = entry.question;
    entryClone.querySelector('.answer-text').textContent = entry.answer;
    
    // Add event listeners to buttons
    entryClone.querySelector('.delete-btn').addEventListener('click', function() {
      deleteEntry(index);
    });
    
    entryClone.querySelector('.edit-btn').addEventListener('click', function() {
      editEntry(entry, index);
    });
    
    const entryElement = entryClone.firstElementChild;
    entryElement.style.opacity = '0';
    entryElement.style.transform = 'translateX(20px)';
    
    listContainer.appendChild(entryClone);
    
    // Add animation
    setTimeout(() => {
      entryElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      entryElement.style.opacity = '1';
      entryElement.style.transform = 'translateX(0)';
    }, 50 * index);
  });
}

// Delete an entry
function deleteEntry(index) {
  if (!confirm('Are you sure you want to delete this saved answer?')) {
    return;
  }
  
  chrome.storage.sync.get(['savedEntries'], function(result) {
    const savedEntries = result.savedEntries || [];
    savedEntries.splice(index, 1);
    chrome.storage.sync.set({savedEntries: savedEntries}, function() {
      loadSavedEntries(); // Re-render the list
      showToast('Entry deleted', 'success');
    });
  });
}

// Edit an entry
function editEntry(entry, index) {
  currentEditIndex = index;
  document.getElementById('modal-title').textContent = 'Edit Entry';
  document.getElementById('entry-question').value = entry.question;
  document.getElementById('entry-answer').value = entry.answer;
  document.getElementById('entry-modal').style.display = 'block';
  
  // Focus on the question field
  setTimeout(() => {
    document.getElementById('entry-question').focus();
  }, 100);
}

// Open the entry modal for adding a new entry
function openEntryModal() {
  currentEditIndex = null;
  document.getElementById('modal-title').textContent = 'Add New Entry';
  document.getElementById('entry-question').value = '';
  document.getElementById('entry-answer').value = '';
  document.getElementById('entry-modal').style.display = 'block';
  
  // Focus on the question field
  setTimeout(() => {
    document.getElementById('entry-question').focus();
  }, 100);
}

// Close the entry modal
function closeEntryModal() {
  document.getElementById('entry-modal').style.display = 'none';
  document.getElementById('entry-form').reset();
}

// Save an entry (either new or edited)
function saveEntry() {
  const question = document.getElementById('entry-question').value.trim();
  const answer = document.getElementById('entry-answer').value.trim();
  
  if (!question || !answer) {
    showToast('Please fill in both question and answer', 'error');
    return;
  }
  
  chrome.storage.sync.get(['savedEntries'], function(result) {
    const savedEntries = result.savedEntries || [];
    
    if (currentEditIndex !== null) {
      // Editing existing entry
      savedEntries[currentEditIndex] = { question, answer };
    } else {
      // Adding new entry
      savedEntries.push({ question, answer });
    }
    
    chrome.storage.sync.set({savedEntries: savedEntries}, function() {
      loadSavedEntries(); // Re-render the list
      closeEntryModal();
      showToast(currentEditIndex !== null ? 'Entry updated' : 'Entry added', 'success');
    });
  });
}

// Show toast notification
function showToast(message, type) {
  // Remove any existing toast
  const existingToast = document.getElementById('toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  // Add to document
  document.body.appendChild(toast);
  
  // Show toast with animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  // Hide toast after delay with animation
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}