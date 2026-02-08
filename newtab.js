const INTRANET_URL = "https://sites.google.com/backtrack.com/intranet1/home";
const DEFAULT_HOME_URL = "https://www.google.com/";

const safeGet = (keys, cb) => {
	if (typeof chrome !== "undefined" && chrome.storage?.sync) {
		chrome.storage.sync.get(keys, cb);
	} else {
		cb(keys);
	}
};

safeGet({ rerouteEnabled: true }, ({ rerouteEnabled }) => {
	if (rerouteEnabled) {
		window.location.replace(INTRANET_URL);
		return;
	}

	window.location.replace(DEFAULT_HOME_URL);
});
