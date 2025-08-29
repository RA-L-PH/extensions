// background.js - service worker
const DEFAULT_IDLE_MINUTES = 5; // default inactivity minutes

let idleMinutes = DEFAULT_IDLE_MINUTES;
let countdownSeconds = 60; // grace countdown once idle detected
let countdownTimer = null;
let isLocked = false;

// helper to get settings
async function getSettings() {
  const data = await chrome.storage.local.get(["password", "idleMinutes"]);
  return {
    password: data.password || "1234",
    idleMinutes: data.idleMinutes || DEFAULT_IDLE_MINUTES
  };
}

// Start listening for idle state changes
chrome.idle.onStateChanged.addListener(async (newState) => {
  const settings = await getSettings();
  idleMinutes = settings.idleMinutes;
  if (newState === 'idle' || newState === 'locked') {
    // Start countdown
    startCountdown(idleMinutes * 60);
  } else if (newState === 'active') {
    cancelCountdown();
    if (isLocked) {
      // let content scripts know user became active (no unlock)
      // but remain locked until correct password
    }
  }
});

function startCountdown(seconds) {
  cancelCountdown();
  countdownSeconds = seconds;
  countdownTimer = setInterval(() => {
    countdownSeconds -= 1;
    if (countdownSeconds <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      triggerLock();
    }
  }, 1000);
}

function cancelCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

async function triggerLock() {
  isLocked = true;
  // inject lock overlay into all tabs by messaging content scripts
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      chrome.tabs.sendMessage(tab.id, {action: 'lock'});
    } catch (e) {
      // ignore tabs where content script not reachable
    }
  }
  // open a focused lock page in a new tab (optional) - we will open only one
  const lockPage = chrome.runtime.getURL('lock_screen.html');
  chrome.tabs.create({url: lockPage});
}

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg && msg.type === 'verifyPassword') {
    const settings = await getSettings();
    const ok = msg.password === settings.password;
    if (ok) {
      isLocked = false;
      // tell all tabs to unlock
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try { chrome.tabs.sendMessage(tab.id, {action: 'unlock'}); } catch (e) {}
      }
    }
    sendResponse({ok});
  }
  if (msg && msg.type === 'isLocked') {
    sendResponse({isLocked});
  }
});

// On install, set defaults
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["password", "idleMinutes"], (items) => {
    if (!items.password) chrome.storage.local.set({password: '1234'});
    if (!items.idleMinutes) chrome.storage.local.set({idleMinutes: DEFAULT_IDLE_MINUTES});
  });
});
