// content_script.js
(function() {
  let currentFont = 'Open Sans'; // default

  // Hostname-based skip list for known ad/tracking domains.
  const SKIP_HOSTNAMES = new Set([
    'googleadservices.com',
    'pagead2.googlesyndication.com',
    'google-analytics.com',
    'doubleclick.net'
  ]);

  function hostnameMatchesSkip(hostname) {
    if (!hostname) return false;
    return Array.from(SKIP_HOSTNAMES).some(h => hostname === h || hostname.endsWith('.' + h));
  }

  try {
    // If running inside an iframe that's not the top frame, skip injecting into likely ad/track frames
    if (window.top !== window.self) {
      const host = location.hostname || '';
      if (hostnameMatchesSkip(host)) return;
      // also skip common short path ad frames which may not have a useful hostname
      if (!host) return;
    } else {
      // top frame: skip entirely if hostname matches skip list
      if (hostnameMatchesSkip(location.hostname)) return;
    }
  } catch (e) {
    // cross-origin frames may throw; in that case be conservative and skip injection
    return;
  }

  function getCSSText(font, includeIcons = false) {
    const baseCSS = `:root, html, body, * , *::before, *::after {
      font-family: "${font}", "Segoe UI", Arial, sans-serif !important;
      font-size: inherit !important;
      line-height: inherit !important;
      text-rendering: optimizeLegibility !important;
    }`;

    const iconCSS = includeIcons ? `
    /* Target icon fonts explicitly but exclude Angular Material / MDC ripples (classes starting with "mat-") */
    [class*="icon"]:not([class*="mat-"]), [class^="icon-"]:not([class*="mat-"]),
    [class^="fa-"]:not([class*="mat-"]), .icon:not([class*="mat-"]), .fa:not([class*="mat-"]), .material-icons:not([class*="mat-"]), .glyphicon:not([class*="mat-"]),
    i[class*="icon"]:not([class*="mat-"]), i[class^="fa-"]:not([class*="mat-"]),
    span[class*="icon"]:not([class*="mat-"]), span[class^="fa-"]:not([class*="mat-"]) {
      font-family: "${font}", "Segoe UI", Arial, sans-serif !important;
    }

    /* Target common icon font pseudo-elements but exclude elements with mat- classes */
    .fa:not([class*="mat-"]):before, .fa:not([class*="mat-"]):after,
    .material-icons:not([class*="mat-"]):before, .material-icons:not([class*="mat-"]):after,
    .glyphicon:not([class*="mat-"]):before, .glyphicon:not([class*="mat-"]):after {
      font-family: "${font}", "Segoe UI", Arial, sans-serif !important;
    }` : '';

    return baseCSS + iconCSS;
  }

  function injectGoogleFont(font) {
    // Remove existing Google Fonts link if any
    const existingLink = document.querySelector('link[data-google-font]');
    if (existingLink) {
      existingLink.remove();
    }

    // Create new link for Google Font
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
    link.setAttribute('data-google-font', 'true');
    (document.head || document.documentElement).prepend(link);
  }

  function injectFontStyle(font, includeIcons = false) {
    const cssText = getCSSText(font, includeIcons);

    // Remove existing style if any
    const existingStyle = document.getElementById('advanced-font-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'advanced-font-style';
    style.textContent = cssText;
    (document.head || document.documentElement).prepend(style);
  }

  function applyFont(font, includeIcons = false) {
    currentFont = font;
    injectGoogleFont(font);
    injectFontStyle(font, includeIcons);
  }

  function injectIntoShadowRoot(shadowRoot, font, includeIcons = false) {
    try {
      if (!shadowRoot) return;

      // Remove existing style if any
      const existingStyle = shadowRoot.getElementById('advanced-font-style');
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement('style');
      style.id = 'advanced-font-style';
      style.textContent = getCSSText(font, includeIcons);
      shadowRoot.prepend(style);
    } catch (e) {
      // ignore
    }
  }

  // Walk existing elements to find shadow roots
  function walkAndInject(root, font, includeIcons = false) {
    try {
      const walker = (root.createTreeWalker ? root.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false) : null);
      if (!walker) return;
      let node = walker.nextNode();
      while (node) {
        if (node.shadowRoot) injectIntoShadowRoot(node.shadowRoot, font, includeIcons);
        node = walker.nextNode();
      }
    } catch (e) {
      // ignore
    }
  }

  // Load saved font from storage
  chrome.storage.sync.get(['selectedFont', 'includeIcons'], function(result) {
    // Only include icons if the stored value is explicitly true.
    const includeIcons = result.includeIcons === true; // default to false
    if (result.selectedFont) {
      applyFont(result.selectedFont, includeIcons);
    } else {
      applyFont('Open Sans', includeIcons); // default
    }

    // Walk existing elements to find shadow roots
    walkAndInject(document, currentFont, includeIcons);

    // Observe for newly attached shadow roots and new nodes
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n && n.nodeType === 1) {
            if (n.shadowRoot) injectIntoShadowRoot(n.shadowRoot, currentFont, includeIcons);
            // also walk into the subtree to find nested shadow roots
            walkAndInject(n, currentFont, includeIcons);
          }
        }
      }
    });

    try {
      mo.observe(document.documentElement || document, { childList: true, subtree: true });
    } catch (e) {
      // ignore
    }
  });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateFont') {
      const includeIcons = request.includeIcons === true;
      applyFont(request.font, includeIcons);

      // Update shadow roots with new font
      walkAndInject(document, request.font, includeIcons);
    }
    if (request.action === 'resetFont') {
      // Remove injected style
      try {
        const s = document.getElementById('advanced-font-style');
        if (s) s.remove();
      } catch (e) {}
      // Remove Google Fonts link inserted by the extension
      try {
        const lf = document.querySelector('link[data-google-font]');
        if (lf) lf.remove();
      } catch (e) {}

      // Remove styles from shadow roots
      try {
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT, null, false);
        let node = walker.nextNode();
        while (node) {
          if (node.shadowRoot) {
            try {
              const ss = node.shadowRoot.getElementById('advanced-font-style');
              if (ss) ss.remove();
            } catch (e) {}
          }
          node = walker.nextNode();
        }
      } catch (e) {}

      sendResponse({ reset: true });
    }
  });
})();
