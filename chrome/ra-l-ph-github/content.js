/**
 * @file Content script for the RA-L-PH GitHub Profile Styler extension.
 * This script uses a state-based approach with a MutationObserver to restructure
 * the DOM into a two-column layout and move user info into the sidebar.
 * This method is robust against GitHub's dynamic page loading.
 */

const TARGET_USERNAME = 'RA-L-PH';

/**
 * Checks if the current page is the target GitHub profile page.
 * @returns {boolean} True if the URL matches the target profile.
 */
function isTargetProfilePage() {
    return window.location.hostname === 'github.com' &&
        window.location.pathname.toLowerCase().startsWith(`/${TARGET_USERNAME.toLowerCase()}`);
}

/**
 * Creates and injects the full custom layout. This function finds all necessary
 * original elements, clones them into the new layout, and then replaces the
 * original page content. It's designed to run only when the custom layout is absent.
 */
function buildAndInjectLayout() {
    // 1. Pre-flight checks:
    if (document.querySelector('.ghps-custom-root') || !isTargetProfilePage()) {
        return;
    }

    // 2. Find all essential source elements from the original GitHub page.
    const mainContentContainer = document.querySelector('.Layout-main') || document.querySelector('main');
    const avatarImg = document.querySelector('img.avatar-user, .avatar.avatar-user');
    const navContainer = document.querySelector('.UnderlineNav');
    const nameAndUsername = document.querySelector('.vcard-names-container');
    const bio = document.querySelector('.user-profile-bio');
    const followerInfo = document.querySelector('div.mb-3 > a[href*="followers"]')?.parentElement;
    const otherDetails = document.querySelector('.vcard-details');

    // If any of these core elements aren't found, the page isn't fully loaded.
    if (!mainContentContainer || !avatarImg || !navContainer || !nameAndUsername) {
        return;
    }

    console.log('RA-L-PH Styler: Building and injecting custom layout...');

    // 3. Create the new DOM structure.
    const customRoot = document.createElement('div');
    customRoot.className = 'ghps-custom-root';

    const sidebar = document.createElement('aside');
    sidebar.className = 'ghps-sidebar';

    const rightContent = document.createElement('div');
    rightContent.className = 'ghps-custom-right';

    // 4. Populate the sidebar with cloned elements.
    // -- Avatar --
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'ghps-avatar-wrap';
    avatarWrap.appendChild(avatarImg.cloneNode(true));
    sidebar.appendChild(avatarWrap);

    // -- User Info Container --
    const userInfoContainer = document.createElement('div');
    userInfoContainer.className = 'ghps-user-info';
    userInfoContainer.appendChild(nameAndUsername.cloneNode(true));
    if (bio) userInfoContainer.appendChild(bio.cloneNode(true));
    if (followerInfo) userInfoContainer.appendChild(followerInfo.cloneNode(true));
    if (otherDetails) userInfoContainer.appendChild(otherDetails.cloneNode(true));
    sidebar.appendChild(userInfoContainer);

    // -- Navigation --
    const navList = document.createElement('ul');
    navList.className = 'ghps-sidebar-nav';

    // *** FIX: Select only the links that are NOT menu items to avoid duplication ***
    const navLinks = navContainer.querySelectorAll('a:not([role="menuitem"])');

    for (let i = 0; i < navLinks.length && i < 5; i++) {
        const link = navLinks[i];
        const li = document.createElement('li');
        const linkClone = link.cloneNode(true);
        const icon = linkClone.querySelector('svg');
        if (icon) icon.remove(); // Remove icon as requested
        linkClone.classList.add('ghps-sidebar-link');
        li.appendChild(linkClone);
        navList.appendChild(li);
    }
    sidebar.appendChild(navList);

    // 5. Assemble and Inject the Layout.
    rightContent.appendChild(mainContentContainer);
    customRoot.appendChild(sidebar);
    customRoot.appendChild(rightContent);

    const pageContainer = document.querySelector('.application-main .container-xl') || document.body;
    pageContainer.innerHTML = ''; // Clear the original content
    pageContainer.appendChild(customRoot);

    // 6. Add classes to the root element to activate styles.
    document.documentElement.classList.add('gh-profile-styler-applied', 'ghps-two-column');
}

/**
 * Sets up a MutationObserver to watch for DOM changes. This is the engine
 * that drives the script, ensuring the layout is applied correctly after
 * any client-side navigation.
 */
function initializeStyler() {
    const observer = new MutationObserver(() => {
        requestAnimationFrame(buildAndInjectLayout);
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Run an initial attempt
    requestAnimationFrame(buildAndInjectLayout);
}

// Start the entire process.
initializeStyler();