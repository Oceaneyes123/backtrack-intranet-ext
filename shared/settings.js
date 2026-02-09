(() => {
  const DEFAULTS = {
    rerouteEnabled: true,
    chatEnabled: true,
    chatApiUrl: "https://backtrack-intranet-backend.onrender.com"
  };

  if (!globalThis.BT_DEFAULTS) {
    globalThis.BT_DEFAULTS = DEFAULTS;
  }
})();
