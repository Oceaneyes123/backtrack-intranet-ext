const BT_CHAT_TEMPLATE = `
<div class="launcher" id="launcher" role="button" aria-label="Open chat" tabindex="0">💬<span class="launcher-badge hidden" id="launcher-badge" aria-label="Unread messages"></span></div>
<div class="panel" id="panel" role="dialog" aria-label="Backtrack chat" aria-modal="true" tabindex="-1">
  <div class="header">
    <div class="header-title">Backtrack Chat <span class="status-dot" id="header-status-dot"></span><span class="user-pill hidden" id="user-pill"></span></div>
    <div class="header-actions">
      <button class="icon-btn signout-btn" id="signout-btn" aria-label="Sign out" title="Sign out">⎋</button>
      <button class="icon-btn close-btn" id="close-btn" aria-label="Close chat">✕</button>
    </div>
  </div>
  <div class="panel-banner" id="auth-banner" role="status" aria-live="polite">
    <button class="btn primary" id="auth-banner-signin" type="button">Sign in</button>
  </div>
  <div class="screens" id="screens" data-screen="list">
    <section class="screen">
      <div class="search"><input id="search" type="text" placeholder="Search chats…" aria-label="Search chats" /></div>
      <div class="chat-list" id="chat-list"></div>
    </section>
    <section class="screen">
      <div class="convo-header">
        <button class="back-btn" id="back-btn" aria-label="Back to chat list">←</button>
        <div class="convo-info">
          <div class="convo-title" id="active-name"><span id="active-name-label">Chat</span></div>
          <div class="status" id="status" aria-live="polite">Disconnected</div>
        </div>
      </div>
      <button class="load-older hidden" id="load-older" type="button" aria-label="Load older messages">Load older</button>
      <div class="messages" id="messages"></div>
      <div class="typing" id="typing">Typing…</div>
      <form class="input-bar" id="form">
        <div class="composer-field">
          <input id="input" type="text" placeholder="Type a message…" autocomplete="off" aria-label="Message" maxlength="4000" />
        </div>
        <button class="cancel-btn hidden" id="edit-cancel-btn" type="button" aria-label="Cancel editing">Cancel</button>
        <button class="send-btn" type="submit" aria-label="Send message">Send</button>
      </form>
    </section>
    <section class="screen">
      <div class="convo-header">
        <button class="back-btn" id="new-back-btn" aria-label="Back to chat list">←</button>
        <div class="convo-title">New Chat</div>
      </div>
      <div class="tabs">
        <button class="tab active" id="tab-dm" data-tab="dm" aria-label="Direct message">Direct</button>
        <button class="tab" id="tab-group" data-tab="group" aria-label="Group chat">Group</button>
      </div>
      <div class="tab-content" id="panel-dm">
        <input class="input-field" id="dm-search" type="text" placeholder="Search or type email…" aria-label="Search people" />
        <div class="user-list" id="dm-users"></div>
      </div>
      <div class="tab-content hidden" id="panel-group">
        <input class="input-field" id="group-search" type="text" placeholder="Search people…" aria-label="Search people" />
        <div class="chips" id="group-chips"></div>
        <input class="input-field" id="group-name" type="text" placeholder="Group name" aria-label="Group name" />
        <button class="primary-btn" id="group-create" aria-label="Create group">Create Group</button>
        <div class="user-list" id="group-users"></div>
      </div>
    </section>
  </div>
  <button class="new-chat-fab" id="new-btn" title="New chat" aria-label="New chat">＋</button>
  <div class="error-boundary hidden" id="error-boundary" role="alert">
    <div class="error-boundary-content">
      <p>Something went wrong.</p>
      <button class="primary-btn" id="error-reload" type="button">Reload Widget</button>
    </div>
  </div>
</div>
`;

globalThis.BT_CHAT_TEMPLATE = BT_CHAT_TEMPLATE;
