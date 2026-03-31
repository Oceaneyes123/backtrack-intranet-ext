const BT_CHAT_STYLES = `
:host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
*, *::before, *::after { box-sizing: border-box; }
.hidden { display: none !important; }
:host { color-scheme: dark; }

.launcher { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #e87722, #d4691a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; box-shadow: 0 4px 20px rgba(232,119,34,0.4); cursor: pointer; z-index: 2147483647; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease; user-select: none; animation: slideInBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
.launcher:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(232,119,34,0.6); }
.launcher:active { transform: scale(0.95); }
.launcher.panel-open { opacity: 0; transform: translateY(8px) scale(0.9); pointer-events: none; }
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

.panel { position: fixed; right: max(20px, env(safe-area-inset-right)); bottom: calc(88px + env(safe-area-inset-bottom)); width: min(380px, calc(100vw - 40px - env(safe-area-inset-left) - env(safe-area-inset-right))); height: min(560px, calc(100dvh - 120px - env(safe-area-inset-top) - env(safe-area-inset-bottom))); background: #0d1117; color: #e6edf3; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05); overflow: hidden; z-index: 2147483647; opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none; transition: opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); outline: none; }
.panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }

.header { padding: 16px; background: #161b22; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); min-width: 0; }
.header-title { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; }
.user-pill { font-size: 11px; font-weight: 600; color: #8b949e; padding: 2px 8px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: all 0.3s ease; }
.user-pill.hidden { display: none; }
.user-pill:hover { background: rgba(255,255,255,0.1); border-color: rgba(232, 119, 34, 0.3); }
.header-actions { display: flex; gap: 8px; flex-shrink: 0; }
.icon-btn { width: 32px; height: 32px; border: none; border-radius: 8px; background: rgba(232,119,34,0.15); color: #e87722; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease; }
.icon-btn:hover { background: rgba(232,119,34,0.25); transform: scale(1.05); }
.icon-btn:active { transform: scale(0.95); }
.close-btn { background: transparent; color: #8b949e; }
.close-btn:hover { color: #e6edf3; background: rgba(255,255,255,0.08); }
.signout-btn { background: transparent; color: #8b949e; font-size: 16px; }
.signout-btn:hover { color: #e6edf3; background: rgba(255,255,255,0.08); }

.panel-banner { display: none; flex: 1; align-items: center; justify-content: center; padding: 20px; background: transparent; opacity: 0; transform: translateY(-10px); transition: opacity 0.3s ease, transform 0.3s ease; }
.panel-banner.show { display: flex; opacity: 1; transform: translateY(0); }
 .panel-banner .btn { border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.08); color: #e6edf3; border-radius: 14px; padding: 14px 26px; min-width: 180px; font-size: 18px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; transition: all 0.2s ease; }
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

.screens { display: flex; width: 100%; flex: 1; min-height: 0; --screen-index: 0; transform: translateX(calc(var(--screen-index) * -100%)); }

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

.convo-header { padding: 14px 16px; background: #161b22; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); min-width: 0; }
.back-btn { background: none; border: none; color: #e6edf3; font-size: 20px; cursor: pointer; padding: 4px; transition: transform 0.2s ease, color 0.2s ease; border-radius: 8px; }
.back-btn:hover { color: #e87722; transform: translateX(-2px); background: rgba(232, 119, 34, 0.1); }
.back-btn:active { transform: translateX(0) scale(0.95); }
.convo-info { flex: 1; min-width: 0; }
.convo-title { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; min-width: 0; }
.status { font-size: 12px; color: #8b949e; }

.messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.msg { position: relative; max-width: 80%; display: flex; flex-direction: column; gap: 2px; animation: messageSlideIn 0.3s ease-out; }
.msg.sent { align-self: flex-end; align-items: flex-end; }
.msg.recv { align-self: flex-start; }
.msg.has-actions::before { content: ""; position: absolute; top: -8px; bottom: -8px; width: 44px; }
.msg.has-actions.sent::before { right: 100%; }
.msg.has-actions.recv::before { left: 100%; }

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
.message-actions { position: absolute; top: 50%; opacity: 0; pointer-events: none; transform: translateY(-50%); transition: opacity 0.18s ease, transform 0.18s ease; z-index: 2; }
.msg.sent .message-actions { right: calc(100% + 8px); }
.msg.recv .message-actions { left: calc(100% + 8px); }
.msg:hover .message-actions, .msg:focus-within .message-actions, .message-actions.open { opacity: 1; pointer-events: auto; }
.message-options-btn { width: 28px; height: 28px; border: none; border-radius: 999px; background: rgba(22,27,34,0.92); color: #8b949e; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.28); transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease; }
.message-options-btn:hover, .message-options-btn:focus-visible, .message-actions.open .message-options-btn { background: rgba(36,41,47,0.98); color: #e6edf3; transform: scale(1.03); }
.message-options-menu { position: absolute; top: 50%; min-width: 120px; padding: 6px; border-radius: 12px; background: rgba(22,27,34,0.98); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 14px 32px rgba(0,0,0,0.35); opacity: 0; visibility: hidden; transform: translateY(-50%) scale(0.96); transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease; }
.msg.sent .message-options-menu { right: calc(100% + 8px); }
.msg.recv .message-options-menu { left: calc(100% + 8px); }
.message-actions.open .message-options-menu { opacity: 1; visibility: visible; transform: translateY(-50%) scale(1); }
.message-action-btn { width: 100%; border: none; border-radius: 8px; padding: 8px 10px; background: transparent; color: #e6edf3; font-size: 12px; text-align: left; cursor: pointer; }
.message-action-btn:hover { background: rgba(255,255,255,0.08); }
.message-action-btn.delete { color: #ff8b8b; }
.message-action-btn.delete:hover { background: rgba(239,68,68,0.12); color: #ffb0b0; }
.status-indicator { font-size: 10px; color: #8b949e; }
.status-indicator.sending { color: #8b949e; }
.status-indicator.sent { color: #6e7681; }
.read-indicator { font-size: 10px; color: #22c55e; }
.date-separator { align-self: center; font-size: 11px; color: #8b949e; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.06); margin: 4px 0; animation: fadeIn 0.4s ease-out; transition: background 0.2s ease; }
.date-separator:hover { background: rgba(255,255,255,0.08); }
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

.input-bar { display: flex; gap: 10px; padding: 14px 16px 16px; background: linear-gradient(180deg, rgba(22,27,34,0.96), rgba(13,17,23,0.98)); border-top: 1px solid rgba(255,255,255,0.08); align-items: center; min-width: 0; }
.composer-field { flex: 1; min-width: 0; display: flex; align-items: center; padding: 0 14px; min-height: 50px; border-radius: 18px; background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04)); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 10px 24px rgba(0,0,0,0.16); transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease; }
.input-bar:focus-within .composer-field { border-color: rgba(232,119,34,0.45); background: linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); box-shadow: 0 14px 28px rgba(0,0,0,0.22); transform: translateY(-1px); }
.input-bar input { flex: 1; min-width: 0; padding: 0; border: none; outline: none; appearance: none; background: transparent; color: #f0f6fc; font-size: 14px; line-height: 1.5; box-shadow: none; }
.input-bar input::placeholder { color: #8b949e; }
.input-bar input:hover { background: transparent; }
.input-bar input:focus { background: transparent; box-shadow: none; outline: none; }
.input-bar input:focus-visible { outline: none; box-shadow: none; }
.cancel-btn { padding: 0 14px; height: 46px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; color: #8b949e; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease; }
.cancel-btn:hover { color: #e6edf3; border-color: rgba(255,255,255,0.22); background: rgba(255,255,255,0.08); transform: translateY(-1px); }
.cancel-btn.hidden { display: none; }
.send-btn { min-width: 78px; height: 46px; padding: 0 18px; background: linear-gradient(135deg, #f08a39, #d4691a); border: none; border-radius: 14px; color: #fff; font-size: 14px; font-weight: 700; letter-spacing: 0.01em; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease; box-shadow: 0 12px 24px rgba(232, 119, 34, 0.26); }
.send-btn:hover { opacity: 0.98; transform: translateY(-1px); box-shadow: 0 14px 28px rgba(232, 119, 34, 0.34); }
.send-btn:active { transform: translateY(0); box-shadow: 0 2px 6px rgba(232, 119, 34, 0.3); }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.send-btn { flex-shrink: 0; }

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

/* FF8: Error boundary overlay */
.error-boundary { position: absolute; inset: 0; background: rgba(13,17,23,0.95); display: flex; align-items: center; justify-content: center; z-index: 100; border-radius: 16px; }
.error-boundary-content { text-align: center; padding: 24px; }
.error-boundary-content p { color: #e6edf3; font-size: 14px; margin: 0 0 16px; }

@media (max-width: 560px), (max-height: 720px) {
  .launcher { right: max(14px, env(safe-area-inset-right)); bottom: calc(14px + env(safe-area-inset-bottom)); }
  .panel {
    left: max(12px, env(safe-area-inset-left));
    right: max(12px, env(safe-area-inset-right));
    bottom: calc(12px + env(safe-area-inset-bottom));
    width: auto;
    height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
    border-radius: 18px;
  }
  .header, .convo-header { padding: 12px 14px; }
  .messages { padding: 12px; }
  .input-bar { padding: 10px 12px; }
}
`;

globalThis.BT_CHAT_STYLES = BT_CHAT_STYLES;
