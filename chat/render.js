// Render helpers
const setStatus = (t) => { const el = $("status"); if (el) el.textContent = t; };
const setAuthState = (signedIn) => {
  const dot = $("header-status-dot");
  if (!dot) return;
  dot.classList.toggle("signed-in", signedIn);
  dot.setAttribute("title", signedIn ? "Signed in" : "Signed out");
};
const setConnectionState = (connected) => {
  setStatus(connected ? "Connected" : "Disconnected");
};

let badgeUpdateTimer = null;
let openMessageActions = null;
let messageMenuDismissInstalled = false;
let chatListRenderFrame = null;
const READ_RECEIPT_IDLE_MS = 1000;
const READ_RECEIPT_COOLDOWN_MS = 2000;
const roomReadReceipts = new Map();
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
const updateUnreadBadge = (chatId, unread) => {
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;
  chat.unread = unread || 0;
  renderChatList();
};

const getRoomReadReceiptEntry = (roomId) => {
  if (!roomReadReceipts.has(roomId)) {
    roomReadReceipts.set(roomId, { timer: null, dirty: false, lastSentAt: 0 });
  }
  return roomReadReceipts.get(roomId);
};

const clearRoomReadTimer = (roomId) => {
  const entry = roomReadReceipts.get(roomId);
  if (!entry?.timer) return;
  clearTimeout(entry.timer);
  entry.timer = null;
};

const hasPendingRoomRead = (roomId) => Boolean(roomReadReceipts.get(roomId)?.dirty);

const flushRoomRead = async (roomId, { force = false } = {}) => {
  if (!roomId) return;
  const entry = getRoomReadReceiptEntry(roomId);
  clearRoomReadTimer(roomId);
  if (!force && !entry.dirty) return;
  const nowMs = Date.now();
  if (!force && nowMs - entry.lastSentAt < READ_RECEIPT_COOLDOWN_MS) {
    scheduleRoomRead(roomId);
    return;
  }
  entry.dirty = false;
  entry.lastSentAt = nowMs;
  try {
    const data = await api.post(`/api/chat/rooms/${encodeURIComponent(roomId)}/read`, {});
    if (data?.otherLastReadAt || data?.lastReadAt) {
      state.roomMeta[roomId] = {
        lastReadAt: data.lastReadAt || null,
        otherLastReadAt: data.otherLastReadAt || null
      };
      renderReadIndicators(roomId);
    }
    if (typeof data?.unreadCount === "number") {
      updateUnreadBadge(roomId, data.unreadCount);
    }
  } catch {
    entry.dirty = true;
  }
};

const scheduleRoomRead = (roomId, { immediate = false } = {}) => {
  if (!roomId) return;
  const entry = getRoomReadReceiptEntry(roomId);
  entry.dirty = true;
  clearRoomReadTimer(roomId);
  const sinceLast = Date.now() - entry.lastSentAt;
  const dueIn = immediate
    ? Math.max(0, READ_RECEIPT_COOLDOWN_MS - sinceLast)
    : Math.max(READ_RECEIPT_IDLE_MS, READ_RECEIPT_COOLDOWN_MS - sinceLast);
  entry.timer = setTimeout(() => {
    entry.timer = null;
    flushRoomRead(roomId);
  }, dueIn);
};

const markRoomRead = (roomId, options = {}) => flushRoomRead(roomId, options);
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

const getMessageTimeLabel = (m) => {
  const label = formatTime(m.created_at);
  return m.edited_at ? `${label} · Edited` : label;
};

const getMessageRenderOptions = (chatId, key) => {
  const list = state.messages[chatId] || [];
  const idx = list.findIndex((m) => getMessageKey(m) === key);
  if (idx === -1) return { showMeta: true, showTime: true };
  const prev = idx > 0 ? list[idx - 1] : null;
  const curr = list[idx];
  const grouped = isSameGroup(prev, curr);
  return { showMeta: !grouped, showTime: !grouped };
};

const renderReadIndicators = (roomId = state.currentRoom) => {
  if (!roomId || state.activeChatId !== roomId) return;
  const otherReadAt = state.roomMeta[roomId]?.otherLastReadAt;
  const currentUserEmail = String(state.currentUserEmail || "").toLowerCase();
  const list = state.messages[roomId] || [];

  list.forEach((message) => {
    const key = getMessageKey(message);
    const el = findMessageElement(roomId, key);
    if (!el) return;

    const shouldShow = Boolean(
      otherReadAt
      && message.status === "sent"
      && currentUserEmail
      && String(message.email || "").toLowerCase() === currentUserEmail
      && new Date(otherReadAt).getTime() >= new Date(message.created_at).getTime()
    );

    const existing = el.querySelector(".read-indicator");
    if (shouldShow && !existing) {
      const read = document.createElement("div");
      read.className = "read-indicator";
      read.textContent = "Read";
      el.appendChild(read);
    } else if (!shouldShow && existing) {
      existing.remove();
    }
  });
};

const replaceMessageElement = (chatId, key) => {
  const el = findMessageElement(chatId, key);
  if (!el) return false;
  const msg = (state.messages[chatId] || []).find((item) => getMessageKey(item) === key);
  if (!msg) return false;
  const next = renderMessage(msg, getMessageRenderOptions(chatId, key));
  el.replaceWith(next);
  return true;
};

const setMessageActionsOpen = (actions, open) => {
  if (!actions) return;
  actions.classList.toggle("open", open);
  const trigger = actions.querySelector(".message-options-btn");
  if (trigger) {
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (open) {
    openMessageActions = actions;
  } else if (openMessageActions === actions) {
    openMessageActions = null;
  }
};

const closeMessageMenus = (except = null) => {
  if (openMessageActions && openMessageActions !== except) {
    setMessageActionsOpen(openMessageActions, false);
  }
  if (!except) {
    openMessageActions = null;
  }
};

const installMessageMenuDismiss = () => {
  if (messageMenuDismissInstalled) return;
  messageMenuDismissInstalled = true;

  document.addEventListener("pointerdown", (event) => {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const insideActions = path.some(
      (node) => node instanceof Element && node.classList?.contains("message-actions")
    );
    if (!insideActions) {
      closeMessageMenus();
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMessageMenus();
    }
  }, true);
};

const renderMessage = (m, { showMeta = true, showTime = true } = {}) => {
  const isSelf = state.currentUserEmail && m.email?.toLowerCase() === state.currentUserEmail;
  const el = document.createElement("div");
  el.className = `msg ${isSelf ? "sent" : "recv"}`;
  const key = getMessageKey(m);
  if (key) el.dataset.msgKey = key;
  if (m.id) el.dataset.messageId = String(m.id);

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
    time.textContent = getMessageTimeLabel(m);
    el.appendChild(time);
  }

  const showActions = canManageMessage(m, state.currentUserEmail);
  if (showActions) {
    el.classList.add("has-actions");
    const actions = document.createElement("div");
    actions.className = "message-actions";
    actions.setAttribute("role", "group");
    actions.setAttribute("aria-label", "Message actions");

    const trigger = document.createElement("button");
    trigger.className = "message-options-btn";
    trigger.type = "button";
    trigger.setAttribute("aria-label", "More actions");
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.textContent = "⋮";

    const menu = document.createElement("div");
    menu.className = "message-options-menu";
    menu.setAttribute("role", "menu");

    const editBtn = document.createElement("button");
    editBtn.className = "message-action-btn";
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.setAttribute("role", "menuitem");
    editBtn.onclick = (event) => {
      event.stopPropagation();
      setMessageActionsOpen(actions, false);
      beginMessageEdit(key);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "message-action-btn delete";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("role", "menuitem");
    deleteBtn.onclick = (event) => {
      event.stopPropagation();
      setMessageActionsOpen(actions, false);
      deleteMessageByKey(key);
    };

    trigger.onclick = (event) => {
      event.stopPropagation();
      const nextOpen = !actions.classList.contains("open");
      closeMessageMenus(actions);
      setMessageActionsOpen(actions, nextOpen);
    };

    menu.append(editBtn, deleteBtn);
    actions.append(trigger, menu);
    el.appendChild(actions);
    installMessageMenuDismiss();
  }

  if (isSelf && m.status) {
    const status = document.createElement("div");
    status.className = `status-indicator ${m.status}`;
    status.textContent = getStatusLabel(m.status);
    el.appendChild(status);
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

  updateChatPreview(chatId);
  saveStorage();
  if (state.activeChatId === chatId) {
    if (!replaceMessageElement(chatId, key)) {
      renderMessages(chatId);
    } else {
      renderReadIndicators(chatId);
    }
  }
  renderChatList();
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
    renderMessages(chatId);
  }

  updateChatPreview(chatId);
  saveStorage();
  renderChatList();
};

const renderMessages = (chatId) => {
  const el = $("messages");
  if (!el) return;
  closeMessageMenus();
  el.replaceChildren();
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

const renderChatListNow = () => {
  const el = $("chat-list");
  if (!el) return;
  const q = ($("search")?.value || "").toLowerCase();
  const sorted = [...state.chats].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
    .filter((c) => !q || c.name?.toLowerCase().includes(q) || c.lastMessage?.toLowerCase().includes(q));

  el.replaceChildren();
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

const renderChatList = (options = {}) => {
  const immediate = options && typeof options === "object" && options.immediate === true;
  if (immediate || typeof globalThis.requestAnimationFrame !== "function") {
    renderChatListNow();
    return;
  }
  if (chatListRenderFrame) return;
  chatListRenderFrame = globalThis.requestAnimationFrame(() => {
    chatListRenderFrame = null;
    renderChatListNow();
  });
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
  
  el.replaceChildren();
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

  // Only allow the inline "Start DM" add entry when the user is signed in
  // F4: Require a basic email format before showing the option.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (showAdd && EMAIL_RE.test(q) && state.currentUserEmail) {
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

