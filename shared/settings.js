(() => {
  const API_PRESETS = {
    production: "https://backtrack-intranet-backend.onrender.com",
    local: "http://localhost:8787"
  };

  const getApiUrlForEnvironment = (env) => API_PRESETS[env] || API_PRESETS.production;

  const DEFAULTS = {
    rerouteEnabled: true,
    chatEnabled: true,
    chatApiEnvironment: "production"
  };

  if (!globalThis.BT_DEFAULTS) globalThis.BT_DEFAULTS = DEFAULTS;
  if (!globalThis.BT_API_PRESETS) globalThis.BT_API_PRESETS = API_PRESETS;
  if (!globalThis.getApiUrlForEnvironment) globalThis.getApiUrlForEnvironment = getApiUrlForEnvironment;
})();
