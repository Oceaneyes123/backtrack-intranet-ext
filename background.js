const SCOPES = ["openid", "email", "profile"];
let cachedIdToken = null;

try {
  chrome.storage.session.get({ btIdToken: null }, ({ btIdToken }) => {
    if (btIdToken && isTokenValid(btIdToken)) {
      cachedIdToken = btIdToken;
    }
  });
} catch {}

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
  if (cachedIdToken && isTokenValid(cachedIdToken)) {
    return cachedIdToken;
  }

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
  try {
    chrome.storage.session.set({ btIdToken: idToken });
  } catch {}
  return idToken;
};

const clearToken = () => {
  cachedIdToken = null;
  try {
    chrome.storage.session.remove("btIdToken");
  } catch {}
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "bt-auth:get-token") {
    authenticate(Boolean(message.interactive))
      .then((idToken) => sendResponse({ ok: true, idToken }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "bt-auth:sign-out") {
    clearToken();
    try {
      chrome.action.setBadgeText({ text: "" });
    } catch {}
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "bt-auth:clear-token") {
    clearToken();
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "bt-auth:status") {
    sendResponse({
      ok: true,
      authenticated: Boolean(cachedIdToken && isTokenValid(cachedIdToken))
    });
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
