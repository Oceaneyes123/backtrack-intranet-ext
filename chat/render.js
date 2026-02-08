// Render helpers
const setStatus = (t) => { const el = $("status"); if (el) el.textContent = t; };
const setAuthState = (signedIn) => {
  const dot = $("header-status-dot");
  if (!dot) return;
  dot.classList.toggle("signed-in", signedIn);
  dot.setAttribute("title", signedIn ? "Signed in" : "Signed out");
};
const setConnectionState = (connected) => {
  const chip = $("online-chip");
  if (chip) {
    chip.classList.toggle("online", connected);
    chip.classList.toggle("offline", !connected);
    chip.textContent = connected ? "Online" : "Offline";
  }
  setStatus(connected ? "Connected" : "Disconnected");
  updateQueueIndicator();
};

let badgeUpdateTimer = null;
const getTotalUnread = () => state.chats.reduce((sum, c) => sum + (Number(c.unread) || 0), 0);
const updateBadges = () => {
  if (badgeUpdateTimer) return;
  badgeUpdateTimer = setTimeout(() => {
    badgeUpdateTimer = null;
    const totalUnread = getTotalUnread();

    const launcherBadge = $("launcher-badge");
    if (launcherBadge) {
      launcherBadge.textContent = totalUnread > 99 ? "99+" : totalUnread ? String(totalUnread) : "";
      launcherBadge.classList.toggle("hidden", !totalUnread);
    }

    safeSendMessage({ type: "bt-chat:set-badge", unread: totalUnread });
  }, 100);
};
const updateQueueIndicator = () => {
  const el = $("queue-indicator");
  if (!el) return;
  const count = pendingSends.size;
  if (!navigator.onLine) {
    el.textContent = count ? `Offline • ${count} queued` : "Offline";
    el.classList.remove("hidden");
    return;
  }
  if (count) {
    el.textContent = `${count} queued`;
    el.classList.remove("hidden");
  } else {
    el.textContent = "";
    el.classList.add("hidden");
  }
};

const updateUnreadBadge = (chatId, unread) => {
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;
  chat.unread = unread || 0;
  renderChatList();
};

const markRoomRead = async (roomId) => {
  if (!roomId) return;
  try {
    const data = await api.post(`/api/chat/rooms/${encodeURIComponent(roomId)}/read`, {});
    if (data?.otherLastReadAt || data?.lastReadAt) {
      state.roomMeta[roomId] = {
        lastReadAt: data.lastReadAt || null,
        otherLastReadAt: data.otherLastReadAt || null
      };
      renderMessages(roomId);
    }
    if (typeof data?.unreadCount === "number") {
      updateUnreadBadge(roomId, data.unreadCount);
    }
  } catch {}
};

const syncUnreadCounts = async () => {
  if (!state.chats.length) return;
  await syncProfile(false);
  await Promise.all(
    state.chats.map(async (c) => {
      try {
        const data = await api.get(`/api/chat/rooms/${encodeURIComponent(c.room || c.id)}/meta`);
        if (typeof data?.unreadCount === "number") {
          c.unread = data.unreadCount;
        }
        if (data?.displayName) {
          c.name = data.displayName;
        }
        if (Array.isArray(data?.members)) {
          c.memberIds = data.members.map((m) => (m?.email || "").toLowerCase()).filter(Boolean);
        }
        if (data?.otherLastReadAt || data?.lastReadAt) {
          state.roomMeta[c.room || c.id] = {
            lastReadAt: data.lastReadAt || null,
            otherLastReadAt: data.otherLastReadAt || null
          };
        }
      } catch {}
    })
  );
  renderChatList();
};
const setScreen = (s) => {
  state.screen = s;
  const screens = $("screens");
  if (screens) {
    const index = s === "chat" ? 1 : s === "new" ? 2 : 0;
    screens.setAttribute("data-screen", s);
    screens.style.setProperty("--screen-index", String(index));
  }
  $("new-btn")?.classList.toggle("hidden", s !== "list");
};

const renderDateSeparator = (label) => {
  const el = document.createElement("div");
  el.className = "date-separator";
  el.textContent = label;
  return el;
};

const renderMessage = (m, { showMeta = true, showTime = true } = {}) => {
  const isSelf = state.currentUserEmail && m.email?.toLowerCase() === state.currentUserEmail;
  const el = document.createElement("div");
  el.className = `msg ${isSelf ? "sent" : "recv"}`;
  const key = getMessageKey(m);
  if (key) el.dataset.msgKey = key;

  if (showMeta) {
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = sanitize(m.author);
    el.appendChild(meta);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = sanitize(m.body);

  el.appendChild(bubble);

  if (showTime) {
    const time = document.createElement("div");
    time.className = "time";
    time.textContent = formatTime(m.created_at);
    el.appendChild(time);
  }

  if (isSelf && m.status) {
    const status = document.createElement("div");
    status.className = `status-indicator ${m.status}`;
    status.textContent = getStatusLabel(m.status);
    el.appendChild(status);
  }
  if (isSelf && m.status === "failed") {
    const retry = document.createElement("button");
    retry.className = "retry-btn";
    retry.type = "button";
    retry.textContent = "Retry";
    retry.onclick = () => retrySend(getMessageKey(m));
    el.appendChild(retry);
  }

  if (isSelf && m.status === "sent") {
    const meta = state.roomMeta[state.currentRoom];
    const otherReadAt = meta?.otherLastReadAt;
    if (otherReadAt && new Date(otherReadAt).getTime() >= new Date(m.created_at).getTime()) {
      const read = document.createElement("div");
      read.className = "read-indicator";
      read.textContent = "Read";
      el.appendChild(read);
    }
  }
  return el;
};

const findMessageElement = (chatId, key) => {
  if (state.activeChatId !== chatId) return null;
  const container = $("messages");
  if (!container || !key) return null;
  const safeKey = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(key) : key;
  return container.querySelector(`[data-msg-key="${safeKey}"]`);
};

const updateMessage = (chatId, key, updates = {}) => {
  const index = ensureMessageIndex(chatId);
  let msg = index.get(key);
  if (!msg && key) {
    const list = state.messages[chatId] || [];
    msg = list.find((m) => getMessageKey(m) === key);
    if (msg) index.set(key, msg);
  }
  if (!msg) return;
  const prevStatus = msg.status;
  Object.assign(msg, updates);
  if (!updates.status && prevStatus === "sending") {
    msg.status = "sent";
  } else if (!msg.status && prevStatus) {
    msg.status = prevStatus;
  }

  const el = findMessageElement(chatId, key);
  if (!el) {
    if (state.activeChatId === chatId) {
      renderMessages(chatId);
    }
    return;
  }

  const timeEl = el.querySelector(".time");
  if (timeEl) timeEl.textContent = formatTime(msg.created_at);

  if (msg.status && state.currentUserEmail && msg.email?.toLowerCase() === state.currentUserEmail) {
    let statusEl = el.querySelector(".status-indicator");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.className = "status-indicator";
      el.appendChild(statusEl);
    }
    statusEl.className = `status-indicator ${msg.status}`;
    statusEl.textContent = getStatusLabel(msg.status);
  }

  const readEl = el.querySelector(".read-indicator");
  if (msg.status === "sent") {
    const meta = state.roomMeta[state.currentRoom];
    const otherReadAt = meta?.otherLastReadAt;
    const isRead = otherReadAt && new Date(otherReadAt).getTime() >= new Date(msg.created_at).getTime();
    if (isRead && !readEl) {
      const read = document.createElement("div");
      read.className = "read-indicator";
      read.textContent = "Read";
      el.appendChild(read);
    } else if (!isRead && readEl) {
      readEl.remove();
    }
  } else if (readEl) {
    readEl.remove();
  }

  const existingRetry = el.querySelector(".retry-btn");
  if (msg.status === "failed") {
    if (!existingRetry) {
      const retry = document.createElement("button");
      retry.className = "retry-btn";
      retry.type = "button";
      retry.textContent = "Retry";
      retry.onclick = () => retrySend(key);
      el.appendChild(retry);
    }
  } else if (existingRetry) {
    existingRetry.remove();
  }
};

const updateChatPreview = (chatId) => {
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;
  const msgs = state.messages[chatId] || [];
  const last = msgs[msgs.length - 1];
  if (last) {
    chat.lastMessage = last.body || "";
    chat.lastMessageAt = last.created_at || new Date().toISOString();
  } else {
    chat.lastMessage = "";
    chat.lastMessageAt = null;
  }
};

const removeMessage = (chatId, key) => {
  const msgs = state.messages[chatId];
  if (!msgs || !key) return;
  const idx = msgs.findIndex((m) => getMessageKey(m) === key);
  if (idx === -1) return;
  msgs.splice(idx, 1);
  const index = ensureMessageIndex(chatId);
  index.delete(key);

  if (state.activeChatId === chatId) {
    const el = findMessageElement(chatId, key);
    if (el) el.remove();
    else renderMessages(chatId);
  }

  updateChatPreview(chatId);
  saveStorage();
  renderChatList();
};

const renderMessages = (chatId) => {
  const el = $("messages");
  if (!el) return;
  el.innerHTML = "";
  const list = state.messages[chatId] || [];
  let prev = null;
  list.forEach((m) => {
    if (!prev || !isSameDay(prev.created_at, m.created_at)) {
      el.appendChild(renderDateSeparator(formatDateLabel(m.created_at)));
    }
    const grouped = isSameGroup(prev, m);
    el.appendChild(renderMessage(m, { showMeta: !grouped, showTime: !grouped }));
    prev = m;
  });
  el.scrollTop = el.scrollHeight;
};

const prependMessages = (chatId, older) => {
  if (!older.length) return;
  if (!state.messages[chatId]) state.messages[chatId] = [];
  const index = ensureMessageIndex(chatId);
  const el = $("messages");
  const prevHeight = el?.scrollHeight || 0;

  const toInsert = [];
  older.forEach((m) => {
    const key = getMessageKey(m);
    if (key && index.has(key)) return;
    if (key) index.set(key, m);
    toInsert.push(m);
  });

  // Preserve chronological order in state.messages by unshifting in reverse.
  for (let i = toInsert.length - 1; i >= 0; i--) {
    state.messages[chatId].unshift(toInsert[i]);
  }

  if (el && toInsert.length) {
    const frag = document.createDocumentFragment();
    let next = state.messages[chatId][toInsert.length];
    for (let i = 0; i < toInsert.length; i++) {
      const m = toInsert[i];
      const prev = i === 0 ? null : toInsert[i - 1];
      if (!prev || !isSameDay(prev.created_at, m.created_at)) {
        frag.appendChild(renderDateSeparator(formatDateLabel(m.created_at)));
      }
      const grouped = isSameGroup(prev, m);
      frag.appendChild(renderMessage(m, { showMeta: !grouped, showTime: !grouped }));
    }
    if (next && !isSameDay(toInsert[toInsert.length - 1]?.created_at, next.created_at)) {
      frag.appendChild(renderDateSeparator(formatDateLabel(next.created_at)));
    }
    el.insertBefore(frag, el.firstChild);
    const nextHeight = el.scrollHeight;
    el.scrollTop = nextHeight - prevHeight + el.scrollTop;
  }
};

const renderChatList = () => {
  const el = $("chat-list");
  if (!el) return;
  const q = ($("search")?.value || "").toLowerCase();
  const sorted = [...state.chats].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
    .filter((c) => !q || c.name?.toLowerCase().includes(q) || c.lastMessage?.toLowerCase().includes(q));

  el.innerHTML = "";
  if (!sorted.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No chats yet";
    el.appendChild(empty);
    return;
  }

  sorted.forEach((c) => {
    const item = document.createElement("div");
    item.className = "chat-item";
    item.setAttribute("role", "button");
    item.tabIndex = 0;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = initials(c.name);

    const content = document.createElement("div");
    content.className = "content";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = sanitize(c.name);
    const preview = document.createElement("div");
    preview.className = "preview";
    preview.textContent = sanitize(c.lastMessage) || "Start chatting";
    content.append(name, preview);

    const meta = document.createElement("div");
    meta.className = "meta";
    const time = document.createElement("div");
    time.className = "time";
    time.textContent = formatTime(c.lastMessageAt);
    meta.appendChild(time);
    if (c.unread) {
      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = String(c.unread);
      meta.appendChild(badge);
    }

    item.append(avatar, content, meta);
    item.onclick = () => openChat(c.id);
    item.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openChat(c.id); } };
    el.appendChild(item);
  });

  updateBadges();
};

const renderUsers = (listId, searchId, onSelect, options = {}) => {
  const el = $(listId);
  if (!el) return;
  const { showAdd = false, selectMode = false, selectedEmails = null, onToggle = null } = options;
  if (state.currentUserEmail) {
    upsertUser(state.currentUserEmail, state.currentUserName);
  }
  const q = ($(searchId)?.value || "").toLowerCase();
  const filtered = state.users.filter((u) => {
    const name = getUserName(u).toLowerCase();
    const email = u.email?.toLowerCase() || "";
    return !q || name.includes(q) || email.includes(q);
  });
  
  el.innerHTML = "";
  filtered.forEach((u) => {
    const item = document.createElement("div");
    item.className = "user-item";
    item.setAttribute("role", "button");
    item.tabIndex = 0;

    const info = document.createElement("div");
    info.className = "info";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = sanitize(getUserName(u));
    const email = document.createElement("div");
    email.className = "email";
    email.textContent = sanitize(u.email);
    info.append(name, email);

    const arrow = document.createElement("div");
    arrow.className = "arrow";
    const selected = selectMode && selectedEmails?.has(u.email);
    arrow.textContent = selectMode ? (selected ? "✓" : "＋") : "→";

    item.append(info, arrow);
    item.onclick = () => {
      if (selectMode && typeof onToggle === "function") {
        onToggle(u, selected);
      } else {
        onSelect(u);
      }
    };
    item.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (selectMode && typeof onToggle === "function") {
          onToggle(u, selected);
        } else {
          onSelect(u);
        }
      }
    };
    el.appendChild(item);
  });

  if (showAdd && q.includes("@")) {
    const add = document.createElement("div");
    add.className = "user-item";
    add.setAttribute("role", "button");
    add.tabIndex = 0;
    const info = document.createElement("div");
    info.className = "info";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = "Start DM with";
    const email = document.createElement("div");
    email.className = "email";
    email.textContent = sanitize(q);
    info.append(name, email);
    const arrow = document.createElement("div");
    arrow.className = "arrow";
    arrow.textContent = "＋";
    add.append(info, arrow);
    add.onclick = () => onSelect({ email: q, name: q });
    add.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect({ email: q, name: q }); } };
    el.appendChild(add);
  }
};

