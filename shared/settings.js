(() => {
  const DEFAULTS = {
    rerouteEnabled: true,
    chatEnabled: true,
    chatApiUrl: "http://localhost:8787"
  };

  if (!globalThis.BT_DEFAULTS) {
    globalThis.BT_DEFAULTS = DEFAULTS;
  }
})();
