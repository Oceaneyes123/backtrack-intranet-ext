// Storage
const KEYS = { chats: "bt-chats", users: "bt-users", pending: "bt-pending" };
const loadStorage = () => new Promise((r) => safeStorageGet("sync", KEYS, (res) => r(res || {})));

let saveTimer = null;
const flushStorageNow = () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  safeStorageSet("sync", { [KEYS.chats]: state.chats, [KEYS.users]: state.users });
};

// Avoid hitting chrome.storage.sync write quotas during active chats.
const saveStorage = () => {
  if (saveTimer) return;
  saveTimer = setTimeout(() => flushStorageNow(), 750);
};

const loadPendingStorage = () => new Promise((r) => safeStorageGet("local", KEYS.pending, (res) => r(res || {})));
const savePendingStorage = () => safeStorageSet("local", { [KEYS.pending]: Array.from(pendingSends.values()) });
