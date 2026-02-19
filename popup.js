const rerouteToggle = document.getElementById("toggle");
const chatEnabledToggle = document.getElementById("chat-enabled");

const DEFAULTS = globalThis.BT_DEFAULTS || {
  rerouteEnabled: true,
  chatEnabled: true
};

const updateUi = (settings) => {
  if (rerouteToggle) rerouteToggle.checked = settings.rerouteEnabled;
  if (chatEnabledToggle) chatEnabledToggle.checked = settings.chatEnabled;
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
      chatEnabled: chatEnabledToggle.checked
    });
  });
});
