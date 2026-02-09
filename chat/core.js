let API_URL = globalThis.BT_DEFAULTS?.chatApiUrl || "";
const setApiUrl = (nextUrl) => {
  const v = String(nextUrl || "").trim();
  if (!v) return;
  if (!/^https?:\/\//i.test(v)) return;
  API_URL = v.replace(/\/+$/, "");
};
const DEFAULT_ROOM = "general";
const MESSAGE_PAGE_SIZE = 50;

// State
const state = {
  screen: "list",
  panelOpen: false,
  chats: [],
  users: [],
  messages: {},
  activeChatId: null,
  currentRoom: DEFAULT_ROOM,
  currentUserEmail: null,
  currentUserName: "You",
  oldestMessageAt: {},
  hasMore: {},
  roomMeta: {}
};

// Connection
let ws = null;
let reconnectTimer = null;
let backoff = 1000;
let reconnectEnabled = false;
let wsRoom = null;
let wsConnectSeq = 0;
let widgetRoot = null;
let shadow = null;

// Helpers
const $ = (id) => shadow?.getElementById(id);
const messageIndex = new Map();
const pendingSends = new Map();
let flushInFlight = false;
let readReceiptTimer = null;
const ensureMessageIndex = (chatId) => {
  if (!messageIndex.has(chatId)) messageIndex.set(chatId, new Map());
  return messageIndex.get(chatId);
};

const getStatusLabel = (status) => {
  if (status === "sending") return "Sending…";
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  return "";
};

