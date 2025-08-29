// popup.js
let selectedFont = 'Open Sans'; // default
let includeIcons = false; // default: do not change icon fonts unless user enables it

document.addEventListener('DOMContentLoaded', function() {
  loadCurrentFont();
  setupFontSelection();
  setupIconToggle();
  setupApplyButton();
  setupResetButton();
});

function loadCurrentFont() {
  chrome.storage.sync.get(['selectedFont', 'includeIcons'], function(result) {
    if (result.selectedFont) {
      selectedFont = result.selectedFont;
      document.getElementById('currentFont').textContent = selectedFont;
      updateSelectedUI();
      loadFontForPreview(selectedFont);
    } else {
      document.getElementById('currentFont').textContent = 'Open Sans (default)';
      loadFontForPreview('Open Sans');
    }

  // Load includeIcons setting (only enable if explicitly true)
  includeIcons = result.includeIcons === true;
  document.getElementById('includeIcons').checked = !!includeIcons;
  });
}

function setupFontSelection() {
  const fontOptions = document.querySelectorAll('.font-option');
  fontOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Remove selected class from all options
      fontOptions.forEach(opt => opt.classList.remove('selected'));
      // Add selected class to clicked option
      this.classList.add('selected');
      selectedFont = this.dataset.font;

      // Preview the font immediately
      loadFontForPreview(selectedFont);
    });
  });
}

function updateSelectedUI() {
  const fontOptions = document.querySelectorAll('.font-option');
  fontOptions.forEach(option => {
    if (option.dataset.font === selectedFont) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

function setupIconToggle() {
  const iconCheckbox = document.getElementById('includeIcons');
  iconCheckbox.addEventListener('change', function() {
    includeIcons = this.checked;
    // Save the setting immediately
    chrome.storage.sync.set({ includeIcons: includeIcons });
  });
}

function setupApplyButton() {
  document.getElementById('applyBtn').addEventListener('click', function() {
    const btn = this;
    const originalText = btn.textContent;
    btn.textContent = 'Applying...';
    btn.disabled = true;

    // Save selected font and includeIcons setting
    chrome.storage.sync.set({
      selectedFont: selectedFont,
      includeIcons: includeIcons
    }, function() {
      // Load Google Font
      loadGoogleFont(selectedFont);
      loadFontForPreview(selectedFont);

      // Notify content script to update font
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateFont',
            font: selectedFont,
            includeIcons: includeIcons
          }, function(response) {
            // Reset button
            btn.textContent = originalText;
            btn.disabled = false;
          });
        } else {
          // Reset button if no active tab
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });

      // Update current font display
      document.getElementById('currentFont').textContent = selectedFont;
    });
  });
}

function setupResetButton() {
  document.getElementById('resetBtn').addEventListener('click', function() {
    const btn = this;
    const originalText = btn.textContent;
    btn.textContent = 'Resetting...';
    btn.disabled = true;

    // Send message to content scripts in all tabs to remove injected styles and font link
    chrome.tabs.query({}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      let remaining = tabs.length;
      const onComplete = () => {
        remaining -= 1;
        if (remaining <= 0) {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      };

      // Send reset message to each tab. Some tabs may not have the content script; ignore errors.
      for (const t of tabs) {
        try {
          chrome.tabs.sendMessage(t.id, { action: 'resetFont' }, function(response) {
            // ignore response; complete when all callbacks return (or fail)
            onComplete();
          });
        } catch (e) {
          // If sendMessage throws (e.g., invalid tab id), still count it as completed
          onComplete();
        }
      }
    });
  });
}

function loadGoogleFont(fontName) {
  // Remove existing Google Fonts link if any
  const existingLink = document.querySelector('link[data-google-font]');
  if (existingLink) {
    existingLink.remove();
  }

  // Create new link for Google Font
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  link.setAttribute('data-google-font', 'true');
  document.head.appendChild(link);
}

// Also load the font for the popup preview
function loadFontForPreview(fontName) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);

  // Apply font to preview element
  const preview = document.getElementById('fontPreview');
  if (preview) {
    preview.style.fontFamily = `"${fontName}", "Segoe UI", Arial, sans-serif`;
  }
}
