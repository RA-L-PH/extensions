Force Font Changer
===================

What this extension does

- Injects a global CSS override that forces a font-family on every page and frame.
- Tries to inject the same rules into Shadow DOM roots using a small content script and a MutationObserver.

How to install

1. Open Chrome or Edge.
2. Go to chrome://extensions (Edge: edge://extensions).
3. Enable "Developer mode".
4. Click "Load unpacked" and select this folder: the `font-changer` directory.

Customize the font

- Edit `force.css` and change the value of `--force-font` at the top to the font stack you prefer.
- To bundle a custom font file, place the font file in a `fonts/` folder inside `font-changer` and uncomment the `@font-face` example in `force.css`, then update the `--force-font` to use that family name.

Notes and limitations

- Some sites use webfonts, inline styles, or strong intrinsics that can still override CSS; the `!important` declarations will usually prevail.
- Shadow DOM is not fully controllable from outside; the content script attempts to inject into existing and future shadow roots, but won't succeed for shadow roots in cross-origin iframes.
- If you want to force a single custom font across pages (for example a local TTF), make sure to add it into this extension's `fonts/` folder and reference it via `@font-face`.

License

This boilerplate is MIT-style; adapt as needed.
