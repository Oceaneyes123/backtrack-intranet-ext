// Widget entrypoint
const mount = async () => {
  if (widgetRoot) {
    widgetRoot.style.display = "";
    return;
  }

  widgetRoot = document.createElement("div");
  widgetRoot.id = "bt-chat-root";
  shadow = widgetRoot.attachShadow({ mode: "open" });
  const styles = globalThis.BT_CHAT_STYLES || "";
  const template = globalThis.BT_CHAT_TEMPLATE || "";
  shadow.innerHTML = `<style>${styles}</style>${template}`;
  document.body.appendChild(widgetRoot);

  if (typeof initializePanelUi === "function") {
    initializePanelUi();
  } else {
    console.error("Backtrack chat: initializePanelUi() not found. Check manifest script order.");
  }
};

const unmount = () => {
  if (!widgetRoot) return;
  state.panelOpen = false;
  try {
    disconnect();
  } catch {}
  $("panel")?.classList.remove("open");
  setScreen("list");
  widgetRoot.style.display = "none";
};
