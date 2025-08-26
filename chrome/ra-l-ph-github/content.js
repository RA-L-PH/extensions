// Content script for GitHub Profile Styler
// Adds a namespaced class to <html> and applies style classes when the expected
// profile elements appear. Uses MutationObserver to handle GitHub's dynamic loading.

const TARGET_USERNAME = 'RA-L-PH';
const NAMESPACE_CLASS = 'gh-profile-styler-applied';

function isTargetProfile() {
  // Example URLs:
  // https://github.com/RA-L-PH
  // https://github.com/RA-L-PH?tab=repositories
  const path = location.pathname.toLowerCase();
  return path === `/${TARGET_USERNAME.toLowerCase()}` || path.startsWith(`/${TARGET_USERNAME.toLowerCase()}/`);
}

function applyWhenReady() {
  if (!isTargetProfile()) return;

  // Mark document so CSS selectors can target it
  document.documentElement.classList.add(NAMESPACE_CLASS);

  // Fallback selectors cover variations in GitHub markup/themes
  const headerSelectors = ['.vcard-names', '.p-name', 'h1.vcard-names', '.vcard-fullname', 'h1[itemprop="name"]'];
  const bioSelectors = ['.user-profile-bio', '.p-note', '.bio', '.vcard-bio', '[itemprop="description"]'];

  const tryApply = () => {
    let header = null;
    let bio = null;

    for (const sel of headerSelectors) {
      header = document.querySelector(sel);
      if (header) break;
    }
    for (const sel of bioSelectors) {
      bio = document.querySelector(sel);
      if (bio) break;
    }

    if (header || bio) {
      // Add classes so CSS file can style them without inline styles
      if (header) header.classList.add('ghps-header');
      if (bio) bio.classList.add('ghps-bio');
      return true;
    }
    return false;
  };

  // Try immediately, then watch for changes (SPA navigation on GitHub)
  if (tryApply()) return;

  const observer = new MutationObserver((mutations, obs) => {
    if (tryApply()) {
      obs.disconnect();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// Run when DOM is interactive/complete
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyWhenReady);
} else {
  applyWhenReady();
}

// Also listen for history navigation (GitHub SPA navigation)
window.addEventListener('popstate', () => setTimeout(applyWhenReady, 100));