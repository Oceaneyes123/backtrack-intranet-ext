// Auth
const sendAuthMessage = (msg, cb) => {
  try {
    if (typeof safeSendMessage === "function") {
      safeSendMessage(msg, cb);
      return;
    }
    if (typeof chrome === "undefined" || !chrome.runtime) {
      if (cb) cb(null);
      return;
    }
    const runtime = chrome.runtime;
    if (typeof runtime.sendMessage !== "function") {
      if (cb) cb(null);
      return;
    }
    runtime.sendMessage(msg, (res) => {
      try {
        if (chrome.runtime?.lastError) {
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

const getToken = (interactive = false) => new Promise((r) =>
  sendAuthMessage({ type: "bt-auth:get-token", interactive }, (res) =>
    r(res?.ok ? res.idToken : null)));

const clearLocalProfile = () => {
  state.currentUserEmail = null;
  state.currentUserName = "You";
  if (typeof setAuthState === "function") {
    setAuthState(false);
  }
};

const clearCachedToken = () => new Promise((r) =>
  sendAuthMessage({ type: "bt-auth:clear-token" }, () => {
    clearLocalProfile();
    r();
  }));

const applyTokenProfile = (token) => {
  if (!token) return null;
  const p = decodeJwt(token);
  if (p?.email) state.currentUserEmail = p.email.toLowerCase();
  state.currentUserName = p?.name || p?.email?.split("@")[0] || "You";
  if (state.currentUserEmail) {
    upsertUser(state.currentUserEmail, state.currentUserName);
  }
  return p;
};

const syncProfile = async (interactive = false) => {
  const token = await getToken(interactive);
  if (!token) {
    clearLocalProfile();
    return null;
  }
  return applyTokenProfile(token);
};

