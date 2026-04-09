// Chat operations
const normalizeMemberIds = (memberIds) => Array.from(
  new Set(
    (Array.isArray(memberIds) ? memberIds : [])
      .map((memberId) => String(memberId || "").trim().toLowerCase())
      .filter(Boolean)
  )
);

const getDmChatKey = (chat) => {
  if (chat?.type !== "dm") return "";
  const selfEmail = String(state.currentUserEmail || "").trim().toLowerCase();
  const otherMember = normalizeMemberIds(chat.memberIds).find((memberId) => memberId !== selfEmail);
  if (otherMember) return `dm:${otherMember}`;
  const fallbackName = String(chat.name || "").trim().toLowerCase();
  return fallbackName ? `dm-name:${fallbackName}` : "";
};

const getChatIdentity = (chat) => {
  if (!chat) return "";
  return getDmChatKey(chat) || `room:${chat.room || chat.id || ""}`;
};

const mergeChatMessages = (target = [], source = []) => {
  const combined = new Map();
  [...target, ...source].forEach((message) => {
    if (!message) return;
    const key = getMessageKey(message)
      || `${message.id || ""}:${message.created_at || ""}:${message.body || ""}`;
    if (!combined.has(key)) {
      combined.set(key, message);
      return;
    }
    Object.assign(combined.get(key), message);
  });
  return Array.from(combined.values()).sort((left, right) => {
    const timeDiff = new Date(left?.created_at || 0).getTime() - new Date(right?.created_at || 0).getTime();
    if (timeDiff !== 0) return timeDiff;
    return String(getMessageKey(left) || "").localeCompare(String(getMessageKey(right) || ""));
  });
};

const rekeyChatState = (fromChatId, toChatId) => {
  if (!fromChatId || !toChatId || fromChatId === toChatId) return;

  if (state.messages[fromChatId]) {
    state.messages[toChatId] = mergeChatMessages(state.messages[toChatId] || [], state.messages[fromChatId]);
    delete state.messages[fromChatId];

    const targetIndex = ensureMessageIndex(toChatId);
    targetIndex.clear();
    (state.messages[toChatId] || []).forEach((message) => {
      const key = getMessageKey(message);
      if (key) targetIndex.set(key, message);
    });
  }

  if (messageIndex.has(fromChatId)) {
    const fromIndex = messageIndex.get(fromChatId);
    const targetIndex = ensureMessageIndex(toChatId);
    fromIndex?.forEach((message, key) => {
      if (!targetIndex.has(key)) targetIndex.set(key, message);
    });
    messageIndex.delete(fromChatId);
  }

  if (Object.prototype.hasOwnProperty.call(state.roomMeta, fromChatId)) {
    state.roomMeta[toChatId] = state.roomMeta[toChatId] || state.roomMeta[fromChatId];
    delete state.roomMeta[fromChatId];
  }

  if (Object.prototype.hasOwnProperty.call(state.oldestMessageAt, fromChatId)) {
    state.oldestMessageAt[toChatId] = state.oldestMessageAt[toChatId] || state.oldestMessageAt[fromChatId];
    delete state.oldestMessageAt[fromChatId];
  }

  if (Object.prototype.hasOwnProperty.call(state.hasMore, fromChatId)) {
    state.hasMore[toChatId] = state.hasMore[toChatId] ?? state.hasMore[fromChatId];
    delete state.hasMore[fromChatId];
  }

  if (state.activeChatId === fromChatId) {
    state.activeChatId = toChatId;
  }
  if (state.currentRoom === fromChatId) {
    state.currentRoom = toChatId;
  }
};

const ensureChat = (chat) => {
  const normalizedChat = {
    ...chat,
    memberIds: normalizeMemberIds(chat?.memberIds)
  };
  if (!normalizedChat.memberIds.length) {
    delete normalizedChat.memberIds;
  }

  const identity = getChatIdentity(normalizedChat);
  const existing = state.chats.find((candidate) =>
    candidate.id === normalizedChat.id
    || (identity && getChatIdentity(candidate) === identity)
  );
  if (!existing) {
    state.chats.unshift(normalizedChat);
    return normalizedChat;
  }

  const previousId = existing.id;
  Object.assign(existing, normalizedChat);
  if (previousId && normalizedChat.id && previousId !== normalizedChat.id) {
    rekeyChatState(previousId, normalizedChat.id);
  }
  return existing;
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
    if (replace) {
      state.chats = [];
      state.roomMeta = {};
    }

    if (!rooms.length) {
      saveStorage();
      renderChatList();
      return;
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
      state.roomMeta[roomId] = {
        lastReadAt: room.lastReadAt || room.last_read_at || null,
        otherLastReadAt: room.otherLastReadAt || room.other_last_read_at || null
      };
    });
    saveStorage();
    renderChatList();
  } catch {
    // F9: Surface a user-visible indicator when the backend is unreachable.
    setStatus("Backend unreachable — showing cached data");
  }
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
      scheduleRoomRead(chatId);
    }
  }
  saveStorage();
  renderChatList();
};

