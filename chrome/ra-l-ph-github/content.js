/**
 * @file Content script for the RA-L-PH GitHub Profile Styler extension.
 * This script waits for the profile page to load, then restructures the DOM
 * to create a two-column layout as defined in the user's sketch.
 * It uses a MutationObserver to ensure the layout persists through GitHub's
 * client-side navigation.
 */

const TARGET_USERNAME = 'RA-L-PH';
const LAYOUT_APPLIED_CLASS = 'ghps-layout-applied';

/**
 * Checks if the current page is the target GitHub profile page.
 * @returns {boolean} True if the URL matches the target profile.
 */
function isTargetProfilePage() {
    // Ensure we are on github.com and the path starts with the target username.
    return window.location.hostname === 'github.com' &&
        window.location.pathname.toLowerCase().startsWith(`/${TARGET_USERNAME.toLowerCase()}`);
}

/**
 * The main function to create and inject the two-column layout.
 * It finds the necessary elements on the original page (avatar, nav, main content),
 * creates the new sidebar and content areas, and moves the original elements into them.
 */
function applyCustomLayout() {
    // 1. Pre-flight checks: Only run on the target profile and if the layout isn't already applied.
    if (!isTargetProfilePage() || document.body.classList.contains(LAYOUT_APPLIED_CLASS)) {
        return;
    }

    console.log('RA-L-PH Styler: Applying custom layout...');

    // 2. Find the essential source elements from the original GitHub page.
    // We use multiple selectors for resilience against GitHub UI updates.
    const mainContentContainer = document.querySelector('.Layout-main') || document.querySelector('main');
    const avatarImg = document.querySelector('img.avatar-user, .avatar.avatar-user');
    const navContainer = document.querySelector('.UnderlineNav');

    // If any of these core elements aren't found, we can't build the layout.
    if (!mainContentContainer || !avatarImg || !navContainer) {
        console.log('RA-L-PH Styler: Could not find essential elements to build layout. Aborting.');
        return;
    }

    // 3. Create the new DOM structure for our custom layout.
    // This is the main grid container.
    const customRoot = document.createElement('div');
    customRoot.className = 'ghps-custom-root';

    // This is the left sidebar.
    const sidebar = document.createElement('aside');
    sidebar.className = 'ghps-sidebar';

    // This is the right-hand content area.
    const rightContent = document.createElement('div');
    rightContent.className = 'ghps-custom-right';

    // 4. Populate the sidebar.
    // Create and add the avatar.
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'ghps-avatar-wrap';
    const avatarClone = avatarImg.cloneNode(true);
    avatarClone.classList.add('ghps-avatar');
    avatarWrap.appendChild(avatarClone);
    sidebar.appendChild(avatarWrap);

    // Create and add the vertical navigation.
    const navList = document.createElement('ul');
    navList.className = 'ghps-sidebar-nav';
    const navLinks = navContainer.querySelectorAll('a');

    navLinks.forEach(link => {
        const li = document.createElement('li');
        const linkClone = link.cloneNode(true);
        linkClone.classList.add('ghps-sidebar-link');
        // Remove GitHub's specific styling classes to avoid conflicts.
        linkClone.classList.remove('selected', 'UnderlineNav-item');
        li.appendChild(linkClone);
        navList.appendChild(li);
    });
    sidebar.appendChild(navList);


    // 5. Assemble the new layout.
    // Move the original main content into our new right-hand container.
    rightContent.appendChild(mainContentContainer);

    // Add the sidebar and the right content area to our root grid container.
    customRoot.appendChild(sidebar);
    customRoot.appendChild(rightContent);

    // 6. Inject the new layout into the page.
    // Find the overall page container to inject our layout into.
    const pageContainer = document.querySelector('.application-main .container-xl') || document.body;
    // Clear the container and add our new layout.
    pageContainer.innerHTML = '';
    pageContainer.appendChild(customRoot);


    // 7. Add classes to the <html> and <body> elements to activate the CSS styles.
    document.documentElement.classList.add('gh-profile-styler-applied');
    document.body.classList.add(LAYOUT_APPLIED_CLASS, 'ghps-two-column');
}

/**
 * Sets up a MutationObserver to watch for DOM changes.
 * This is crucial for Single Page Applications (SPAs) like GitHub where
 * navigation doesn't trigger a full page reload. The observer will re-apply
 * the layout if it gets removed during a client-side navigation event.
 */
function observeDOMChanges() {
    const observer = new MutationObserver((mutationsList, obs) => {
        // A simple check: if our layout root is no longer in the document, re-run the layout function.
        if (!document.querySelector('.ghps-custom-root')) {
            // We disconnect the observer temporarily to avoid infinite loops while we modify the DOM.
            obs.disconnect();
            // Re-apply the layout.
            run();
            // Reconnect the observer once we're done.
            obs.observe(document.body, { childList: true, subtree: true });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Main execution function.
 * Waits for the page to be fully loaded before attempting to apply the layout.
 */
function run() {
    // The `requestAnimationFrame` ensures we wait for the browser to finish its
    // current painting cycle, which can prevent issues on complex pages like GitHub.
    requestAnimationFrame(applyCustomLayout);
}

// Initial run when the script is first injected.
run();

// Set up the observer to handle subsequent page navigations.
observeDOMChanges();
