let panelInitialized = false;
let globalListenersInstalled = false;
let focusTrapInstalled = false;
let previouslyFocused = null;
const selectedEmails = new Set();

const isPanelOpen = () => $("panel")?.classList.contains("open");
const getActiveScreen = () => {
  const screens = $("screens");
  if (!screens) return null;
  const all = screens.querySelectorAll(".screen");
  const idx = state.screen === "chat" ? 1 : state.screen === "new" ? 2 : 0;
  return all[idx] || null;
};

const getFocusable = () => {
  const panel = $("panel");
  if (!panel) return [];

  const roots = [panel.querySelector(".header"), $("auth-banner"), getActiveScreen()].filter(Boolean);
  const nodes = roots.flatMap((root) =>
    Array.from(
      root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
    )
  );
  return Array.from(nodes).filter((n) => {
    if (!(n instanceof HTMLElement)) return false;
    if (n.hasAttribute("disabled")) return false;
    const style = window.getComputedStyle(n);
    return style.display !== "none" && style.visibility !== "hidden";
  });
};

const installFocusTrap = () => {
  if (focusTrapInstalled) return;
  focusTrapInstalled = true;
  document.addEventListener(
    "keydown",
    (e) => {
      if (!isPanelOpen()) return;
      if (e.key !== "Tab") return;

      const focusable = getFocusable();
      if (!focusable.length) return;

      const active = shadow.activeElement || shadow.querySelector(":focus") || document.activeElement;
      const currentIndex = focusable.indexOf(active);
      const dir = e.shiftKey ? -1 : 1;

      e.preventDefault();
      let nextIndex = currentIndex + dir;
      if (currentIndex === -1) nextIndex = e.shiftKey ? focusable.length - 1 : 0;
      if (nextIndex >= focusable.length) nextIndex = 0;
      if (nextIndex < 0) nextIndex = focusable.length - 1;
      focusable[nextIndex].focus();
    },
    true
  );
};

const refreshAuthUi = async () => {
  const banner = $("auth-banner");
  const bannerText = $("auth-banner-text");
  const signinBtn = $("auth-banner-signin");
  const userPill = $("user-pill");
  const signoutBtn = $("signout-btn");

  if (!banner || !bannerText || !signinBtn || !userPill || !signoutBtn) return;

  const signedIn = Boolean(state.currentUserEmail);
  if (typeof setAuthState === "function") {
    setAuthState(signedIn);
  }
  banner.classList.toggle("show", !signedIn);
  userPill.classList.toggle("hidden", !signedIn);
  signoutBtn.classList.toggle("hidden", !signedIn);

  if (signedIn) {
    userPill.textContent = sanitize(state.currentUserName || state.currentUserEmail);
    return;
  }

  bannerText.textContent = "Signed out. Sign in to send messages and view private chats.";
};

const renderChips = () => {
  const el = $("group-chips");
  if (!el) return;
  el.innerHTML = "";
  selectedEmails.forEach((e) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = e;
    el.appendChild(chip);
  });
};

const renderGroupUsers = () => {
  renderUsers(
    "group-users",
    "group-search",
    () => {},
    {
      selectMode: true,
      selectedEmails,
      onToggle: (user, selected) => {
        if (!user?.email) return;
        if (selected) selectedEmails.delete(user.email);
        else selectedEmails.add(user.email);
        renderChips();
        renderGroupUsers();
      }
    }
  );
};

const setTab = (tab) => {
  $("tab-dm")?.classList.toggle("active", tab === "dm");
  $("tab-group")?.classList.toggle("active", tab === "group");
  $("panel-dm")?.classList.toggle("hidden", tab !== "dm");
  $("panel-group")?.classList.toggle("hidden", tab !== "group");
};

const openPanel = async () => {
  const panel = $("panel");
  if (!panel) return;
  previouslyFocused = document.activeElement;
  panel.classList.add("open");
  state.panelOpen = true;
  panel.focus();
  installFocusTrap();

  await syncProfile(false);
  await refreshAuthUi();

  const data = await loadStorage();
  state.chats = data[KEYS.chats] || [];
  state.users = data[KEYS.users] || [];
  const pendingData = await loadPendingStorage();
  (pendingData[KEYS.pending] || []).forEach((p) => {
    if (p?.clientMessageId) pendingSends.set(p.clientMessageId, p);
  });
  if (state.currentUserEmail) {
    upsertUser(state.currentUserEmail, state.currentUserName);
  }
  await syncRoomsFromServer({ interactive: false, replace: true });
  ensureGeneral();
  await syncRoomsFromServer({ interactive: false });
  restorePendingMessages();
  updateQueueIndicator();
  saveStorage();
  renderChatList();
  await syncUnreadCounts();
  setScreen("list");
  $("search")?.focus();
};

const closePanel = () => {
  const panel = $("panel");
  if (!panel) return;
  panel.classList.remove("open");
  state.panelOpen = false;
  disconnect();
  setScreen("list");
  try {
    flushStorageNow();
  } catch {}
  if (previouslyFocused && previouslyFocused instanceof HTMLElement) {
    previouslyFocused.focus();
  } else {
    $("launcher")?.focus();
  }
};

const installGlobalListeners = () => {
  if (globalListenersInstalled) return;
  globalListenersInstalled = true;
  window.addEventListener("online", () => { updateQueueIndicator(); flushPendingMessages(); });
  window.addEventListener("offline", updateQueueIndicator);

  document.addEventListener("keydown", (e) => {
    if (widgetRoot?.style.display === "none") return;
    const panel = $("panel");
    const isOpen = panel?.classList.contains("open");
    if (e.key === "Escape" && isOpen) {
      if (state.screen !== "list") setScreen("list");
      else { closePanel(); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (isOpen) closePanel();
      else openPanel().catch(() => {});
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n" && isOpen) {
      e.preventDefault();
      $("new-btn")?.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f" && isOpen) {
      e.preventDefault();
      $("search")?.focus();
    }
  });
};

const initializePanelUi = () => {
  if (panelInitialized) return;
  panelInitialized = true;

  $("launcher").onclick = async () => {
    if (isPanelOpen()) closePanel();
    else await openPanel();
  };
  $("launcher").onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $("launcher")?.click();
    }
  };

  $("close-btn").onclick = () => {
    closePanel();
  };

  $("auth-banner-signin").onclick = async () => {
    await syncProfile(true);
    await refreshAuthUi();
    if (state.currentUserEmail) {
      upsertUser(state.currentUserEmail, state.currentUserName);
      await syncRoomsFromServer({ interactive: true, replace: true });
      saveStorage();
      renderChatList();
      await syncUnreadCounts();
    }
  };

  $("signout-btn").onclick = async () => {
    safeSendMessage({ type: "bt-auth:sign-out" }, () => {
      state.currentUserEmail = null;
      state.currentUserName = "You";
      refreshAuthUi();
      renderChatList();
    });
  };

  $("new-btn").onclick = async () => {
    await syncProfile(false);
    setScreen("new");
    setTab("dm");
    renderUsers("dm-users", "dm-search", (u) => startDM(u.email, u.name), { showAdd: true });
    renderChips();
    renderGroupUsers();
    $("dm-search")?.focus();
  };

  $("back-btn").onclick = () => { disconnect(); setScreen("list"); };
  $("new-back-btn").onclick = () => setScreen("list");

  $("tab-dm").onclick = () => setTab("dm");
  $("tab-group").onclick = () => setTab("group");

  $("search").oninput = renderChatList;
  $("dm-search").oninput = () => renderUsers("dm-users", "dm-search", (u) => startDM(u.email, u.name), { showAdd: true });
  $("group-search").oninput = renderGroupUsers;

  $("group-create").onclick = async () => {
    const name = $("group-name")?.value.trim();
    await createGroup(name, [...selectedEmails]);
    selectedEmails.clear();
    renderChips();
    renderGroupUsers();
  };

  $("input").oninput = (e) => $("typing").classList.toggle("show", !!e.target.value.trim());

  $("form").onsubmit = async (e) => {
    e.preventDefault();
    const input = $("input");
    const val = input.value.trim();
    if (!val) return;
    input.value = "";
    $("typing").classList.remove("show");
    await sendMessage(val);
  };

  $("load-older").onclick = loadOlderMessages;

  installGlobalListeners();
};

globalThis.initializePanelUi = initializePanelUi;
