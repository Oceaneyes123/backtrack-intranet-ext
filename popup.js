const rerouteToggle = document.getElementById("toggle");
const chatEnabledToggle = document.getElementById("chat-enabled");
const authStatus = document.getElementById("auth-status");
const signInBtn = document.getElementById("sign-in-btn");
const signOutBtn = document.getElementById("sign-out-btn");
const envSelect = document.getElementById("env-select");

const DEFAULTS = globalThis.BT_DEFAULTS || {
  rerouteEnabled: true,
  chatEnabled: true,
  chatApiEnvironment: "production"
};

const decodeJwt = (token) => {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
};

const updateAuthUi = (authenticated, email) => {
  if (authenticated && email) {
    authStatus.textContent = email;
    authStatus.className = "auth-status-value auth-signed-in";
    signInBtn.hidden = true;
    signOutBtn.hidden = false;
  } else if (authenticated) {
    authStatus.textContent = "Signed in";
    authStatus.className = "auth-status-value auth-signed-in";
    signInBtn.hidden = true;
    signOutBtn.hidden = false;
  } else {
    authStatus.textContent = "Not signed in";
    authStatus.className = "auth-status-value auth-signed-out";
    signInBtn.hidden = false;
    signOutBtn.hidden = true;
  }
};

const updateUi = (settings) => {
  if (rerouteToggle) rerouteToggle.checked = !!settings.rerouteEnabled;
  if (chatEnabledToggle) chatEnabledToggle.checked = !!settings.chatEnabled;
  if (envSelect) envSelect.value = settings.chatApiEnvironment || "production";
};

const refreshAuthStatus = () => {
  safeStorageGet("sync", {}, (stored) => {
    // First try to get an existing token from the background
    safeSendMessage({ type: "bt-auth:status" }, (res) => {
      if (!res || !res.ok) {
        updateAuthUi(false, null);
        return;
      }
      if (res.authenticated) {
        // Try to get a token to extract email
        safeSendMessage({ type: "bt-auth:get-token", interactive: false }, (tokenRes) => {
          const email = tokenRes?.ok && tokenRes.idToken
            ? decodeJwt(tokenRes.idToken)?.email || null
            : null;
          updateAuthUi(true, email);
        });
      } else {
        updateAuthUi(false, null);
      }
    });
  });
};

safeStorageGet("sync", DEFAULTS, (settings) => {
  updateUi({ ...DEFAULTS, ...settings });
  refreshAuthStatus();
});

rerouteToggle?.addEventListener("change", () => {
  safeStorageSet("sync", { rerouteEnabled: rerouteToggle.checked });
});

chatEnabledToggle?.addEventListener("change", () => {
  safeStorageSet("sync", { chatEnabled: chatEnabledToggle.checked });
});

envSelect?.addEventListener("change", () => {
  safeStorageSet("sync", { chatApiEnvironment: envSelect.value });
});

signInBtn?.addEventListener("click", () => {
  signInBtn.disabled = true;
  authStatus.textContent = "Signing in…";
  safeSendMessage({ type: "bt-auth:get-token", interactive: true }, (res) => {
    signInBtn.disabled = false;
    if (res?.ok && res.idToken) {
      const email = decodeJwt(res.idToken)?.email || null;
      updateAuthUi(true, email);
    } else {
      updateAuthUi(false, null);
    }
  });
});

signOutBtn?.addEventListener("click", () => {
  signOutBtn.disabled = true;
  safeSendMessage({ type: "bt-auth:sign-out" }, (res) => {
    signOutBtn.disabled = false;
    updateAuthUi(false, null);
  });
});
