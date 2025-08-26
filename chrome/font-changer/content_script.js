// Inject the same CSS rule into shadow roots and newly created shadow roots.
(function() {
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
  const cssText = `:root, html, body, * , *::before, *::after { font-family: var(--force-font, "Segoe UI", Arial, sans-serif) !important; font-size: inherit !important; line-height: inherit !important; }`;

  function injectIntoDocument(doc) {
    try {
      if (!doc) return;
      if (doc.getElementById && doc.getElementById('force-font-style')) return;
      const style = (doc.createElement('style'));
      style.id = 'force-font-style';
      style.textContent = cssText;
      (doc.head || doc.documentElement).prepend(style);
    } catch (e) {
      // ignore cross-origin frames or other injection errors
    }
  }

  function injectIntoShadowRoot(shadowRoot) {
    try {
      if (!shadowRoot) return;
      if (shadowRoot.getElementById && shadowRoot.getElementById('force-font-style')) return;
      const style = document.createElement('style');
      style.id = 'force-font-style';
      style.textContent = cssText;
      shadowRoot.prepend(style);
    } catch (e) {
      // ignore
    }
  }

  // Inject into current document
  injectIntoDocument(document);

  // Walk existing elements to find shadow roots
  function walkAndInject(root) {
    try {
      const walker = (root.createTreeWalker ? root.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false) : null);
      if (!walker) return;
      let node = walker.nextNode();
      while (node) {
        if (node.shadowRoot) injectIntoShadowRoot(node.shadowRoot);
        node = walker.nextNode();
      }
    } catch (e) {
      // ignore
    }
  }

  walkAndInject(document);

  // Observe for newly attached shadow roots and new nodes
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n && n.nodeType === 1) {
          if (n.shadowRoot) injectIntoShadowRoot(n.shadowRoot);
          // also walk into the subtree to find nested shadow roots
          walkAndInject(n);
        }
      }
    }
  });

  try {
    mo.observe(document.documentElement || document, { childList: true, subtree: true });
  } catch (e) {
    // ignore
  }
})();
