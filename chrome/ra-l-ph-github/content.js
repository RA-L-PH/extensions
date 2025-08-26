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
  const root = document.documentElement;
  root.classList.add(NAMESPACE_CLASS);
  // restore toggle state
  if (localStorage.getItem('ghps-disabled') === '1') root.classList.add('ghps-disabled');

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
  // Add classes to pinned items and repo list items when present
  const pinned = document.querySelectorAll('.pinned-item-list-item, .pinned-item');
  pinned.forEach(p => p.classList.add('ghps-pinned'));
  const repoItems = document.querySelectorAll('.repo-list-item, .col-12.d-block.width-full.py-4.border-bottom');
  repoItems.forEach(r => r.classList.add('ghps-repo-item'));
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

// Move contributions block below highlights and bring any right-side legend to the top of the graph
function rearrangeContributions() {
  if (!isTargetProfile()) return;

  // Find contributions container (several possible selectors used by GitHub over time)
  const contributions = document.querySelector('.js-yearly-contributions, #contributions, .js-contribution-graph, .ContributionCalendar');
  if (!contributions) return;

  // Find a suitable "highlights" area to place contributions after. Try common selectors and fall back to header area.
  const highlightsSelectors = ['.js-profile-editable-area', '.profile-highlight', '.js-profile-header', '.vcard-names', '.gh-profile-highlights'];
  let highlights = null;
  for (const sel of highlightsSelectors) {
    const el = document.querySelector(sel);
    if (el) { highlights = el; break; }
  }

  // If we found highlights and contributions isn't already after it, move it.
  if (highlights) {
    // If contributions is a descendant of highlights, do nothing
    if (!highlights.contains(contributions)) {
      try {
        highlights.parentNode.insertBefore(contributions, highlights.nextSibling);
        contributions.classList.add('ghps-moved-below-highlights');
      } catch (e) {
        // ignore DOM exceptions
      }
    }
  }

  // Detect any child of the contributions container that is visually placed on the right side
  // and move it to the top of the contributions container.
  try {
    const cRect = contributions.getBoundingClientRect();
    const children = Array.from(contributions.children || []);
    for (const child of children) {
      const r = child.getBoundingClientRect();
      // If a child is significantly to the right of the container, treat it as the legend/right-side element
      if (r.left > cRect.left + cRect.width * 0.6) {
        contributions.insertBefore(child, contributions.firstChild);
        child.classList.add('ghps-years-top');
        break;
      }
    }
  } catch (e) {
    // ignore layout calc errors
  }
}

// Run rearrange logic after applying classes and on navigation
setTimeout(rearrangeContributions, 250);
window.addEventListener('popstate', () => setTimeout(rearrangeContributions, 300));

// Intersection observer to reveal repo cards with animation
function observeRepoCards() {
  if (!isTargetProfile()) return;
  const cards = document.querySelectorAll('.repo-card, .repo-list-item, .pinned-item-list-item, .col-12.d-block.width-full.py-4.border-bottom');
  if (!cards || cards.length === 0) return;

  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('ghps-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  cards.forEach(c => {
    if (!c.classList.contains('ghps-visible')) io.observe(c);
  });
}

// Floating toggle injected into page to disable/enable the profile styling
function injectToggle() {
  if (!isTargetProfile()) return;
  if (document.querySelector('.ghps-toggle')) return; // already injected

  const btn = document.createElement('button');
  btn.className = 'ghps-toggle';
  btn.title = 'Toggle profile styling';
  // reflect persisted state
  const root = document.documentElement;
  btn.innerText = root.classList.contains('ghps-disabled') ? 'Enable' : 'Style';
  btn.addEventListener('click', () => {
    root.classList.toggle('ghps-disabled');
    const disabled = root.classList.contains('ghps-disabled');
    btn.innerText = disabled ? 'Enable' : 'Style';
    localStorage.setItem('ghps-disabled', disabled ? '1' : '0');
  });

  document.body.appendChild(btn);
}

// Ensure observe/inject run after layout changes
setTimeout(observeRepoCards, 400);
setTimeout(injectToggle, 300);
window.addEventListener('popstate', () => { setTimeout(observeRepoCards, 350); setTimeout(injectToggle, 350); });

// Inject a simple left sidebar (avatar + vertical nav) to create a two-column profile layout
function injectLeftSidebar() {
  if (!isTargetProfile()) return;
  if (document.querySelector('.ghps-sidebar')) return; // already injected

  // Find a logical layout container to receive the sidebar. GitHub typically uses a .Layout element
  const layout = document.querySelector('.Layout') || document.querySelector('.application-main') || document.querySelector('.container-lg');
  if (!layout) return;

  // Create sidebar element
  const sidebar = document.createElement('aside');
  sidebar.className = 'ghps-sidebar';

  // Try to clone existing avatar if present
  const avatar = document.querySelector('img.avatar-user, .avatar .avatar-user img, .Avatar img');
  if (avatar) {
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'ghps-avatar-wrap';
    const avatarClone = avatar.cloneNode(true);
    avatarClone.classList.add('ghps-avatar');
    avatarWrap.appendChild(avatarClone);
    sidebar.appendChild(avatarWrap);
  }

  // Get the existing top nav links (Overview / Repositories / Projects / Packages / Stars) if present
  const topNav = document.querySelector('.UnderlineNav') || document.querySelector('.js-profile-editable-area .UnderlineNav');
  const navList = document.createElement('ul');
  navList.className = 'ghps-sidebar-nav';

  const tabs = [
    { label: 'Overview', href: `/${TARGET_USERNAME}` },
    { label: 'Repositories', href: `/${TARGET_USERNAME}?tab=repositories` },
    { label: 'Projects', href: `/${TARGET_USERNAME}?tab=projects` },
    { label: 'Packages', href: `/${TARGET_USERNAME}?tab=packages` },
    { label: 'Stars', href: `/${TARGET_USERNAME}?tab=stars` }
  ];

  // If there's an existing nav, prefer its links/URLs and selected state
  if (topNav) {
    const links = topNav.querySelectorAll('a');
    if (links && links.length) {
      links.forEach(a => {
        const li = document.createElement('li');
        const copy = a.cloneNode(true);
        copy.classList.add('ghps-sidebar-link');
        // Remove underline nav styling that may not fit
        copy.classList.remove('selected');
        li.appendChild(copy);
        navList.appendChild(li);
      });
    }
  }

  // Fallback: build nav from the conservative tab list above
  if (!navList.children.length) {
    for (const t of tabs) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = t.href;
      a.innerText = t.label;
      a.className = 'ghps-sidebar-link';
      li.appendChild(a);
      navList.appendChild(li);
    }
  }

  sidebar.appendChild(navList);

  // Insert the sidebar as the first child of the layout container so CSS grid can arrange it
  layout.insertBefore(sidebar, layout.firstChild);

  // Add a helper class to the root to enable layout CSS
  document.documentElement.classList.add('ghps-two-column');
}

// Robustly ensure the sidebar persists across GitHub's SPA navigation and DOM replacements
function watchLayoutMutations() {
  // Initial attempt
  setTimeout(injectLeftSidebar, 300);

  // Watch for DOM changes that may remove or replace the layout container
  const observer = new MutationObserver((mutations) => {
    // On any significant DOM update, try to ensure the sidebar exists
    // (injection function guards against duplicate insertion)
    injectLeftSidebar();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Keep the sidebar on history navigation too
  window.addEventListener('popstate', () => setTimeout(injectLeftSidebar, 250));
}

watchLayoutMutations();