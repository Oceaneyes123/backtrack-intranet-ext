// Bootstrap file: implementation lives in chat/*.js
// Keep this file last in manifest content_scripts js array.

const DEFAULTS = globalThis.BT_DEFAULTS || {
  chatEnabled: true,
  chatApiUrl: ""
};
const AUTH_EVENT_KEY = "btAuthEvent";
const LOCAL_API_URL_PATTERN = /^https?:\/\/(?:localhost|127(?:\.\d{1,3}){3})(?::\d+)?(?:\/|$)/i;

let currentSettings = { ...DEFAULTS };

const normalizeChatApiUrl = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return DEFAULTS.chatApiUrl;
  if (LOCAL_API_URL_PATTERN.test(trimmed)) return DEFAULTS.chatApiUrl;
  return trimmed;
};

const persistChatApiUrlIfNeeded = (value) => {
  if (!value || value === currentSettings.chatApiUrl) return;
  safeStorageSet("sync", { chatApiUrl: value });
};

const applySettings = (next = {}, { apiUrlChanged = false } = {}) => {
  currentSettings = { ...currentSettings, ...next };
  const normalizedChatApiUrl = normalizeChatApiUrl(currentSettings.chatApiUrl);
  const storedChatApiUrl = currentSettings.chatApiUrl;
  currentSettings.chatApiUrl = normalizedChatApiUrl;
  if (storedChatApiUrl !== normalizedChatApiUrl) {
    persistChatApiUrlIfNeeded(normalizedChatApiUrl);
    apiUrlChanged = true;
  }
  const { chatEnabled, chatApiUrl } = currentSettings;

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

  if (apiUrlChanged && typeof disconnect === "function") {
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
      let apiUrlChanged = false;
      if (changes.chatEnabled) next.chatEnabled = changes.chatEnabled.newValue;
      if (changes.chatApiUrl) {
        next.chatApiUrl = changes.chatApiUrl.newValue;
        apiUrlChanged = true;
      }
      if (!Object.keys(next).length) return;
      applySettings(next, { apiUrlChanged });
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
