// Chat operations
const ensureChat = (chat) => {
  const existing = state.chats.find((c) => c.id === chat.id);
  if (existing) return Object.assign(existing, chat);
  state.chats.unshift(chat);
  return chat;
};

const upsertUser = (email, name) => {
  if (!email) return;
  const normalized = String(email).toLowerCase();
  const existing = state.users.find((u) => u.email === normalized);
  if (existing) {
    existing.name = name || existing.name;
    return;
  }
  state.users.unshift({ email: normalized, name: name || normalized });
};

const ensureGeneral = () => {
  if (!state.chats.find((c) => c.id === DEFAULT_ROOM)) {
    state.chats.unshift({ id: DEFAULT_ROOM, room: DEFAULT_ROOM, type: "group", name: "General", lastMessage: "Welcome!", lastMessageAt: new Date().toISOString(), unread: 0 });
  }
};

const syncRoomsFromServer = async ({ interactive = false, replace = false } = {}) => {
  try {
    const data = await api.get("/api/chat/rooms", { interactive });
    const rooms = Array.isArray(data?.rooms) ? data.rooms : [];
    if (!rooms.length) return;

    if (replace) {
      state.chats = [];
    }

    rooms.forEach((room) => {
      const roomId = room.room || room.id || room.name;
      if (!roomId) return;
      const members = Array.isArray(room.members) ? room.members : [];
      members.forEach((m) => upsertUser(m?.email, m?.displayName));
      const memberIds = members.map((m) => (m?.email || "").toLowerCase()).filter(Boolean);
      ensureChat({
        id: roomId,
        room: roomId,
        type: room.type || "group",
        name: room.displayName || room.name || roomId,
        lastMessage: room.lastMessage || "",
        lastMessageAt: room.lastMessageAt || room.last_message_at || room.createdAt || room.created_at || null,
        unread: typeof room.unread === "number" ? room.unread : 0,
        memberIds: memberIds.length ? memberIds : room.memberIds || undefined
      });
    });
    saveStorage();
    renderChatList();
  } catch {}
};

const addMessage = (chatId, msg, { render = true, unread = true } = {}) => {
  if (!state.messages[chatId]) state.messages[chatId] = [];
  const index = ensureMessageIndex(chatId);
  const key = getMessageKey(msg);
  if (key && index.has(key)) {
    updateMessage(chatId, key, msg);
    return;
  }
  if (key) index.set(key, msg);
  state.messages[chatId].push(msg);
  
  const chat = state.chats.find((c) => c.id === chatId);
  if (chat) {
    chat.lastMessage = msg.body || "";
    chat.lastMessageAt = msg.created_at || new Date().toISOString();
    if (unread && state.activeChatId !== chatId) chat.unread = (chat.unread || 0) + 1;
  }
  
  if (render && state.activeChatId === chatId) {
    const el = $("messages");
    if (el) {
      const list = state.messages[chatId] || [];
      const prev = list[list.length - 2];
      if (!prev || !isSameDay(prev.created_at, msg.created_at)) {
        el.appendChild(renderDateSeparator(formatDateLabel(msg.created_at)));
      }
      const grouped = isSameGroup(prev, msg);
      el.appendChild(renderMessage(msg, { showMeta: !grouped, showTime: !grouped }));
      el.scrollTop = el.scrollHeight;
    }
    if (msg.email && msg.email.toLowerCase() !== state.currentUserEmail?.toLowerCase()) {
      if (readReceiptTimer) clearTimeout(readReceiptTimer);
      readReceiptTimer = setTimeout(() => markRoomRead(chatId), 600);
    }
  }
  saveStorage();
  renderChatList();
};

