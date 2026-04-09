// Connection
let sseController = null;
let sseReconnectTimer = null;
let sseBackoff = 1000;
let sseRoom = null;
let sseConnectSeq = 0;
let wsAuthRetryInFlight = false;
const pendingDmRequests = new Set();

const clearReconnectTimer = () => {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
};

const clearSseReconnectTimer = () => {
  if (!sseReconnectTimer) return;
  clearTimeout(sseReconnectTimer);
  sseReconnectTimer = null;
};

const closeWebSocket = () => {
  clearReconnectTimer();
  if (!ws) return;
  try {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    ws.close();
  } catch {}
  ws = null;
};

const closeSse = () => {
  clearSseReconnectTimer();
  if (sseController) {
    try { sseController.abort(); } catch {}
  }
  sseController = null;
  sseRoom = null;
};

const disconnect = () => {
  reconnectEnabled = false;
  wsRoom = null;
  wsConnectSeq += 1;
  closeWebSocket();
  closeSse();
  backoff = 1000;
  sseBackoff = 1000;
  clearComposerEditing();
  setConnectionState(false);
};

const findMessageKey = (chatId, { key, id, clientMessageId } = {}) => {
  if (key) {
    const direct = ensureMessageIndex(chatId).get(key);
    if (direct) return key;
  }

  const msgs = state.messages[chatId] || [];
  const found = msgs.find((m) => {
    if (id != null && String(m.id) === String(id)) return true;
    if (clientMessageId && (m.client_message_id || m.clientMessageId) === clientMessageId) return true;
    return false;
  });

  return found ? getMessageKey(found) : "";
};

const getMessageByKey = (chatId, key) => {
  if (!chatId || !key) return null;
  return (state.messages[chatId] || []).find((m) => getMessageKey(m) === key) || null;
};

const messagesEqual = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    const a = left[i];
    const b = right[i];
    if (!a || !b) return false;
    if (getMessageKey(a) !== getMessageKey(b)) return false;
    if ((a.id || null) !== (b.id || null)) return false;
    if ((a.body || "") !== (b.body || "")) return false;
    if ((a.created_at || "") !== (b.created_at || "")) return false;
    if ((a.edited_at || "") !== (b.edited_at || "")) return false;
    if ((a.email || "") !== (b.email || "")) return false;
  }
  return true;
};

const clearComposerEditing = () => {
  const wasEditing = Boolean(state.editingMessageId || state.editingMessageKey);
  state.editingMessageId = null;
  state.editingMessageKey = null;
  const input = $("input");
  const cancelBtn = $("edit-cancel-btn");
  const sendBtn = $("form")?.querySelector(".send-btn");
  if (input) {
    if (wasEditing) {
      input.value = "";
    }
    input.placeholder = "Type a message…";
  }
  if (cancelBtn) {
    cancelBtn.classList.add("hidden");
  }
  if (sendBtn) {
    sendBtn.textContent = "Send";
    sendBtn.setAttribute("aria-label", "Send message");
  }
  if (wasEditing) {
    $("typing")?.classList.remove("show");
  }
};

const beginMessageEdit = (key) => {
  const chatId = state.activeChatId;
  const message = getMessageByKey(chatId, key);
  if (!canManageMessage(message, state.currentUserEmail)) return;

  state.editingMessageId = message.id;
  state.editingMessageKey = getMessageKey(message);

  const input = $("input");
  const cancelBtn = $("edit-cancel-btn");
  const sendBtn = $("form")?.querySelector(".send-btn");
  if (input) {
    input.value = message.body || "";
    input.placeholder = "Edit message…";
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  if (cancelBtn) {
    cancelBtn.classList.remove("hidden");
  }
  if (sendBtn) {
    sendBtn.textContent = "Save";
    sendBtn.setAttribute("aria-label", "Save message");
  }
  setStatus("Editing message");
};

const cancelMessageEdit = () => {
  clearComposerEditing();
  $("input")?.focus();
  setStatus(state.currentRoom ? "Connected" : "Disconnected");
};

const applyEditedMessage = (roomId, payload) => {
  const message = normalizeMessage(payload);
  const key = findMessageKey(roomId, {
    key: getMessageKey(message),
    id: message.id,
    clientMessageId: message.client_message_id
  });
  if (!key) return;
  updateMessage(roomId, key, {
    id: message.id,
    body: message.body,
    created_at: message.created_at,
    edited_at: message.edited_at,
    status: "sent"
  });
};

const applyDeletedMessage = (roomId, payload) => {
  const key = findMessageKey(roomId, {
    id: payload?.messageId,
    clientMessageId: payload?.clientMessageId
  });
  if (!key) return;
  if (state.editingMessageKey === key) {
    clearComposerEditing();
  }
  removeMessage(roomId, key);
};

const handleIncomingPayload = (roomId, payload) => {
  if (payload?.type === "message.edited") {
    applyEditedMessage(roomId, payload.message);
    return;
  }
  if (payload?.type === "message.deleted") {
    applyDeletedMessage(roomId, payload);
    return;
  }
  addMessage(roomId, normalizeMessage(payload));
};

const handleWsAuthFailure = async (roomId) => {
  if (wsAuthRetryInFlight) return;
  wsAuthRetryInFlight = true;
  await clearCachedToken();
  let token = await getToken(false);
  if (!token) {
    token = await getToken(true);
  }
  wsAuthRetryInFlight = false;
  if (!token) {
    setStatus("Sign in required");
    reconnectEnabled = false;
    return;
  }
  connect(roomId);
};

const scheduleSseReconnect = (roomId) => {
  if (!reconnectEnabled || sseRoom !== roomId || state.currentRoom !== roomId) return;
  clearSseReconnectTimer();
  sseReconnectTimer = setTimeout(() => {
    sseBackoff = Math.min(sseBackoff * 1.5, 15000);
    connectSse(roomId);
  }, sseBackoff);
};

const connectSse = async (roomId = state.currentRoom) => {
  const connectSeq = (sseConnectSeq += 1);
  clearSseReconnectTimer();
  closeSse();
  sseRoom = roomId;

  const token = await getToken(false);
  const url = `${API_URL}/api/chat/rooms/${encodeURIComponent(roomId)}/stream`;
  const headers = token ? { Authorization: `Bearer ${token}`, Accept: "text/event-stream" } : { Accept: "text/event-stream" };
  const controller = new AbortController();
  sseController = controller;

  let res = null;
  try {
    res = await fetch(url, { headers, signal: controller.signal });
    if (res.status === 401) {
      await clearCachedToken();
      let freshToken = await getToken(false);
      if (!freshToken) {
        freshToken = await getToken(true);
      }
      if (!freshToken) {
        setStatus("Sign in required");
        return;
      }
      const freshHeaders = { Authorization: `Bearer ${freshToken}`, Accept: "text/event-stream" };
      res = await fetch(url, { headers: freshHeaders, signal: controller.signal });
    }
  } catch {
    if (connectSeq !== sseConnectSeq || controller.signal.aborted || !reconnectEnabled) return;
    setConnectionState(false);
    scheduleSseReconnect(roomId);
    return;
  }

  if (!res || !res.ok || !res.body) {
    if (connectSeq !== sseConnectSeq || controller.signal.aborted || !reconnectEnabled) return;
    if (res?.status === 401) {
      await clearCachedToken();
      setStatus("Sign in required");
      return;
    }
    if (res?.status === 403) {
      setStatus("Forbidden");
      return;
    }
    setConnectionState(false);
    scheduleSseReconnect(roomId);
    return;
  }

  if (connectSeq !== sseConnectSeq) return;
  setConnectionState(true);
  sseBackoff = 1000;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r/g, "");
      let idx = buffer.indexOf("\n\n");
      while (idx !== -1) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const dataLines = chunk
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());
        if (dataLines.length) {
          try {
            const payload = JSON.parse(dataLines.join("\n"));
            handleIncomingPayload(roomId, payload);
          } catch {}
        }
        idx = buffer.indexOf("\n\n");
      }
    }
  } catch {
    // Ignore stream parse errors.
  }

  if (connectSeq !== sseConnectSeq) return;
  if (controller.signal.aborted || !reconnectEnabled) return;
  setConnectionState(false);
  scheduleSseReconnect(roomId);
};

const connect = async (roomId = state.currentRoom) => {
  reconnectEnabled = true;
  wsRoom = roomId;
  const connectSeq = (wsConnectSeq += 1);

  // Close any existing socket without triggering reconnect logic.
  closeWebSocket();
  closeSse();

  const token = await getToken(false);
  const wsProtocol = API_URL.startsWith("https:") ? "wss" : "ws";
  const url = `${wsProtocol}://${API_URL.replace(/^https?:\/\//, "")}/ws/chat?room=${encodeURIComponent(roomId)}`;
  
  try {
    let opened = false;
    const protocols = ["bt-chat-v1"];
    if (token) protocols.push(`bt-auth.${token}`);
    ws = new WebSocket(url, protocols);
    const fallbackTimer = setTimeout(() => {
      if (connectSeq !== wsConnectSeq || opened) return;
      connectSse(roomId);
    }, 3000);
    ws.onopen = () => {
      if (connectSeq !== wsConnectSeq) return;
      opened = true;
      clearTimeout(fallbackTimer);
      closeSse();
      backoff = 1000;
      setConnectionState(true);
    };
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        handleIncomingPayload(roomId, d);
      } catch {}
    };
    ws.onclose = (event) => {
      if (connectSeq !== wsConnectSeq) return;
      clearTimeout(fallbackTimer);
      setConnectionState(false);
      if (!reconnectEnabled) return;
      if (wsRoom !== roomId) return;
      if (state.currentRoom !== roomId) return;
      clearReconnectTimer();
      if (event?.code === 1008) {
        handleWsAuthFailure(roomId);
        return;
      }
      if (event?.code === 1006 || event?.code === 1011) {
        connectSse(roomId);
        return;
      }
      reconnectTimer = setTimeout(() => {
        backoff = Math.min(backoff * 1.5, 15000);
        connect(roomId);
      }, backoff);
    };
    ws.onerror = () => {
      if (connectSeq !== wsConnectSeq) return;
      if (!opened) {
        connectSse(roomId);
      }
      setConnectionState(false);
    };
  } catch {
    setConnectionState(false);
    connectSse(roomId);
  }
};

const loadHistory = async ({ before } = {}) => {
  try {
    const beforeParam = before ? `&before=${encodeURIComponent(before)}` : "";
    const data = await api.get(`/api/chat/rooms/${encodeURIComponent(state.currentRoom)}/messages?limit=${MESSAGE_PAGE_SIZE}${beforeParam}`);
    const msgs = (data.messages || data || []).map((m) => normalizeMessage(m));
    if (before) {
      prependMessages(state.currentRoom, msgs);
    } else {
      const previous = state.messages[state.currentRoom] || [];
      state.messages[state.currentRoom] = msgs;
      const index = ensureMessageIndex(state.currentRoom);
      index.clear();
      msgs.forEach((m) => {
        const key = getMessageKey(m);
        if (key) index.set(key, m);
      });
      if (!messagesEqual(previous, msgs)) {
        renderMessages(state.currentRoom);
      }
    }

    if (!before && (data?.otherLastReadAt || data?.lastReadAt)) {
      state.roomMeta[state.currentRoom] = {
        lastReadAt: data.lastReadAt || null,
        otherLastReadAt: data.otherLastReadAt || null
      };
      renderReadIndicators(state.currentRoom);
    }

    if (!before && typeof data?.unreadCount === "number") {
      updateUnreadBadge(state.currentRoom, data.unreadCount);
    }

    const oldest = msgs[0];
    if (oldest?.created_at) state.oldestMessageAt[state.currentRoom] = oldest.created_at;
    state.hasMore[state.currentRoom] = msgs.length === MESSAGE_PAGE_SIZE;
    $("load-older")?.classList.toggle("hidden", !state.hasMore[state.currentRoom]);
    
    if (!before) {
      const last = msgs[msgs.length - 1];
      if (last) {
        const chat = state.chats.find((c) => c.id === state.currentRoom);
        if (chat) { chat.lastMessage = last.body; chat.lastMessageAt = last.created_at; }
        saveStorage();
      }
    }
  } catch { setStatus("Failed to load history"); }
};

const loadOlderMessages = async () => {
  const before = state.oldestMessageAt[state.currentRoom];
  if (!before || !state.hasMore[state.currentRoom]) return;
  await loadHistory({ before });
};

const openChat = async (chatId) => {
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;

  clearComposerEditing();
  
  state.activeChatId = chatId;
  state.currentRoom = chat.room || chat.id;
  chat.unread = 0;
  
  const nameEl = $("active-name-label");
  if (nameEl) nameEl.textContent = chat.name || "Chat";
  
  setScreen("chat");
  renderMessages(chatId);
  await loadHistory();
  await markRoomRead(state.currentRoom, { force: true });
  $("input")?.focus();
  await connect(state.currentRoom);
};

const findExistingDirectChat = (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  return state.chats.find((chat) =>
    chat?.type === "dm"
    && Array.isArray(chat.memberIds)
    && chat.memberIds.includes(normalizedEmail)
  ) || null;
};

const startDM = async (email, name) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    setStatus("Email required");
    return;
  }

  const existingChat = findExistingDirectChat(normalizedEmail);
  if (existingChat) {
    await openChat(existingChat.id);
    return;
  }

  if (pendingDmRequests.has(normalizedEmail)) {
    setStatus("Starting chat");
    return;
  }

  await syncProfile(false);
  if (!state.currentUserEmail) {
    await syncProfile(true);
  }
  if (!state.currentUserEmail) {
    setStatus("Sign in required");
    return;
  }

  pendingDmRequests.add(normalizedEmail);
  setStatus("Starting chat");
  try {
    const data = await api.post("/api/chat/direct", { email: normalizedEmail });
    const chat = ensureChat({
      id: data.room,
      room: data.room,
      type: "dm",
      name: name || normalizedEmail,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unread: 0,
      memberIds: [state.currentUserEmail, normalizedEmail]
    });
    saveStorage();
    await openChat(chat.id);
  } catch {
    setStatus("Failed to start DM");
  } finally {
    pendingDmRequests.delete(normalizedEmail);
  }
};

const createGroup = async (name, members) => {
  if (!name || members.length < 2) { setStatus("Name and 2+ members required"); return; }

  await syncProfile(false);
  if (!state.currentUserEmail) {
    await syncProfile(true);
  }

  try {
    const data = await api.post("/api/chat/groups", { name, members });
    const roomId = data?.room;
    if (!roomId) {
      setStatus("Failed to create group");
      return;
    }

    const memberIds = [...new Set([...members, state.currentUserEmail].filter(Boolean))];
    const chat = ensureChat({
      id: roomId,
      room: roomId,
      type: "group",
      name: data?.name || name,
      memberIds,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unread: 0
    });
    saveStorage();
    await openChat(chat.id);
  } catch {
    setStatus("Failed to create group");
  }
};

const saveEditedMessage = async (body) => {
  if (!body.trim() || !state.activeChatId || !state.editingMessageId || !state.editingMessageKey) return;
  if (body.length > 4000) {
    setStatus("Message too long (max 4000 characters)");
    return;
  }

  try {
    const res = await api.patch(`/api/chat/rooms/${encodeURIComponent(state.currentRoom)}/messages/${encodeURIComponent(state.editingMessageId)}`, { body });
    updateMessage(state.activeChatId, state.editingMessageKey, {
      body: res?.body || body,
      edited_at: res?.edited_at || new Date().toISOString(),
      status: "sent"
    });
    clearComposerEditing();
    setStatus("Message updated");
  } catch {
    setStatus("Failed to update message");
  }
};

const deleteMessageByKey = async (key) => {
  const message = getMessageByKey(state.activeChatId, key);
  if (!message?.id) return;
  if (typeof globalThis.confirm === "function" && !globalThis.confirm("Delete this message?")) {
    return;
  }

  try {
    await api.delete(`/api/chat/rooms/${encodeURIComponent(state.currentRoom)}/messages/${encodeURIComponent(message.id)}`);
    if (state.editingMessageKey === key) {
      clearComposerEditing();
    }
    removeMessage(state.activeChatId, key);
    setStatus("Message deleted");
  } catch {
    setStatus("Failed to delete message");
  }
};

const submitComposer = async (body) => {
  if (state.editingMessageId) {
    await saveEditedMessage(body);
    return;
  }
  await sendMessage(body);
};

const sendMessage = async (body) => {
  if (!body.trim() || !state.activeChatId) return;
  if (body.length > 4000) {
    setStatus("Message too long (max 4000 characters)");
    return;
  }
  
  if (!state.currentUserEmail) await syncProfile(false);
  if (!state.currentUserEmail) await syncProfile(true);
  if (!state.currentUserEmail) {
    setStatus("Sign in required");
    return;
  }
  const chatId = state.activeChatId;
  const roomId = state.currentRoom;
  const clientMessageId = crypto.randomUUID();
  const tempId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  
  addMessage(chatId, {
    id: tempId,
    author: state.currentUserName,
    email: state.currentUserEmail,
    body,
    created_at: createdAt,
    client_message_id: clientMessageId,
    status: "sending"
  }, { unread: false });
  
  try {
    const res = await api.post(`/api/chat/rooms/${encodeURIComponent(roomId)}/messages`, { body, clientMessageId });
    updateMessage(chatId, clientMessageId, {
      id: res?.id || tempId,
      created_at: res?.created_at || createdAt,
      status: "sent"
    });
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      await connect(roomId);
    }
  } catch {
    removeMessage(chatId, clientMessageId);
    setStatus("Failed to send");
  }
};

globalThis.beginMessageEdit = beginMessageEdit;
globalThis.cancelMessageEdit = cancelMessageEdit;
globalThis.deleteMessageByKey = deleteMessageByKey;
globalThis.submitComposer = submitComposer;
