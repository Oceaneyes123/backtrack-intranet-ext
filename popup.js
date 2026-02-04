const toggle = document.getElementById("toggle");

const updateUi = (enabled) => {
  toggle.checked = enabled;
};

chrome.storage.sync.get({ rerouteEnabled: true }, ({ rerouteEnabled }) => {
  updateUi(rerouteEnabled);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ rerouteEnabled: enabled }, () => {
    updateUi(enabled);
  });
});
