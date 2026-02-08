const rerouteToggle = document.getElementById("toggle");
const chatEnabledToggle = document.getElementById("chat-enabled");
const chatApiUrlInput = document.getElementById("chat-api-url");
const authStatus = document.getElementById("auth-status");
const authSignin = document.getElementById("auth-signin");
const authSignout = document.getElementById("auth-signout");

const DEFAULTS = globalThis.BT_DEFAULTS || {
  rerouteEnabled: true,
  chatEnabled: true,
  chatApiUrl: "http://localhost:8787"
};

const updateUi = (settings) => {
  if (rerouteToggle) rerouteToggle.checked = settings.rerouteEnabled;
  if (chatEnabledToggle) chatEnabledToggle.checked = settings.chatEnabled;
  if (chatApiUrlInput) chatApiUrlInput.value = settings.chatApiUrl || "";
};

safeStorageGet("sync", DEFAULTS, (settings) => {
  updateUi(settings);
});

rerouteToggle.addEventListener("change", () => {
  safeStorageSet("sync", { rerouteEnabled: rerouteToggle.checked }, () => {
    updateUi({
      rerouteEnabled: rerouteToggle.checked
    });
  });
});

chatEnabledToggle.addEventListener("change", () => {
  safeStorageSet("sync", { chatEnabled: chatEnabledToggle.checked }, () => {
    updateUi({
      ...DEFAULTS,
      chatEnabled: chatEnabledToggle.checked,
      chatApiUrl: chatApiUrlInput.value
    });
  });
});

let urlSaveTimer = null;
chatApiUrlInput.addEventListener("input", () => {
  if (urlSaveTimer) clearTimeout(urlSaveTimer);
  urlSaveTimer = setTimeout(() => {
    const nextUrl = String(chatApiUrlInput.value || "").trim();
    safeStorageSet("sync", { chatApiUrl: nextUrl });
  }, 250);
});

const refreshAuthStatus = () => {
  safeSendMessage({ type: "bt-auth:status" }, (response) => {
    if (!response?.ok) return;
    const signedIn = response.authenticated;
    if (authStatus) authStatus.textContent = signedIn ? "Signed in" : "Signed out";
    if (authSignin) authSignin.style.display = signedIn ? "none" : "inline-flex";
    if (authSignout) authSignout.style.display = signedIn ? "inline-flex" : "none";
  });
};

authSignin.addEventListener("click", () => {
  safeSendMessage({ type: "bt-auth:get-token", interactive: true }, () => {
    refreshAuthStatus();
  });
});

authSignout.addEventListener("click", () => {
  safeSendMessage({ type: "bt-auth:sign-out" }, () => {
    refreshAuthStatus();
  });
});

refreshAuthStatus();
