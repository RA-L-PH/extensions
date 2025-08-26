/**
 * @file Content script for the RA-L-PH GitHub Profile Styler extension.
 * This script waits for the profile page to load, then restructures the DOM
 * to create a two-column layout as defined in the user's sketch.
 * It uses a MutationObserver to ensure the layout persists through GitHub's
 * client-side navigation.
 */

const TARGET_USERNAME = 'RA-L-PH';

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
    // 1. Pre-flight checks: Only run on the target profile.
    // *** EDIT: The primary guard is now to check if our layout already exists. This prevents duplication. ***
    if (document.querySelector('.ghps-custom-root') || !isTargetProfilePage()) {
        return;
    }

    console.log('RA-L-PH Styler: Applying custom layout...');

    // 2. Find the essential source elements from the original GitHub page.
    const mainContentContainer = document.querySelector('.Layout-main') || document.querySelector('main');
    const avatarImg = document.querySelector('img.avatar-user, .avatar.avatar-user');
    const navContainer = document.querySelector('.UnderlineNav');

    // If any of these core elements aren't found, we can't build the layout.
    if (!mainContentContainer || !avatarImg || !navContainer) {
        console.log('RA-L-PH Styler: Could not find essential elements to build layout. Aborting.');
        return;
    }

    // Explicitly hide the original navigation container to prevent it from flashing.
    navContainer.style.display = 'none';

    // 3. Create the new DOM structure for our custom layout.
    const customRoot = document.createElement('div');
    customRoot.className = 'ghps-custom-root';

    const sidebar = document.createElement('aside');
    sidebar.className = 'ghps-sidebar';

    const rightContent = document.createElement('div');
    rightContent.className = 'ghps-custom-right';

    // 4. Populate the sidebar.
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'ghps-avatar-wrap';
    const avatarClone = avatarImg.cloneNode(true);
    avatarClone.classList.add('ghps-avatar');
    avatarWrap.appendChild(avatarClone);
    sidebar.appendChild(avatarWrap);

    const navList = document.createElement('ul');
    navList.className = 'ghps-sidebar-nav';
    const navLinks = navContainer.querySelectorAll('a');

    navLinks.forEach(link => {
        const li = document.createElement('li');
        const linkClone = link.cloneNode(true);

        const icon = linkClone.querySelector('svg');
        if (icon) {
            icon.remove();
        }

        linkClone.classList.add('ghps-sidebar-link');
        linkClone.classList.remove('selected', 'UnderlineNav-item');
        li.appendChild(linkClone);
        navList.appendChild(li);
    });
    sidebar.appendChild(navList);


    // 5. Assemble the new layout.
    rightContent.appendChild(mainContentContainer);
    customRoot.appendChild(sidebar);
    customRoot.appendChild(rightContent);

    // 6. Inject the new layout into the page.
    const pageContainer = document.querySelector('.application-main .container-xl') || document.body;
    pageContainer.innerHTML = '';
    pageContainer.appendChild(customRoot);


    // 7. Add classes to the <html> element to activate the CSS styles.
    document.documentElement.classList.add('gh-profile-styler-applied', 'ghps-two-column');
}

/**
 * Sets up a MutationObserver to watch for DOM changes.
 * This is crucial for Single Page Applications (SPAs) like GitHub where
 * navigation doesn't trigger a full page reload. The observer will re-apply
 * the layout if it gets removed during a client-side navigation event.
 */
function observeDOMChanges() {
    const observer = new MutationObserver(() => {
        // If our layout root is ever removed from the page (e.g., by SPA navigation),
        // we simply try to run the layout function again. The function itself
        // now contains the necessary checks to prevent duplication.
        run();
    });

    // Observe the entire document for changes to the element tree.
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

/**
 * Main execution function.
 * Waits for the page to be ready before attempting to apply the layout.
 */
function run() {
    // Using requestAnimationFrame ensures we don't block the browser's rendering
    // and that the DOM is in a stable state before we try to modify it.
    requestAnimationFrame(applyCustomLayout);
}

// Initial run when the script is first injected.
run();

// Set up the observer to handle subsequent page navigations.
observeDOMChanges();
