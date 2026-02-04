const INTRANET_URL = "https://sites.google.com/backtrack.com/intranet1/home";
const DEFAULT_HOME_URL = "https://www.google.com/";

chrome.storage.sync.get({ rerouteEnabled: true }, ({ rerouteEnabled }) => {
	if (rerouteEnabled) {
		window.location.replace(INTRANET_URL);
		return;
	}

	window.location.replace(DEFAULT_HOME_URL);
});
