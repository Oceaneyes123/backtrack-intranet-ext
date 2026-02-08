// Connection
let sseController = null;
let sseReconnectTimer = null;
let sseBackoff = 1000;
let sseRoom = null;
let sseConnectSeq = 0;
let wsAuthRetryInFlight = false;

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
  setConnectionState(false);
};

const handleIncomingMessage = (roomId, d) => {
  addMessage(roomId, normalizeMessage(d));
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
    setStatus("SSE connection failed");
    scheduleSseReconnect(roomId);
    return;
  }

  if (!res || !res.ok || !res.body) {
    if (connectSeq !== sseConnectSeq || controller.signal.aborted || !reconnectEnabled) return;
    setStatus("SSE connection failed");
    scheduleSseReconnect(roomId);
    return;
  }

  if (connectSeq !== sseConnectSeq) return;
  setConnectionState(true);
  sseBackoff = 1000;
  flushPendingMessages();

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
            handleIncomingMessage(roomId, payload);
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
      setStatus("WebSocket blocked, using SSE");
      connectSse(roomId);
    }, 3000);
    ws.onopen = () => {
      if (connectSeq !== wsConnectSeq) return;
      opened = true;
      clearTimeout(fallbackTimer);
      closeSse();
      backoff = 1000;
      setConnectionState(true);
      flushPendingMessages();
    };
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        handleIncomingMessage(roomId, d);
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
        setStatus("WebSocket blocked, using SSE");
        connectSse(roomId);
      }
      setConnectionState(false);
    };
  } catch {
    setStatus("Connection failed");
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
      state.messages[state.currentRoom] = msgs;
      const index = ensureMessageIndex(state.currentRoom);
      index.clear();
      msgs.forEach((m) => {
        const key = getMessageKey(m);
        if (key) index.set(key, m);
      });
      renderMessages(state.currentRoom);
    }

    if (!before) {
      mergePendingForRoom(state.currentRoom);
    }

    if (!before && (data?.otherLastReadAt || data?.lastReadAt)) {
      state.roomMeta[state.currentRoom] = {
        lastReadAt: data.lastReadAt || null,
        otherLastReadAt: data.otherLastReadAt || null
      };
      renderMessages(state.currentRoom);
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

const restorePendingMessages = () => {
  if (!pendingSends.size) return;
  pendingSends.forEach((p) => {
    if (!p?.room || !p?.clientMessageId) return;
    const chatId = p.room;
    const msg = {
      id: p.tempId || crypto.randomUUID(),
      author: state.currentUserName,
      email: state.currentUserEmail,
      body: p.body,
      created_at: p.createdAt || new Date().toISOString(),
      client_message_id: p.clientMessageId,
      status: p.status || "failed"
    };
    addMessage(chatId, msg, { unread: false, render: chatId === state.activeChatId });
  });
};

const mergePendingForRoom = (chatId) => {
  if (!pendingSends.size || !chatId) return;
  pendingSends.forEach((p) => {
    if (p?.room !== chatId || !p?.clientMessageId) return;
    const msg = {
      id: p.tempId || crypto.randomUUID(),
      author: state.currentUserName,
      email: state.currentUserEmail,
      body: p.body,
      created_at: p.createdAt || new Date().toISOString(),
      client_message_id: p.clientMessageId,
      status: p.status || "failed"
    };
    addMessage(chatId, msg, { unread: false, render: true });
  });
};

const queuePendingMessage = (payload) => {
  if (!payload?.clientMessageId) return;
  pendingSends.set(payload.clientMessageId, payload);
  savePendingStorage();
  updateQueueIndicator();
};

const clearPendingMessage = (clientMessageId) => {
  if (!pendingSends.has(clientMessageId)) return;
  pendingSends.delete(clientMessageId);
  savePendingStorage();
  updateQueueIndicator();
};

const trySendPending = async (payload) => {
  if (!payload?.room || !payload?.clientMessageId) return false;
  try {
    updateMessage(payload.room, payload.clientMessageId, { status: "sending" });
    const res = await api.post(`/api/chat/rooms/${encodeURIComponent(payload.room)}/messages`, {
      body: payload.body,
      clientMessageId: payload.clientMessageId
    });
    updateMessage(payload.room, payload.clientMessageId, {
      id: res?.id || payload.tempId,
      created_at: res?.created_at || new Date().toISOString(),
      status: "sent"
    });
    clearPendingMessage(payload.clientMessageId);
    return true;
  } catch {
    updateMessage(payload.room, payload.clientMessageId, { status: "failed" });
    return false;
  }
};

const flushPendingMessages = async () => {
  if (flushInFlight || !navigator.onLine || !pendingSends.size) return;
  flushInFlight = true;
  const items = Array.from(pendingSends.values());
  for (const payload of items) {
    await trySendPending(payload);
  }
  flushInFlight = false;
  updateQueueIndicator();
};

const retrySend = async (clientMessageId) => {
  if (!clientMessageId) return;
  const payload = pendingSends.get(clientMessageId);
  if (!payload) return;
  await trySendPending(payload);
};

const openChat = async (chatId) => {
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;
  
  state.activeChatId = chatId;
  state.currentRoom = chat.room || chat.id;
  chat.unread = 0;
  
  const nameEl = $("active-name");
  if (nameEl) nameEl.textContent = chat.name || "Chat";
  
  setScreen("chat");
  renderMessages(chatId);
  await loadHistory();
  await markRoomRead(state.currentRoom);
  $("input")?.focus();
  await connect(state.currentRoom);
};

const startDM = async (email, name) => {
  await syncProfile(false);
  if (!state.currentUserEmail) {
    await syncProfile(true);
  }
  try {
    const data = await api.post("/api/chat/direct", { email });
    const chat = ensureChat({ id: data.room, room: data.room, type: "dm", name: name || email, lastMessage: "", lastMessageAt: new Date().toISOString(), unread: 0 });
    saveStorage();
    await openChat(chat.id);
  } catch { setStatus("Failed to start DM"); }
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

const sendMessage = async (body) => {
  if (!body.trim() || !state.activeChatId) return;
  
  if (!state.currentUserEmail) await syncProfile(false);
  if (!state.currentUserEmail) await syncProfile(true);
  if (!state.currentUserEmail) {
    setStatus("Sign in required");
    return;
  }
  const clientMessageId = crypto.randomUUID();
  const tempId = crypto.randomUUID();
  
  addMessage(state.activeChatId, {
    id: tempId,
    author: state.currentUserName,
    email: state.currentUserEmail,
    body,
    created_at: new Date().toISOString(),
    client_message_id: clientMessageId,
    status: "sending"
  }, { unread: false });


  queuePendingMessage({
    room: state.currentRoom,
    body,
    clientMessageId,
    tempId,
    createdAt: new Date().toISOString(),
    status: "sending"
  });
  
  try {
    const res = await api.post(`/api/chat/rooms/${encodeURIComponent(state.currentRoom)}/messages`, { body, clientMessageId: clientMessageId });
    updateMessage(state.activeChatId, clientMessageId, {
      id: res?.id || tempId,
      created_at: res?.created_at || new Date().toISOString(),
      status: "sent"
    });
    clearPendingMessage(clientMessageId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      await connect(state.currentRoom);
    }
  } catch {
    updateMessage(state.activeChatId, clientMessageId, { status: "failed" });
    queuePendingMessage({
      room: state.currentRoom,
      body,
      clientMessageId,
      tempId,
      createdAt: new Date().toISOString(),
      status: "failed"
    });
    setStatus("Failed to send");
  }
};
