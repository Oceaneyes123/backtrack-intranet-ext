// Storage
const KEYS = { chats: "bt-chats", users: "bt-users" };
const loadStorage = () => new Promise((r) => safeStorageGet("sync", KEYS, (res) => {
  const data = res || {};
  // F10: Validate storage shape — guard against corrupt data.
  if (data[KEYS.chats] && !Array.isArray(data[KEYS.chats])) data[KEYS.chats] = [];
  if (data[KEYS.users] && !Array.isArray(data[KEYS.users])) data[KEYS.users] = [];
  r(data);
}));

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
