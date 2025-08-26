/**
 * @file Content script for the RA-L-PH GitHub Profile Styler extension.
 * This script uses a state-based approach with a MutationObserver to restructure
 * the DOM into a two-column layout and move user info into the sidebar.
 * This method is robust against GitHub's dynamic page loading.
 */

const TARGET_USERNAME = 'RA-L-PH';

/**
 * Injects CSS to hide specific elements dynamically. This is more robust
 * than trying to filter elements in JavaScript due to timing issues.
 */
function injectCSS() {
    const styleId = 'ghps-dynamic-styles';
    if (document.getElementById(styleId)) return; // Prevent duplicate injection

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Placeholder for dynamically hiding elements via JavaScript */
    `;
    document.head.appendChild(style);
}

/**
 * Checks if the current page is the target GitHub profile page.
 * @returns {boolean} True if the URL matches the target profile.
 */
function isTargetProfilePage() {
    return window.location.hostname === 'github.com' &&
        window.location.pathname.toLowerCase().startsWith(`/${TARGET_USERNAME.toLowerCase()}`);
}

/**
 * Wait for one or more selectors to appear in the DOM. Resolves when all
 * selectors have at least one matching element, or rejects after timeout.
 * Uses a MutationObserver for efficiency and a quick pre-check to avoid
 * unnecessary observers.
 * @param {string[]} selectors
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function waitForElements(selectors, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        if (!selectors || !selectors.length) return resolve();

        const allPresent = () => selectors.every(s => !!document.querySelector(s));
        if (allPresent()) return resolve();

        const obs = new MutationObserver(() => {
            if (allPresent()) {
                obs.disconnect();
                resolve();
            }
        });

        obs.observe(document.documentElement, { childList: true, subtree: true });

        // Safety timeout
        const to = setTimeout(() => {
            try { obs.disconnect(); } catch (e) {}
            reject(new Error('waitForElements: timeout'));
        }, timeoutMs);

        // If resolved or rejected, clear timeout
        const cleanupResolve = () => clearTimeout(to);
        // Wrap resolve/reject so timeout is cleared in either case
        const origResolve = resolve;
        const origReject = reject;
        resolve = (...args) => { cleanupResolve(); origResolve(...args); };
        reject = (...args) => { cleanupResolve(); origReject(...args); };
    });
}

/**
 * Locate the follow/unfollow form that belongs to the profile header (not
 * the follow buttons in follower lists). Prefer forms that are inside the
 * same header area as the provided name element.
 * @param {HTMLElement} nameEl
 * @returns {HTMLElement|null}
 */
function findProfileFollowForm(nameEl) {
    try {
        const selectors = 'form[action*="/follow"], form.js-user-follow-form, form.js-follow-form, form.follow, form.unfollow';
        const candidates = Array.from(document.querySelectorAll(selectors));
        if (candidates.length === 0) return null;

        if (nameEl) {
            // Prefer a candidate that is inside the same header/h-card as the name
            const nameCard = nameEl.closest('.h-card, .vcard, .vcard-names-container, .js-profile-editable-area, .gh-header-meta');
            if (nameCard) {
                for (const c of candidates) {
                    if (c.closest && c.closest('.h-card') === nameCard) return c;
                    if (c.closest && c.closest('.vcard') === nameCard) return c;
                    if (c.closest && c.closest('.js-profile-editable-area') === nameCard) return c;
                    if (c.closest && c.closest('.gh-header-meta') === nameCard) return c;
                }
            }

            // Next prefer a candidate that is a sibling/descendant of the nameEl's parent
            const parent = nameEl.parentElement;
            if (parent) {
                for (const c of candidates) {
                    if (parent.contains(c) || c.contains(parent)) return c;
                }
            }
        }

        // As a fallback, pick the first candidate that appears visually near
        // the top of the document (header area) by comparing bounding rect Y.
        const withPos = candidates.map(c => {
            let y = 0;
            try { y = c.getBoundingClientRect().top; } catch (e) {}
            return { c, y };
        }).sort((a, b) => a.y - b.y);
        return withPos[0] ? withPos[0].c : candidates[0];
    } catch (e) {
        return null;
    }
}

/**
 * Creates and injects the full custom layout. This function finds all necessary
 * original elements, clones them into the new layout, and then replaces the
 * original page content. It's designed to run only when the custom layout is absent.
 */
function buildAndInjectLayout() {
    if (document.querySelector('.ghps-custom-root') || !isTargetProfilePage()) {
        console.debug('ghps: buildAndInjectLayout skipped (already injected or not target)');
        return;
    }

    const mainContentContainer = document.querySelector('.Layout-main') || document.querySelector('main');
    const avatarImg = document.querySelector('img.avatar-user, .avatar.avatar-user');
        const navContainer = findNavContainer();
    const nameAndUsername = document.querySelector('.vcard-names-container');
    const bio = document.querySelector('.user-profile-bio');
    const followerInfo = document.querySelector('div.mb-3 > a[href*="followers"]')?.parentElement;
    // Try to find the native follow/unfollow form so we can move it (preserve
    // state & handlers) instead of cloning. This avoids swapped states caused
    // by cloning and losing event listeners or attributes.
    const followForm = document.querySelector('form[action*="/follow"], form.js-user-follow-form, form.js-follow-form, form.follow, form.unfollow');
    const otherDetails = document.querySelector('.vcard-details');

    if (!mainContentContainer || !avatarImg || !navContainer || !nameAndUsername) {
        return;
    }

    console.log('RA-L-PH Styler: Building and injecting custom layout...');

    const customRoot = document.createElement('div');
    customRoot.className = 'ghps-custom-root';

    const sidebar = document.createElement('aside');
    sidebar.className = 'ghps-sidebar';

    const rightContent = document.createElement('div');
    rightContent.className = 'ghps-custom-right';

    // Create a profile card that holds avatar + info
    const profileCard = document.createElement('div');
    profileCard.className = 'ghps-profile-card';

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'ghps-avatar-wrap';
    avatarWrap.appendChild(avatarImg.cloneNode(true));
    profileCard.appendChild(avatarWrap);

    const userInfoContainer = document.createElement('div');
    userInfoContainer.className = 'ghps-user-info';
    userInfoContainer.appendChild(nameAndUsername.cloneNode(true));
    if (bio) userInfoContainer.appendChild(bio.cloneNode(true));
    if (followerInfo) userInfoContainer.appendChild(followerInfo.cloneNode(true));
    if (otherDetails) userInfoContainer.appendChild(otherDetails.cloneNode(true));
    // If a native follow form exists, move it into our profile card so that
    // follow/unfollow states and attached event handlers remain intact.
    try {
        if (followForm) {
            // Move the live element instead of cloning. Insert after userInfo.
            const moved = followForm;
            // Normalize placement: if follow form is wrapped, try to move the
            // form itself; otherwise move its closest actionable element.
            profileCard.appendChild(moved);
        }
    } catch (e) {
        console.debug('ghps: failed to move follow form', e);
    }
    profileCard.appendChild(userInfoContainer);

    sidebar.appendChild(profileCard);

    const navList = document.createElement('ul');
    navList.className = 'ghps-sidebar-nav';
    const navLinks = navContainer.querySelectorAll('a');
    for (let i = 0; i < navLinks.length && i < 5; i++) {
        const link = navLinks[i];

        // Skip anchors that are part of a menu (role="menuitem") to avoid
        // cloning dropdown/menu-only items into the sidebar.
        if (link.getAttribute('role') === 'menuitem' || link.closest('[role="menuitem"]')) {
            continue;
        }

    // Avoid cloning a link which is equivalent to an existing cloned link
    if (_myNavHasEquivalentLink(navList, link)) continue;

    const linkClone = link.cloneNode(true);
        const icon = linkClone.querySelector('svg');
        if (icon) icon.remove();
        linkClone.classList.add('ghps-sidebar-link');

        // Preserve selected/active state from the original link so our CSS
        // highlight (aria-current/.selected/.active) applies to the clone.
        try {
            if (link.matches('[aria-current="page"]') || link.getAttribute('aria-current') === 'page') {
                linkClone.setAttribute('aria-current', 'page');
                linkClone.classList.add('selected');
            }
            if (link.classList.contains('selected') || link.classList.contains('active') || link.getAttribute('aria-selected') === 'true') {
                linkClone.classList.add('selected');
                if (link.getAttribute('aria-selected') === 'true') linkClone.setAttribute('aria-selected', 'true');
            }
        } catch (e) {
            // Some nodes may throw on .matches in older browsers; ignore safely.
        }

        navList.appendChild(linkClone);
    }

    // Wrap the nav in its own rounded card for visual separation
    if (navList.children.length > 0) {
        const navCard = document.createElement('div');
        navCard.className = 'ghps-nav-card';
        navCard.appendChild(navList);
        sidebar.appendChild(navCard);
            // Hide the original nav container to prevent leftover spacing
            try {
                navContainer.classList.add('ghps-original-hidden');
                // also walk up and hide any wrapper that may contribute spacing
                const parent = navContainer.parentElement;
                if (parent) parent.classList.add('ghps-original-hidden');
            } catch (e) {}
    }

    // Move the real main content into our right column. Moving prevents the
    // original page from later re-rendering the same content outside our
    // custom layout and avoids duplicate displays on refresh.
    try {
        // mark and move the original main content
        mainContentContainer.classList.add('ghps-clone', 'ghps-moved');
        rightContent.appendChild(mainContentContainer);
    } catch (e) {
        // If moving fails, fall back to cloning
        try {
            const mainClone = mainContentContainer.cloneNode(true);
            mainClone.classList.add('ghps-clone');
            rightContent.appendChild(mainClone);
        } catch (err) {
            console.warn('ghps: failed to move or clone main content', err);
        }
    }

    customRoot.appendChild(sidebar);
    customRoot.appendChild(rightContent);

    const pageContainer = document.querySelector('.application-main .container-xl') || document.body;
    // Insert the custom root at the beginning so it's visible above the original
    pageContainer.insertBefore(customRoot, pageContainer.firstChild);

    document.documentElement.classList.add('gh-profile-styler-applied', 'ghps-two-column');

    // After building the layout, ensure the cloned nav reflects the current
    // active tab (important for client-side navigation where original
    // elements may not be present anymore).
    try {
        console.debug('ghps: calling updateClonedNavSelection after injection');
        updateClonedNavSelection();
    } catch (e) {
        console.warn('ghps: updateClonedNavSelection failed after injection', e);
    }

    // Persistent observer: watch for GitHub re-renders that re-insert original
    // nav/main elements and reclaim/remove them so our layout stays active.
    try {
        if (!window.__ghps_persistent_observer) {
            const reclaim = (node) => {
                try {
                    // Remove or move any nav containers that appear
                    if (node.matches && node.matches('.UnderlineNav, nav.UnderlineNav, .js-profile-nav')) {
                        node.classList.add('ghps-original-hidden');
                        // if it contains useful links, move them into our navList
                        const existing = node.querySelectorAll('a');
                        const myNav = document.querySelector('.ghps-sidebar-nav');
                        if (myNav && existing && existing.length) {
                            existing.forEach(a => {
                                // Skip duplicates
                                if (_myNavHasEquivalentLink(myNav, a)) return;
                                const clone = a.cloneNode(true);
                                const svg = clone.querySelector('svg'); if (svg) svg.remove();
                                clone.classList.add('ghps-sidebar-link');
                                myNav.appendChild(clone);
                            });
                        }
                    }
                    // If a new Layout-main is inserted and it's not our moved one,
                    // move it into our right column so the original layout cannot
                    // overshadow our UI.
                    if (node.matches && node.matches('.Layout-main') && !node.classList.contains('ghps-clone')) {
                        try {
                            node.classList.add('ghps-clone', 'ghps-moved');
                            const right = document.querySelector('.ghps-custom-right');
                            if (right) right.appendChild(node);
                        } catch (e) {
                            // fallback: hide it
                            node.classList.add('ghps-original-hidden');
                        }
                    }
                } catch (e) {}
            };

            const pObserver = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    for (const n of m.addedNodes) {
                        if (!(n instanceof HTMLElement)) continue;
                        reclaim(n);
                        // also check descendants
                        n.querySelectorAll && n.querySelectorAll('.UnderlineNav, .Layout-main, nav.UnderlineNav, .js-profile-nav').forEach(reclaim);
                    }
                    // if our custom root was removed, try to re-inject
                    if (!document.querySelector('.ghps-custom-root')) {
                        setTimeout(buildAndInjectLayout, 80);
                    }
                }
            });
            pObserver.observe(document.documentElement, { childList: true, subtree: true });
            window.__ghps_persistent_observer = pObserver;
            console.debug('ghps: persistent observer installed');
        }
    } catch (e) {
        console.warn('ghps: failed to install persistent observer', e);
    }
}


/**
 * Ensure the Google Fonts link for Protest Revolution is inserted.
 * Injecting a <link> is sometimes allowed where @import in a stylesheet
 * would be blocked by CSP. This is a best-effort approach.
 */
function ensureGoogleFontLink() {
    const href = 'https://fonts.googleapis.com/css2?family=Protest+Revolution&display=swap';
    if (document.querySelector('link[data-ghps-font="protest-revolution"]')) {
        console.debug('ghps: font link already present');
        return;
    }
    try {
        console.debug('ghps: attempting to inject Google Fonts link');
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-ghps-font', 'protest-revolution');
        document.head.appendChild(link);
        console.debug('ghps: font link appended (may be blocked by CSP)');
    } catch (e) {
        console.warn('ghps: failed to append font link', e);
        // Ignore failures — CSP may block this too.
    }
}


/**
 * Load a bundled font file via fetch and register it using the FontFace API.
 * fontPath should be a path relative to the extension root (web_accessible_resources).
 */
async function loadBundledFont(fontName, fontPath) {
    if (!('FontFace' in window)) return;

    try {
        // Resolve extension resource URL. Prefer chrome.runtime.getURL when
        // available (returns a chrome-extension://... URL pointing to the
        // bundled resource). This lets us fetch the font from the extension.
        let url;
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            url = chrome.runtime.getURL(fontPath);
        } else {
            url = new URL(fontPath, location.origin).href;
        }

        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Font fetch failed: ' + resp.status);

        const buffer = await resp.arrayBuffer();
        const font = new FontFace(fontName, buffer);
        await font.load();
    document.fonts.add(font);
    console.debug('ghps: bundled font registered', fontName, 'from', url);
        return font;
    } catch (e) {
        // Try as last resort to load via <style>@font-face with data URL (not implemented here)
    console.warn('ghps: loadBundledFont failed for', fontPath, e);
        throw e;
    }
}


/**
 * Update the cloned sidebar links to reflect the currently active tab.
 * This compares link hrefs and `tab` query params against the current
 * location and sets `aria-current` / `.selected` on the matching clone.
 */
function updateClonedNavSelection() {
    const clones = document.querySelectorAll('.ghps-sidebar-link');
    if (!clones || clones.length === 0) return;

    console.debug('ghps: updateClonedNavSelection running; clones=%d, href=%s', clones.length, location.href);

    // Normalize current location for comparison
    const curUrl = new URL(window.location.href, window.location.origin);
    const curTab = new URLSearchParams(curUrl.search).get('tab');

    // Helper to normalize pathnames (remove trailing slash except for root)
    const normalizePath = (p) => p === '/' ? '/' : p.replace(/\/+$/, '');
    const curPath = normalizePath(curUrl.pathname).toLowerCase();

    clones.forEach(clone => {
        clone.classList.remove('selected');
        clone.removeAttribute('aria-current');
        clone.removeAttribute('aria-selected');

        let href = clone.getAttribute('href') || clone.dataset.href || '';
        if (!href) return;

        // Resolve relative URLs against the page origin
        let linkUrl;
        try {
            linkUrl = new URL(href, window.location.origin);
        } catch (e) {
            return;
        }

        const linkPath = normalizePath(linkUrl.pathname).toLowerCase();
        const linkTab = new URLSearchParams(linkUrl.search).get('tab');

        let matched = false;

        // If the current page includes a `tab` param, only match links that
        // explicitly provide a `tab` and match it. This prevents the Overview
        // (which has no `tab`) from being marked when other tabs are open.
        if (curTab) {
            if (linkTab && linkTab.toLowerCase() === curTab.toLowerCase()) {
                matched = true;
            }
        } else {
            // Current page has no tab (Overview). Match links that also have
            // no `tab` param and whose normalized pathname equals the current one.
            if (!linkTab && linkPath === curPath) {
                matched = true;
            }
        }

        if (matched) {
            clone.classList.add('selected');
            clone.setAttribute('aria-current', 'page');
            console.debug('ghps: matched clone', { href: href, linkTab: linkTab, curTab: curTab });
        }
    });
}


/**
 * Attempt to find the profile nav container using several known selectors.
 */
function findNavContainer() {
    const selectors = [
        '.UnderlineNav',
        'nav.UnderlineNav',
        '.js-profile-nav',
        'nav.BorderGrid-row',
        '.UnderlineNav-body'
    ];
    for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) return el;
    }
    // As a fallback, try to find any nav that contains a link to 'tab=repositories'
    const anchors = document.querySelectorAll('a[href*="?tab="]');
    if (anchors && anchors.length) return anchors[0].closest('nav') || anchors[0].closest('div');
    return document.querySelector('.UnderlineNav');
}

/**
 * Normalize a link href for comparison: resolve relative URLs, remove
 * trailing slashes, lowercase, and include the `tab` query param if present.
 */
function _normalizeLinkHref(href) {
    try {
        const u = new URL(href, window.location.origin);
        const tab = new URLSearchParams(u.search).get('tab') || '';
        const path = u.pathname.replace(/\/+$|\/+$/, '') || '/';
        return (path + (tab ? `?tab=${tab.toLowerCase()}` : '')).toLowerCase();
    } catch (e) {
        return (href || '').toString();
    }
}

/**
 * Return true if myNav already contains a link equivalent to `link`.
 */
function _myNavHasEquivalentLink(myNav, link) {
    if (!myNav || !link) return false;
    const href = link.getAttribute('href') || link.dataset.href || '';
    if (!href) return false;
    const norm = _normalizeLinkHref(href);
    const anchors = myNav.querySelectorAll('a');
    for (const a of anchors) {
        const ah = a.getAttribute('href') || a.dataset.href || '';
        if (!ah) continue;
        if (_normalizeLinkHref(ah) === norm) return true;
    }
    return false;
}

/**
 * Sets up a MutationObserver to watch for DOM changes. This is the engine
 * that drives the script, ensuring the layout is applied correctly after
 * any client-side navigation.
 */
function initializeStyler() {
    injectCSS();
    ensureGoogleFontLink();
    // Attempt to load a bundled font from the extension and register it
    // via the FontFace API. This bypasses the page CSP which blocks
    // external font-src origins.
    try {
        // Prefer loading the bundled Protest Revolution font. This will be
        // registered under the local name 'ProtestRevolutionLocal' and used
        // by our stylesheet where available.
        loadBundledFont('ProtestRevolutionLocal', 'fonts/ProtestRevolution-Regular.ttf').catch(err => {
            console.debug('ghps: bundled font load failed', err);
        });
    } catch (e) {
        console.debug('ghps: loadBundledFont not available', e);
    }

    const observer = new MutationObserver(() => {
        injectCSS();

        const hideMenuItems = () => {
            const menuItems = document.querySelectorAll('.ghps-sidebar-nav li');
            menuItems.forEach(item => {
                const link = item.querySelector('a[role="menuitem"]');
                if (link) {
                    item.style.display = 'none';
                }
            });
        };
        hideMenuItems();
        buildAndInjectLayout();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Wait for likely profile-related elements to appear before first build.
    // This helps on hard refreshes where GitHub's JS hasn't rendered the
    // profile nav/main yet. We attempt a best-effort wait but still fall
    // back to requestAnimationFrame if the selectors don't appear in time.
    waitForElements(['.UnderlineNav', '.Layout-main', 'main'], 12000).then(() => {
        try {
            buildAndInjectLayout();
        } catch (e) {}
    }).catch(() => {
        // If waiting timed out, try a rAF build as a last resort.
        requestAnimationFrame(buildAndInjectLayout);
    });

    // Install an observer focused on profile tab content so we trigger the
    // build only when relevant content arrives (fixes hard-refresh timing).
    observeForProfileContent();
    // Also attempt to build on common lifecycle events (in case initial
    // early attempt missed elements) and keep retrying briefly until the
    // custom layout is present. This ensures refreshes rebuild the layout.
    window.addEventListener('load', () => { console.debug('ghps: load event'); buildAndInjectLayout(); }, { once: true });
    document.addEventListener('DOMContentLoaded', () => { console.debug('ghps: DOMContentLoaded event'); buildAndInjectLayout(); }, { once: true });

    // Retry loop: attempt injection periodically until success or timeout.
    let injectAttempts = 0;
    const maxInjectAttempts = 80; // ~80 * 150ms = 12s total retry window
    const injectInterval = setInterval(() => {
        if (document.querySelector('.ghps-custom-root') || !isTargetProfilePage()) {
            clearInterval(injectInterval);
            return;
        }
        try {
            console.debug('ghps: retrying buildAndInjectLayout (attempt %d)', injectAttempts + 1);
            buildAndInjectLayout();
        } catch (e) {
            // ignore and retry
        }
        injectAttempts++;
        if (injectAttempts > maxInjectAttempts) {
            console.warn('ghps: giving up after', injectAttempts, 'attempts');
            clearInterval(injectInterval);
        }
    }, 150);
}

/**
 * Observe the profile's main content area for the arrival of specific
 * tab content (e.g., repositories list). On detection, trigger layout
 * building. This observer focuses on added nodes to avoid repeated work.
 */
function observeForProfileContent() {
    try {
        const target = document.querySelector('.application-main') || document.documentElement;
        if (!target) return;

        // Keep a small guard so we don't rebuild excessively.
        let lastBuildAt = 0;

        const isProfileTabNode = (node) => {
            if (!(node instanceof HTMLElement)) return false;
            // Common selectors for profile sub-tab content
            if (node.matches && (node.matches('.repo-list') || node.matches('.js-repo-list') || node.matches('.UnderlineNav') || node.matches('.Layout-main') || node.matches('main'))) return true;
            // Also check descendants for repo list containers
            if (node.querySelector && (node.querySelector('.repo-list') || node.querySelector('.js-repo-list') || node.querySelector('[data-tab-item]'))) return true;
            return false;
        };

        const obs = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const n of m.addedNodes) {
                    if (isProfileTabNode(n)) {
                        const now = Date.now();
                        if (now - lastBuildAt < 300) return; // debounce
                        lastBuildAt = now;
                        // small delay to allow GitHub to finish inner rendering
                        setTimeout(() => {
                            try {
                                buildAndInjectLayout();
                                updateClonedNavSelection();
                            } catch (e) {}
                        }, 100);
                        return;
                    }
                }
            }
        });

        obs.observe(target, { childList: true, subtree: true });
        // store so it can be disconnected if needed
        window.__ghps_profile_content_observer = obs;
        console.debug('ghps: profile content observer installed');
    } catch (e) {
        console.warn('ghps: failed to install profile content observer', e);
    }
}

initializeStyler();

// ----- SPA navigation handling: ensure cloned nav updates on history changes -----
(function setupHistoryListener() {
    // Helper that calls our updater when history changes
    function handleNavChange() {
        try {
            // Re-run selection update in a short timeout to allow GitHub's
            // client-side router to settle DOM updates if needed.
            setTimeout(updateClonedNavSelection, 80);
        } catch (e) {}
    }

    // Listen to popstate (back/forward)
    window.addEventListener('popstate', handleNavChange);

    // Monkey-patch pushState/replaceState to detect SPA navigations
    const _push = history.pushState;
    history.pushState = function () {
        _push.apply(this, arguments);
        handleNavChange();
    };
    const _replace = history.replaceState;
    history.replaceState = function () {
        _replace.apply(this, arguments);
        handleNavChange();
    };

    // If the user clicks a cloned link, update selection after click completes
    document.addEventListener('click', function (e) {
        const target = e.target.closest && e.target.closest('.ghps-sidebar-link');
        if (target) {
            // Optimistically highlight the clicked clone so the UI responds
            try {
                target.classList.add('selected');
                target.setAttribute('aria-current', 'page');
            } catch (err) {}

            // Give the router time to update the URL/content, then reconcile
            setTimeout(updateClonedNavSelection, 250);
        }
    }, true);

    // Poll for URL changes as a robust fallback (some SPA navigations
    // don't always invoke pushState/replaceState in observable ways).
    let _lastHref = location.href;
    setInterval(() => {
        if (location.href !== _lastHref) {
            _lastHref = location.href;
            // Small delay to allow DOM to settle
            setTimeout(updateClonedNavSelection, 120);
        }
    }, 120);

    // GitHub uses pjax or turbo-like mechanisms. Listen for their events
    // to know when content has been swapped in during hard navigations
    // or client-side transitions.
    const ghPjaxHandler = () => {
        // Give GitHub's render a bit of time, then rebuild/reconcile
        setTimeout(() => {
            try {
                // On some navigations, new nav/main elements are added.
                // Re-install or refresh the content observer and attempt build
                observeForProfileContent();
                buildAndInjectLayout();
                updateClonedNavSelection();
            } catch (e) {}
        }, 80);
    };

    document.addEventListener('pjax:end', ghPjaxHandler);
    document.addEventListener('pjax:success', ghPjaxHandler);
    document.addEventListener('turbo:load', ghPjaxHandler);
    document.addEventListener('turbo:render', ghPjaxHandler);

    // Also listen to a generic GitHub event where they trigger re-renders
    document.addEventListener('gh-reload', ghPjaxHandler);
})();
