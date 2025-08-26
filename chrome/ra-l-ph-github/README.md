# GitHub Profile Styler (RA-L-PH)

This Chrome extension customizes the look of the GitHub profile for the user `RA-L-PH`.

## What it does
- Applies a themed header to the profile name area.
- Styles the bio and optional repository cards.
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
- Edit `content.js` to change the `TARGET_USERNAME` value.
- Edit `styles.css` to update colors and spacing.

## Notes
- This extension is intentionally minimal and uses only content scripts and host permissions.
- If you prefer the extension to target a different username, update `manifest.json` matches and `TARGET_USERNAME` in `content.js`.
