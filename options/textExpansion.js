/**
 * Text Expansion Options Page for Refyne Chrome Extension
 * Manages shortcuts and settings for the text expansion feature
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
  const shortcutsList = document.getElementById('shortcutsList');
  const addShortcutBtn = document.getElementById('addShortcut');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const shortcutModal = document.getElementById('shortcutModal');
  const modalTitle = document.getElementById('modalTitle');
  const shortcutForm = document.getElementById('shortcutForm');
  const shortcutTrigger = document.getElementById('shortcutTrigger');
  const shortcutExpansion = document.getElementById('shortcutExpansion');
  const cancelBtn = document.getElementById('cancelBtn');
  const closeBtn = document.querySelector('.close');
  const toast = document.getElementById('toast');
  
  // State
  let textExpansionSettings = {
    enabled: true,
    shortcuts: []
  };
  
  let editingIndex = -1;
  
  // Initialize
  await loadSettings();
  renderShortcuts();
  
  // Event Listeners
  toggleEnabled.addEventListener('change', saveSettings);
  addShortcutBtn.addEventListener('click', openAddModal);
  exportBtn.addEventListener('click', exportShortcuts);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importShortcuts);
  shortcutForm.addEventListener('submit', saveShortcut);
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === shortcutModal) {
      closeModal();
    }
  });
  
  // Load settings from chrome.storage
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['textExpansion']);
      if (result.textExpansion) {
        textExpansionSettings = result.textExpansion;
      }
      
      // Update UI
      toggleEnabled.checked = textExpansionSettings.enabled;
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToast('Failed to load settings', 'error');
    }
  }
  
  // Save settings to chrome.storage
  async function saveSettings() {
    try {
      textExpansionSettings.enabled = toggleEnabled.checked;
      
      await chrome.storage.sync.set({
        textExpansion: textExpansionSettings
      });
      
      showToast('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings', 'error');
    }
  }
  
  // Render shortcuts in the table
  function renderShortcuts() {
    shortcutsList.innerHTML = '';
    
    if (!textExpansionSettings.shortcuts || textExpansionSettings.shortcuts.length === 0) {
      document.getElementById('emptyState').style.display = 'block';
      return;
    }
    
    document.getElementById('emptyState').style.display = 'none';
    
    textExpansionSettings.shortcuts.forEach((shortcut, index) => {
      const row = document.createElement('tr');
      
      // Truncate long expansions for display
      const truncatedExpansion = shortcut.expansion.length > 50 
        ? shortcut.expansion.substring(0, 50) + '...' 
        : shortcut.expansion;
      
      row.innerHTML = `
        <td>${escapeHtml(shortcut.trigger)}</td>
        <td>${escapeHtml(truncatedExpansion)}</td>
        <td class="actions">
          <button class="btn-icon edit-btn" data-index="${index}" title="Edit">
            ✏️
          </button>
          <button class="btn-icon delete-btn" data-index="${index}" title="Delete">
            🗑️
          </button>
        </td>
      `;
      
      // Add animation
      row.style.opacity = '0';
      row.style.transform = 'translateX(20px)';
      
      shortcutsList.appendChild(row);
      
      // Add animation
      setTimeout(() => {
        row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
      }, 50 * index);
    });
    
    // Add event listeners to edit/delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.getAttribute('data-index'));
        openEditModal(index);
      });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.getAttribute('data-index'));
        deleteShortcut(index);
      });
    });
  }
  
  // Open modal for adding a new shortcut
  function openAddModal() {
    editingIndex = -1;
    modalTitle.textContent = 'Add Shortcut';
    shortcutTrigger.value = '';
    shortcutExpansion.value = '';
    shortcutModal.style.display = 'block';
    shortcutTrigger.focus();
  }
  
  // Open modal for editing an existing shortcut
  function openEditModal(index) {
    const shortcut = textExpansionSettings.shortcuts[index];
    if (!shortcut) return;
    
    editingIndex = index;
    modalTitle.textContent = 'Edit Shortcut';
    shortcutTrigger.value = shortcut.trigger;
    shortcutExpansion.value = shortcut.expansion;
    shortcutModal.style.display = 'block';
    shortcutTrigger.focus();
  }
  
  // Close modal
  function closeModal() {
    shortcutModal.style.display = 'none';
    editingIndex = -1;
  }
  
  // Save shortcut (add or edit)
  async function saveShortcut(e) {
    e.preventDefault();
    
    const trigger = shortcutTrigger.value.trim();
    const expansion = shortcutExpansion.value.trim();
    
    // Validation
    if (!trigger || !expansion) {
      showToast('Both shortcut and expansion are required', 'error');
      return;
    }
    
    // Check for duplicate triggers (when adding)
    if (editingIndex === -1) {
      const duplicate = textExpansionSettings.shortcuts.find(
        s => s.trigger.toLowerCase() === trigger.toLowerCase()
      );
      
      if (duplicate) {
        showToast('This shortcut already exists', 'error');
        return;
      }
    }
    
    try {
      if (editingIndex === -1) {
        // Add new shortcut
        textExpansionSettings.shortcuts.push({ trigger, expansion });
      } else {
        // Edit existing shortcut
        textExpansionSettings.shortcuts[editingIndex] = { trigger, expansion };
      }
      
      // Save to storage
      await chrome.storage.sync.set({
        textExpansion: textExpansionSettings
      });
      
      // Update UI
      renderShortcuts();
      closeModal();
      showToast('Shortcut saved successfully');
    } catch (error) {
      console.error('Failed to save shortcut:', error);
      showToast('Failed to save shortcut', 'error');
    }
  }
  
  // Delete shortcut
  async function deleteShortcut(index) {
    if (index < 0 || index >= textExpansionSettings.shortcuts.length) return;
    
    // Confirm deletion
    const shortcut = textExpansionSettings.shortcuts[index];
    if (!confirm(`Are you sure you want to delete the shortcut "${shortcut.trigger}"?`)) {
      return;
    }
    
    try {
      textExpansionSettings.shortcuts.splice(index, 1);
      
      // Save to storage
      await chrome.storage.sync.set({
        textExpansion: textExpansionSettings
      });
      
      // Update UI
      renderShortcuts();
      showToast('Shortcut deleted successfully');
    } catch (error) {
      console.error('Failed to delete shortcut:', error);
      showToast('Failed to delete shortcut', 'error');
    }
  }
  
  // Export shortcuts to JSON file
  function exportShortcuts() {
    try {
      const dataStr = JSON.stringify({
        textExpansion: textExpansionSettings
      }, null, 2);
      
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'refyne-text-expansion-shortcuts.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      showToast('Shortcuts exported successfully');
    } catch (error) {
      console.error('Failed to export shortcuts:', error);
      showToast('Failed to export shortcuts', 'error');
    }
  }
  
  // Import shortcuts from JSON file
  async function importShortcuts(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Validate data structure
          if (!data.textExpansion || !Array.isArray(data.textExpansion.shortcuts)) {
            throw new Error('Invalid file format');
          }
          
          // Merge imported shortcuts with existing ones
          const importedSettings = data.textExpansion;
          textExpansionSettings.enabled = importedSettings.enabled;
          textExpansionSettings.shortcuts = importedSettings.shortcuts;
          
          // Save to storage
          await chrome.storage.sync.set({
            textExpansion: textExpansionSettings
          });
          
          // Update UI
          toggleEnabled.checked = textExpansionSettings.enabled;
          renderShortcuts();
          showToast('Shortcuts imported successfully');
        } catch (parseError) {
          console.error('Failed to parse import file:', parseError);
          showToast('Invalid file format', 'error');
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Failed to import shortcuts:', error);
      showToast('Failed to import shortcuts', 'error');
    }
    
    // Reset file input
    event.target.value = '';
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
  
  // Helper function to escape HTML
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});