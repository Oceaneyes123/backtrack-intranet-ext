const SCOPES = ["openid", "email", "profile"];
const AUTH_SIGNED_OUT_KEY = "btAuthSignedOut";
const AUTH_EVENT_KEY = "btAuthEvent";
let cachedIdToken = null;
let signedOutByUser = false;

const sessionGet = (keys) =>
  new Promise((resolve) => {
    try {
      chrome.storage.session.get(keys, (res) => resolve(res || {}));
    } catch {
      resolve({});
    }
  });

const sessionSet = (data) =>
  new Promise((resolve) => {
    try {
      chrome.storage.session.set(data, () => resolve());
    } catch {
      resolve();
    }
  });

const sessionRemove = (keys) =>
  new Promise((resolve) => {
    try {
      chrome.storage.session.remove(keys, () => resolve());
    } catch {
      resolve();
    }
  });

const localGet = (keys) =>
  new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (res) => resolve(res || {}));
    } catch {
      resolve({});
    }
  });

const localSet = (data) =>
  new Promise((resolve) => {
    try {
      chrome.storage.local.set(data, () => resolve());
    } catch {
      resolve();
    }
  });

const localRemove = (keys) =>
  new Promise((resolve) => {
    try {
      chrome.storage.local.remove(keys, () => resolve());
    } catch {
      resolve();
    }
  });

const publishAuthEvent = async (signedIn) => {
  await localSet({
    [AUTH_EVENT_KEY]: {
      signedIn: Boolean(signedIn),
      ts: Date.now()
    }
  });
};

const initAuthState = (async () => {
  const { btIdToken } = await sessionGet({ btIdToken: null });
  if (btIdToken && isTokenValid(btIdToken)) {
    cachedIdToken = btIdToken;
  }
  const local = await localGet({ [AUTH_SIGNED_OUT_KEY]: false });
  signedOutByUser = Boolean(local[AUTH_SIGNED_OUT_KEY]);
})();

const decodeJwt = (token) => {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const isTokenValid = (token) => {
  const payload = decodeJwt(token);
  if (!payload?.exp) return false;
  const expiresAt = payload.exp * 1000;
  return Date.now() < expiresAt - 60000;
};

const buildAuthRequest = ({ interactive = true } = {}) => {
  const redirectUri = chrome.identity.getRedirectURL();
  const clientId = chrome.runtime.getManifest().oauth2?.client_id;
  if (!clientId) {
    throw new Error("Missing oauth2.client_id in manifest.");
  }
  const nonce = crypto.randomUUID();
  const state = crypto.randomUUID();
  const prompt = interactive ? "consent" : "none";
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "token id_token",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    prompt,
    include_granted_scopes: "true",
    nonce,
    state
  });
  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    clientId,
    nonce,
    state
  };
};

const parseAuthResponse = (redirectUri) => {
  const hash = new URL(redirectUri).hash.substring(1);
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get("access_token"),
    idToken: params.get("id_token"),
    state: params.get("state"),
    error: params.get("error")
  };
};

const authenticate = async (interactive = true) => {
  await initAuthState;

  if (cachedIdToken && isTokenValid(cachedIdToken)) {
    return cachedIdToken;
  }

  if (!interactive && signedOutByUser) {
    throw new Error("Signed out");
  }

  const wasAuthenticated = Boolean(cachedIdToken && isTokenValid(cachedIdToken));

  const auth = buildAuthRequest({ interactive });
  const redirectUri = await chrome.identity.launchWebAuthFlow({
    url: auth.url,
    interactive
  });

  const { idToken, state, error } = parseAuthResponse(redirectUri);
  if (error || !idToken) {
    throw new Error(error || "Authentication failed");
  }
  if (!state || state !== auth.state) {
    throw new Error("Authentication failed (state mismatch).");
  }

  const payload = decodeJwt(idToken);
  if (!payload) {
    throw new Error("Authentication failed (invalid token).");
  }
  if (payload.nonce && payload.nonce !== auth.nonce) {
    throw new Error("Authentication failed (nonce mismatch).");
  }
  const aud = payload.aud;
  if (aud && aud !== auth.clientId && !(Array.isArray(aud) && aud.includes(auth.clientId))) {
    throw new Error("Authentication failed (audience mismatch).");
  }

  cachedIdToken = idToken;
  await sessionSet({ btIdToken: idToken });
  await localRemove(AUTH_SIGNED_OUT_KEY);
  const shouldEmit = signedOutByUser || !wasAuthenticated;
  signedOutByUser = false;
  if (shouldEmit) {
    await publishAuthEvent(true);
  }
  return idToken;
};

const clearToken = async ({ persistSignedOut = false, emitEvent = false } = {}) => {
  await initAuthState;
  cachedIdToken = null;
  await sessionRemove("btIdToken");
  if (persistSignedOut) {
    signedOutByUser = true;
    await localSet({ [AUTH_SIGNED_OUT_KEY]: true });
  } else {
    signedOutByUser = false;
    await localRemove(AUTH_SIGNED_OUT_KEY);
  }
  if (emitEvent) {
    await publishAuthEvent(false);
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "bt-auth:get-token") {
    authenticate(Boolean(message.interactive))
      .then((idToken) => sendResponse({ ok: true, idToken }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "bt-auth:sign-out") {
    clearToken({ persistSignedOut: true, emitEvent: true })
      .then(() => {
        try {
          chrome.action.setBadgeText({ text: "" });
        } catch {}
        sendResponse({ ok: true });
      })
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "bt-auth:clear-token") {
    clearToken({ emitEvent: true })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "bt-auth:status") {
    initAuthState
      .then(async () => {
        let authenticated = Boolean(cachedIdToken && isTokenValid(cachedIdToken));
        if (!authenticated && !signedOutByUser) {
          try {
            await authenticate(false);
            authenticated = Boolean(cachedIdToken && isTokenValid(cachedIdToken));
          } catch {}
        }
        sendResponse({ ok: true, authenticated });
      })
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "bt-chat:set-badge") {
    const unread = Math.max(0, Number(message.unread) || 0);
    const text = unread > 99 ? "99+" : unread ? String(unread) : "";
    try {
      chrome.action.setBadgeBackgroundColor({ color: "#e87722" });
      chrome.action.setBadgeText({ text });
    } catch {}
    sendResponse({ ok: true });
    return true;
  }

  return false;
});
