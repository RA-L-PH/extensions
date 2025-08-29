document.addEventListener('DOMContentLoaded', () => {
  const pwInput = document.getElementById('pw');
  const ok = document.getElementById('ok');
  const msg = document.getElementById('msg');

  async function verify(password) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({type: 'verifyPassword', password}, (resp) => {
        resolve(resp && resp.ok);
      });
    });
  }

  ok.addEventListener('click', async () => {
    msg.textContent = '';
    const val = pwInput.value || '';
    const okResp = await verify(val);
    if (okResp) {
      // close this tab
      const w = window;
      try { w.close(); } catch (e) {}
      // also notify content scripts to remove overlay
      chrome.runtime.sendMessage({type: 'noop'});
    } else {
      msg.textContent = 'Incorrect password';
      pwInput.value = '';
      pwInput.focus();
    }
  });

  pwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') ok.click();
  });
});
