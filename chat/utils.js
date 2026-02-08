const sanitize = (v) => (v == null ? "" : String(v));
const slugify = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const getUserName = (user) => user?.name || user?.displayName || user?.email || "User";
const getMessageKey = (m) => m?.client_message_id || m?.clientMessageId || m?.id || "";

const formatDateLabel = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const isSameGroup = (prev, curr) => {
  if (!prev || !curr) return false;
  if ((prev.email || "").toLowerCase() !== (curr.email || "").toLowerCase()) return false;
  const prevTime = new Date(prev.created_at).getTime();
  const currTime = new Date(curr.created_at).getTime();
  return Math.abs(currTime - prevTime) <= GROUP_WINDOW_MS;
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
};

const formatTime = (v) => {
  if (!v) return "";
  const d = new Date(v), now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const initials = (name) => {
  const p = String(name || "").trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
};

const decodeJwt = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
};

const normalizeMessage = (raw = {}, { fallbackId } = {}) => ({
  id: raw?.id || fallbackId || globalThis.crypto?.randomUUID?.() || String(Date.now()),
  author: raw?.display_name || raw?.displayName || raw?.email || "User",
  email: raw?.email,
  body: raw?.body || raw?.message || "",
  created_at: raw?.created_at || raw?.createdAt || new Date().toISOString(),
  client_message_id: raw?.client_message_id || raw?.clientMessageId
});

globalThis.sanitize = sanitize;
globalThis.slugify = slugify;
globalThis.getUserName = getUserName;
globalThis.getMessageKey = getMessageKey;
globalThis.formatDateLabel = formatDateLabel;
globalThis.isSameGroup = isSameGroup;
globalThis.isSameDay = isSameDay;
globalThis.formatTime = formatTime;
globalThis.initials = initials;
globalThis.decodeJwt = decodeJwt;
globalThis.normalizeMessage = normalizeMessage;
