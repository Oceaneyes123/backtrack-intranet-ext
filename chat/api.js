// API
const REQUEST_TIMEOUT_MS = 15000;

const request = async (path, init = {}, { interactive = true } = {}) => {
  let token = await getToken(false);
  if (token && typeof applyTokenProfile === "function") {
    applyTokenProfile(token);
  }
  const buildHeaders = (nextToken) => ({
    ...(init.headers || {}),
    ...(nextToken ? { Authorization: `Bearer ${nextToken}` } : {})
  });
  const fetchWithTimeout = async (nextToken) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(`${API_URL}${path}`, {
        ...init,
        headers: buildHeaders(nextToken),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let res;
  try {
    res = await fetchWithTimeout(token);
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  }

  if (res.status === 401) {
    await clearCachedToken();
    token = await getToken(false);
    if (!token && interactive) {
      token = await getToken(true);
    }
    if (token && typeof applyTokenProfile === "function") {
      applyTokenProfile(token);
    }
    try {
      res = await fetchWithTimeout(token);
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error("Request timed out");
      }
      throw err;
    }
  }

  if (!res.ok) {
    let details = "";
    try {
      const data = await res.json();
      details = data?.error ? `: ${data.error}` : "";
    } catch {}
    throw new Error(`HTTP ${res.status}${details}`);
  }
  return res.json();
};

const api = {
  get: (path, opts) => request(path, {}, opts),
  post: (path, body, opts) => request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }, opts)
};

