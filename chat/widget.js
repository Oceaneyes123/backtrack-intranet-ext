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

  // FF8: Wire error-boundary reload button.
  const reloadBtn = $("error-reload");
  if (reloadBtn) {
    reloadBtn.onclick = () => {
      $("error-boundary")?.classList.add("hidden");
      widgetRoot.style.display = "none";
      widgetRoot = null;
      shadow = null;
      document.getElementById("bt-chat-root")?.remove();
      panelInitialized = false;
      mount();
    };
  }
};

// FF8: Global error boundary — catch unhandled errors in the widget and show
// a recovery UI instead of leaving the widget in a broken state.
const showErrorBoundary = () => {
  try {
    const overlay = $("error-boundary");
    if (overlay) overlay.classList.remove("hidden");
    try { disconnect(); } catch {}
  } catch {
    // If even the error boundary fails, hide the widget entirely.
    if (widgetRoot) widgetRoot.style.display = "none";
  }
};

/**
 * Wrap a function so that any thrown error triggers the error boundary
 * instead of crashing the widget silently.
 */
const safeCall = (fn) => {
  if (typeof fn !== "function") return fn;
  return (...args) => {
    try {
      const result = fn(...args);
      if (result && typeof result.catch === "function") {
        return result.catch((err) => {
          console.error("Backtrack chat error:", err);
          showErrorBoundary();
        });
      }
      return result;
    } catch (err) {
      console.error("Backtrack chat error:", err);
      showErrorBoundary();
    }
  };
};

const unmount = () => {
  if (!widgetRoot) return;
  state.panelOpen = false;
  try {
    disconnect();
  } catch {}
  $("panel")?.classList.remove("open");
  $("launcher")?.classList.remove("panel-open");
  setScreen("list");
  widgetRoot.style.display = "none";
};
