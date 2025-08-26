# GitHub Profile Styler (RA-L-PH)

This Chrome extension customizes the look of the GitHub profile for the user `RA-L-PH`.

## What it does

- Reorganizes the RA-L-PH GitHub profile into a persistent two-column layout: a fixed left sidebar (identity + vertical navigation) and a dynamic right content pane.
- Adds a modern dark theme and custom font for a cleaner profile presentation.
- Only runs on URLs matching `github.com/RA-L-PH`.

## Install (Developer mode)

1. Open Chrome and go to `chrome://extensions/`.
2. Enable "Developer mode" (top-right).
3. Click "Load unpacked" and select the `ra-l-ph-github` folder inside `chrome`.
4. Visit `https://github.com/RA-L-PH` to see the changes.

## Troubleshooting

- If the styles don't apply, make sure the extension is enabled and the URL matches `github.com/RA-L-PH` exactly.
- GitHub uses client-side navigation; try a hard reload (Ctrl+Shift+R) or navigate to the profile root (`https://github.com/RA-L-PH`).
- Open DevTools (F12) and check the Console for "Content script" logs. You can also inspect `<html>` to see if the `gh-profile-styler-applied` class was added.

## Customization

- Edit `content.js` to alter the sidebar behavior or default navigation. The script builds a left sidebar and routes clicks to the profile's `?tab=` URLs.
- Edit `styles.css` to update colors, spacing, fonts, and responsive behavior. The included `fonts/` folder contains Josefin Sans weights used by default.

Files added:

- `content.js` — content script that re-structures the page into a left sidebar and right content pane.
- `styles.css` — CSS implementing the two-column layout and theme.
- `logo.png` — extension icon used for the toolbar and store listing (bundled at multiple sizes).


## Notes

- This extension is intentionally minimal and uses only content scripts and host permissions.
- If you prefer the extension to target a different username, update `manifest.json` matches and `TARGET_USERNAME` in `content.js`.
