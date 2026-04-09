// Bootstrap file: implementation lives in chat/*.js
// Keep this file last in manifest content_scripts js array.

const DEFAULTS = globalThis.BT_DEFAULTS || {
  chatEnabled: true,
  chatApiEnvironment: "production"
};
const AUTH_EVENT_KEY = "btAuthEvent";

let currentSettings = { ...DEFAULTS };

const applySettings = (next = {}, { envChanged = false } = {}) => {
  currentSettings = { ...currentSettings, ...next };
  const { chatEnabled, chatApiEnvironment } = currentSettings;
  const chatApiUrl = (typeof getApiUrlForEnvironment === "function")
    ? getApiUrlForEnvironment(chatApiEnvironment)
    : "";

  try {
    if (typeof setApiUrl === "function" && chatApiUrl) {
      setApiUrl(chatApiUrl);
    }
  } catch {}

  if (!chatEnabled) {
    safeSendMessage({ type: "bt-chat:set-badge", unread: 0 });
    if (typeof unmount === "function") {
      unmount();
    } else if (typeof disconnect === "function") {
      disconnect();
    }
    return;
  }

  if (typeof mount === "function") {
    mount();
  } else {
    console.error("Backtrack chat: mount() not found. Check manifest script order.");
  }

  if (envChanged && typeof disconnect === "function") {
    disconnect();
    if (state?.panelOpen && typeof connect === "function" && state.currentRoom) {
      connect(state.currentRoom);
    }
  }
};

safeStorageGet("sync", DEFAULTS, (settings) => {
  currentSettings = { ...DEFAULTS, ...settings };
  applySettings(currentSettings);
});

if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
      const next = {};
      let envChanged = false;
      if (changes.chatEnabled !== undefined) next.chatEnabled = changes.chatEnabled.newValue;
      if (changes.chatApiEnvironment !== undefined) {
        next.chatApiEnvironment = changes.chatApiEnvironment.newValue;
        envChanged = true;
      }
      if (!Object.keys(next).length) return;
      applySettings(next, { envChanged });
      return;
    }

    if (area === "local" && changes[AUTH_EVENT_KEY]) {
      try {
        if (typeof onAuthStateChanged === "function") {
          Promise.resolve(onAuthStateChanged()).catch(() => {});
        }
      } catch {}
    }
  });
}
