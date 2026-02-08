(() => {
  const safeSendMessage = (msg, cb) => {
    try {
      if (typeof chrome === "undefined" || !chrome.runtime) {
        if (cb) cb(null);
        return;
      }
      const r = chrome.runtime;
      if (typeof r.sendMessage !== "function") {
        if (cb) cb(null);
        return;
      }
      r.sendMessage(msg, (res) => {
        try {
          const lastErr = chrome.runtime?.lastError;
          if (lastErr) {
            if (cb) cb(null);
            return;
          }
          if (cb) cb(res);
        } catch {
          if (cb) cb(null);
        }
      });
    } catch {
      if (cb) cb(null);
    }
  };

  const safeStorageGet = (area, keys, cb) => {
    try {
      const s = typeof chrome !== "undefined" && chrome.storage ? chrome.storage[area] : null;
      if (s && typeof s.get === "function") {
        s.get(keys, (res) => {
          if (chrome.runtime?.lastError) {
            if (cb) cb({});
            return;
          }
          if (cb) cb(res);
        });
      } else {
        if (cb) cb({});
      }
    } catch {
      if (cb) cb({});
    }
  };

  const safeStorageSet = (area, data, cb) => {
    try {
      const s = typeof chrome !== "undefined" && chrome.storage ? chrome.storage[area] : null;
      if (s && typeof s.set === "function") {
        s.set(data, () => {
          if (chrome.runtime?.lastError) {
            if (cb) cb(false);
            return;
          }
          if (cb) cb(true);
        });
      } else {
        if (cb) cb(false);
      }
    } catch {
      if (cb) cb(false);
    }
  };

  if (!globalThis.safeSendMessage) globalThis.safeSendMessage = safeSendMessage;
  if (!globalThis.safeStorageGet) globalThis.safeStorageGet = safeStorageGet;
  if (!globalThis.safeStorageSet) globalThis.safeStorageSet = safeStorageSet;
})();
