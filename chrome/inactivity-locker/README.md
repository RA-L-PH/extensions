Inactivity Locker
=================

A Chrome extension (MV3) that detects user inactivity using chrome.idle and locks the browser with a password-protected overlay. Includes a password-protected options page and disables right-click while locked.

Install (developer mode):
- Open chrome://extensions
- Toggle Developer mode
- Load unpacked and select the `inactivity-locker` folder

Default admin/password: 1234

Files of interest:
- `background.js` - service worker managing idle detection and lock state
- `content_script.js` - injects/removes overlay and disables right-click while locked
- `lock_screen.html`/`.js` - UI to enter the password
- `options.html` - password-protected settings page
