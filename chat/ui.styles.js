const BT_CHAT_STYLES = `
:host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
*, *::before, *::after { box-sizing: border-box; }
.hidden { display: none !important; }

.launcher { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #e87722, #d4691a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; box-shadow: 0 4px 20px rgba(232,119,34,0.4); cursor: pointer; z-index: 2147483647; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease; user-select: none; animation: slideInBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
.launcher:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(232,119,34,0.6); }
.launcher:active { transform: scale(0.95); }
.launcher-badge { position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: #ef4444; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(13,17,23,0.9); box-shadow: 0 4px 12px rgba(0,0,0,0.35); animation: badgePulse 2s ease-in-out infinite; }
.launcher-badge.hidden { display: none; }

@keyframes slideInBounce {
  0% { transform: translateY(100px) scale(0.5); opacity: 0; }
  50% { transform: translateY(-10px) scale(1.05); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes badgePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); box-shadow: 0 4px 16px rgba(239, 68, 68, 0.6); }
}

.panel { position: fixed; bottom: 88px; right: 20px; width: 380px; max-width: calc(100vw - 40px); height: 560px; max-height: calc(100vh - 120px); background: #0d1117; color: #e6edf3; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05); overflow: hidden; z-index: 2147483647; opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none; transition: opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); outline: none; }
.panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }

.header { padding: 16px; background: #161b22; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); }
.header-title { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.user-pill { font-size: 11px; font-weight: 600; color: #8b949e; padding: 2px 8px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: all 0.3s ease; }
.user-pill.hidden { display: none; }
.user-pill:hover { background: rgba(255,255,255,0.1); border-color: rgba(232, 119, 34, 0.3); }
.header-actions { display: flex; gap: 8px; }
.queue-indicator { font-size: 11px; color: #8b949e; padding: 2px 6px; border-radius: 999px; background: rgba(255,255,255,0.06); transition: all 0.3s ease; animation: fadeIn 0.3s ease-out; }
.queue-indicator.hidden { display: none; }
.queue-indicator:hover { background: rgba(255,255,255,0.1); }
.icon-btn { width: 32px; height: 32px; border: none; border-radius: 8px; background: rgba(232,119,34,0.15); color: #e87722; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease; }
.icon-btn:hover { background: rgba(232,119,34,0.25); transform: scale(1.05); }
.icon-btn:active { transform: scale(0.95); }
.close-btn { background: transparent; color: #8b949e; }
.close-btn:hover { color: #e6edf3; background: rgba(255,255,255,0.08); }
.signout-btn { background: transparent; color: #8b949e; font-size: 16px; }
.signout-btn:hover { color: #e6edf3; background: rgba(255,255,255,0.08); }

.panel-banner { padding: 10px 12px; display: none; gap: 10px; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(232,119,34,0.08); opacity: 0; transform: translateY(-10px); transition: opacity 0.3s ease, transform 0.3s ease; }
.panel-banner.show { display: flex; opacity: 1; transform: translateY(0); }
.panel-banner .text { font-size: 12px; color: #e6edf3; line-height: 1.3; }
.panel-banner .actions { display: flex; gap: 8px; }
.panel-banner .btn { border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.08); color: #e6edf3; border-radius: 10px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
.panel-banner .btn.primary { border-color: rgba(232,119,34,0.45); background: rgba(232,119,34,0.18); color: #e87722; }
.panel-banner .btn:hover { background: rgba(255,255,255,0.12); transform: translateY(-1px); }
.panel-banner .btn.primary:hover { background: rgba(232,119,34,0.25); }
.panel-banner .btn:active { transform: translateY(0); }

.status-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(239,68,68,0.8); box-shadow: 0 0 0 2px rgba(239,68,68,0.2); transition: all 0.3s ease; }
.status-dot.signed-in { background: rgba(34,197,94,0.9); box-shadow: 0 0 0 2px rgba(34,197,94,0.25); }
.status-dot.online { background: rgba(34,197,94,0.9); box-shadow: 0 0 0 2px rgba(34,197,94,0.25); animation: pulse 2s ease-in-out infinite; }

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.25); }
  50% { box-shadow: 0 0 0 4px rgba(34,197,94,0.15); }
}

.screens { display: flex; width: 100%; height: 100%; --screen-index: 0; transform: translateX(calc(var(--screen-index) * -100%)); }

.screen { flex: 0 0 100%; width: 100%; display: flex; flex-direction: column; background: #0d1117; overflow: hidden; }

.search { padding: 12px 16px; }
.search input, .input-field { width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #e6edf3; font-size: 14px; outline: none; transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease; }
.search input:hover, .input-field:hover { background: rgba(255,255,255,0.07); }
.search input:focus, .input-field:focus { border-color: rgba(232,119,34,0.5); background: rgba(255,255,255,0.08); box-shadow: 0 0 0 3px rgba(232,119,34,0.1); }

.chat-list { flex: 1; overflow-y: auto; }
.chat-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; transition: background 0.2s ease, transform 0.2s ease; border-bottom: 1px solid rgba(255,255,255,0.04); animation: fadeInSlide 0.3s ease-out backwards; }
.chat-item:hover { background: rgba(255,255,255,0.06); transform: translateX(2px); }
.chat-item:active { transform: scale(0.98); }

@keyframes fadeInSlide {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}
.avatar { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, rgba(232,119,34,0.2), rgba(232,119,34,0.1)); color: #e87722; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.chat-item:hover .avatar { transform: scale(1.05); box-shadow: 0 4px 12px rgba(232, 119, 34, 0.2); }
.content { flex: 1; min-width: 0; }
.name { font-size: 14px; font-weight: 500; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.preview { font-size: 13px; color: #8b949e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.time { font-size: 11px; color: #8b949e; }
.badge { min-width: 20px; height: 20px; padding: 0 6px; background: #e87722; color: #fff; border-radius: 10px; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; animation: badgeAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }

@keyframes badgeAppear {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
.empty { padding: 24px; color: #8b949e; text-align: center; font-size: 14px; animation: fadeIn 0.5s ease-out; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.convo-header { padding: 14px 16px; background: #161b22; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.back-btn { background: none; border: none; color: #e6edf3; font-size: 20px; cursor: pointer; padding: 4px; transition: transform 0.2s ease, color 0.2s ease; border-radius: 8px; }
.back-btn:hover { color: #e87722; transform: translateX(-2px); background: rgba(232, 119, 34, 0.1); }
.back-btn:active { transform: translateX(0) scale(0.95); }
.convo-info { flex: 1; }
.convo-title { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.status { font-size: 12px; color: #8b949e; }
.online-chip { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.08); color: #8b949e; border: 1px solid rgba(255,255,255,0.12); transition: all 0.3s ease; }
.online-chip.online { background: rgba(34,197,94,0.15); color: #22c55e; border-color: rgba(34,197,94,0.5); animation: fadeIn 0.4s ease; }
.online-chip.offline { background: rgba(239,68,68,0.15); color: #ef4444; border-color: rgba(239,68,68,0.5); }

.messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.msg { max-width: 80%; display: flex; flex-direction: column; gap: 2px; animation: messageSlideIn 0.3s ease-out; }
.msg.sent { align-self: flex-end; align-items: flex-end; }
.msg.recv { align-self: flex-start; }

@keyframes messageSlideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.msg .meta { font-size: 11px; color: #8b949e; }
.bubble { padding: 10px 14px; border-radius: 14px; background: rgba(255,255,255,0.08); font-size: 14px; line-height: 1.4; word-wrap: break-word; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.bubble:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }
.msg.sent .bubble { background: linear-gradient(135deg, rgba(232,119,34,0.3), rgba(232,119,34,0.2)); border-bottom-right-radius: 4px; }
.msg.recv .bubble { border-bottom-left-radius: 4px; }
.msg .time { font-size: 10px; color: #6e7681; }
.status-indicator { font-size: 10px; color: #8b949e; }
.status-indicator.sending { color: #8b949e; }
.status-indicator.sent { color: #6e7681; }
.status-indicator.failed { color: #ef4444; }
.read-indicator { font-size: 10px; color: #22c55e; }
.date-separator { align-self: center; font-size: 11px; color: #8b949e; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.06); margin: 4px 0; animation: fadeIn 0.4s ease-out; transition: background 0.2s ease; }
.date-separator:hover { background: rgba(255,255,255,0.08); }
.retry-btn { margin-top: 2px; background: none; border: none; padding: 0; color: #ef4444; font-size: 11px; cursor: pointer; transition: transform 0.2s ease, color 0.2s ease; }
.retry-btn:hover { text-decoration: underline; color: #ff5555; transform: scale(1.05); }
.retry-btn:active { transform: scale(0.95); }
.load-older { width: 100%; padding: 8px 0; background: transparent; border: none; color: #8b949e; cursor: pointer; font-size: 12px; transition: color 0.2s ease, background 0.2s ease; border-radius: 8px; }
.load-older:hover { color: #e6edf3; background: rgba(255, 255, 255, 0.04); }
.load-older.hidden { display: none; }

.typing { padding: 0 16px 8px; font-size: 12px; color: #8b949e; display: none; animation: fadeIn 0.3s ease; }
.typing.show { display: block; }
.typing::after {
  content: '';
  display: inline-block;
  animation: ellipsis 1.4s infinite;
}

@keyframes ellipsis {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}

.input-bar { display: flex; gap: 8px; padding: 12px 16px; background: #161b22; border-top: 1px solid rgba(255,255,255,0.08); }
.input-bar input { flex: 1; }
.send-btn { padding: 10px 18px; background: linear-gradient(135deg, #e87722, #d4691a); border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease; }
.send-btn:hover { opacity: 0.95; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(232, 119, 34, 0.4); }
.send-btn:active { transform: translateY(0); box-shadow: 0 2px 6px rgba(232, 119, 34, 0.3); }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.tabs { display: flex; gap: 8px; padding: 12px 16px 0; }
.tab { flex: 1; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #e6edf3; font-size: 13px; font-weight: 500; cursor: pointer; text-align: center; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; outline: none; }
.tab:hover { background: rgba(255,255,255,0.08); transform: translateY(-1px); }
.tab.active { background: rgba(232,119,34,0.15); border-color: rgba(232,119,34,0.4); color: #e87722; transform: translateY(0); }
.tab:active { transform: scale(0.98); }

.tab-content { flex: 1; padding: 12px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.tab-content.hidden { display: none; }

.user-list { display: flex; flex-direction: column; gap: 6px; }
.user-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(255,255,255,0.04); border-radius: 10px; cursor: pointer; transition: background 0.2s ease, transform 0.2s ease; }
.user-item:hover { background: rgba(255,255,255,0.08); transform: translateX(4px); }
.user-item:active { transform: scale(0.98); }
.user-item .info { display: flex; flex-direction: column; gap: 2px; }
.user-item .name { font-size: 14px; font-weight: 500; }
.user-item .email { font-size: 12px; color: #8b949e; }
.arrow { color: #8b949e; font-size: 16px; }

.chips { display: flex; flex-wrap: wrap; gap: 6px; min-height: 28px; }
.chip { padding: 4px 10px; background: rgba(232,119,34,0.15); border-radius: 20px; font-size: 12px; color: #e6edf3; animation: chipSlideIn 0.3s ease-out; transition: transform 0.2s ease, background 0.2s ease; }
.chip:hover { transform: scale(1.05); background: rgba(232,119,34,0.2); }

@keyframes chipSlideIn {
  from { opacity: 0; transform: translateY(-10px) scale(0.8); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.primary-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #e87722, #d4691a); border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease; }
.primary-btn:hover { opacity: 0.95; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(232, 119, 34, 0.4); }
.primary-btn:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(232, 119, 34, 0.3); }
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.new-chat-fab { position: absolute; right: 18px; bottom: 18px; width: 48px; height: 48px; border-radius: 50%; border: none; background: linear-gradient(135deg, #e87722, #d4691a); color: #fff; font-size: 24px; font-weight: 600; cursor: pointer; box-shadow: 0 10px 28px rgba(232,119,34,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease; }
.new-chat-fab:hover { transform: translateY(-2px) rotate(90deg); box-shadow: 0 12px 32px rgba(232,119,34,0.5); }
.new-chat-fab:active { transform: translateY(0) rotate(90deg) scale(0.95); }
.new-chat-fab.hidden { display: none; }

button:focus-visible, input:focus-visible { outline: 2px solid rgba(232,119,34,0.6); outline-offset: 2px; }
.panel:focus { outline: none; }
.tab:focus-visible { outline: 2px solid rgba(232,119,34,0.6); outline-offset: -2px; }

/* Smooth scrolling for all scrollable areas */
.chat-list, .messages, .tab-content, .user-list {
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: rgba(232, 119, 34, 0.3) transparent;
}

.chat-list::-webkit-scrollbar, .messages::-webkit-scrollbar, .tab-content::-webkit-scrollbar, .user-list::-webkit-scrollbar {
  width: 6px;
}

.chat-list::-webkit-scrollbar-track, .messages::-webkit-scrollbar-track, .tab-content::-webkit-scrollbar-track, .user-list::-webkit-scrollbar-track {
  background: transparent;
}

.chat-list::-webkit-scrollbar-thumb, .messages::-webkit-scrollbar-thumb, .tab-content::-webkit-scrollbar-thumb, .user-list::-webkit-scrollbar-thumb {
  background: rgba(232, 119, 34, 0.3);
  border-radius: 3px;
}

.chat-list::-webkit-scrollbar-thumb:hover, .messages::-webkit-scrollbar-thumb:hover, .tab-content::-webkit-scrollbar-thumb:hover, .user-list::-webkit-scrollbar-thumb:hover {
  background: rgba(232, 119, 34, 0.5);
}

/* Skeleton loading state */
.skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 10px; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Loading indicator */
.loading-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(232, 119, 34, 0.2); border-top-color: #e87722; border-radius: 50%; animation: spin 0.8s linear infinite; }

@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

globalThis.BT_CHAT_STYLES = BT_CHAT_STYLES;
