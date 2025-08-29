// content_script.js
(function(){
  const LOCK_ID = 'inactivity-locker-overlay-v1';
  let locked = false;

  function createOverlay() {
    if (document.getElementById(LOCK_ID)) return;
    const div = document.createElement('div');
    div.id = LOCK_ID;
    Object.assign(div.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: '#000',
      color: '#fff',
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    // prevent interaction
    div.addEventListener('contextmenu', (e) => { e.preventDefault(); });
    div.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); });
    div.addEventListener('keydown', (e) => { e.stopPropagation(); });
    document.documentElement.appendChild(div);
    // disable right-click across the document
    document.addEventListener('contextmenu', blockCtx, true);
  }

  function removeOverlay() {
    const el = document.getElementById(LOCK_ID);
    if (el) el.remove();
    document.removeEventListener('contextmenu', blockCtx, true);
  }

  function blockCtx(e) { e.preventDefault(); }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.action) return;
    if (msg.action === 'lock') {
      locked = true;
      createOverlay();
    } else if (msg.action === 'unlock') {
      locked = false;
      removeOverlay();
    }
  });

  // On start, ask background if locked
  chrome.runtime.sendMessage({type: 'isLocked'}, (resp) => {
    if (resp && resp.isLocked) {
      createOverlay();
      locked = true;
    }
  });
})();
