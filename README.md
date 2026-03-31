# Backtrack Intranet Extension

![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)
![Version](https://img.shields.io/badge/version-1.4.0-blue)

A Chrome extension that redirects the New Tab page to the Backtrack company intranet and injects a floating chat widget into intranet pages for real-time team communication.

---

## Features

- **New Tab redirect** — opens the Backtrack intranet instead of the default Chrome new-tab page
- **Floating chat widget** — Shadow DOM–isolated panel injected into intranet pages
- **Google SSO** — sign in with your Google Workspace account via `chrome.identity`
- **Real-time messaging** — WebSocket transport with SSE fallback
- **Direct messages & group chats** — create 1-on-1 or multi-person conversations
- **Read receipts & unread badges** — per-room unread counts shown on the launcher and extension icon
- **Offline message queuing** — messages are queued locally and sent when the connection is restored
- **Keyboard shortcuts** — Ctrl+K (toggle panel), Escape (close/back), Ctrl+N (new chat), Ctrl+F (search)
- **Error boundary** — automatic crash recovery with a reload button

---

## Project Structure

```
├── manifest.json          # MV3 config: permissions, content scripts, OAuth
├── background.js          # Service worker: OAuth2 flow, token cache, badge updates
├── newtab.html / .js      # New Tab override → redirect to intranet
├── popup.html / .js / .css# Extension popup: settings & sign-in/out UI
├── contentScript.js       # Widget bootstrap: reads settings, mounts widget
├── shared/
│   ├── settings.js        # Default settings (reroute, chat, API URL)
│   └── chrome.js          # chrome.storage helpers
├── chat/
│   ├── core.js            # Shared state & constants
│   ├── auth.js            # Token management inside the widget
│   ├── api.js             # REST API calls to the backend
│   ├── connection.js      # WebSocket + SSE connection lifecycle
│   ├── storage.js         # chrome.storage read/write with debounce
│   ├── render.js          # DOM rendering (messages, rooms, members)
│   ├── operations.js      # Business logic (send, create room, mark read)
│   ├── ui.styles.js       # Shadow DOM CSS
│   ├── ui.template.js     # Shadow DOM HTML template
│   ├── ui.panel.js        # Panel UI wiring, keyboard shortcuts, focus trap
│   ├── widget.js          # mount/unmount entry point, error boundary
│   ├── utils.js           # Helpers: sanitize, slugify, initials, JWT decode
│   └── test/
│       └── utils.test.js  # Unit tests for utility functions
└── backend/               # Chat backend (see backend/README.md)
```

---

## Getting Started

### Prerequisites

- Google Chrome (or any Chromium-based browser)
- A running chat backend (see [backend/README.md](backend/README.md))

### Load the extension

1. Navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this repository's root folder
4. The extension icon appears in the toolbar

### Configure

Click the extension icon to open the popup:
- **Make Intranet My New Tab** — toggle the new-tab redirect
- **Chat Widget** — enable/disable the floating chat panel
- **Sign In / Sign Out** — authenticate with your Google account

---

## Architecture

### Service Worker (`background.js`)

Handles the Google OAuth2 flow via `chrome.identity.launchWebAuthFlow()`. Caches ID tokens in `chrome.storage.session` (ephemeral, never persisted to disk). Broadcasts auth-state changes to content scripts via `chrome.storage.local`. Updates the extension badge with unread message counts.

### Content Scripts (`chat/*.js` + `contentScript.js`)

Loaded in a specific order defined in `manifest.json`. The widget files build globals that `contentScript.js` (loaded last) uses to bootstrap the chat panel inside a Shadow DOM root, isolating styles from the host page.

### Popup (`popup.html/js/css`)

Settings UI for toggling features. Reads and writes to `chrome.storage.sync`.

### Shared (`shared/`)

`settings.js` exports default values used by both the popup and content scripts. `chrome.js` provides chrome.storage helper wrappers.

---

## Configuration

All user-facing settings are managed through the popup UI and persisted in `chrome.storage.sync`:

| Setting | Storage Key | Default | Description |
|---------|-------------|---------|-------------|
| New Tab redirect | `rerouteEnabled` | `true` | Replace Chrome's new tab with the intranet |
| Chat Widget | `chatEnabled` | `true` | Show the floating chat widget on intranet pages |

The backend API URL is configured in [shared/settings.js](shared/settings.js) and defaults to the production endpoint.

---

## Security

- **Tokens** — ID tokens are sent via the `Authorization: Bearer` header or the `sec-websocket-protocol` subprotocol. They are never placed in URLs or query parameters. Tokens are cached only in ephemeral session storage.
- **XSS prevention** — all message content is rendered using `textContent`, never `innerHTML`. User input is treated as untrusted.
- **Shadow DOM isolation** — the widget's DOM and styles are encapsulated in a shadow root, preventing interference with and from the host page.
- **OAuth scopes** — the extension requests only `openid`, `email`, and `profile`.

---

## Development

### Modifying the widget

The chat widget is split across multiple files in `chat/`. The load order matters — `manifest.json` lists them so that shared modules are available before consumers. If you add a new file, insert it in the correct position in the `content_scripts` array.

### Storage quotas

`chrome.storage.sync` has a strict per-item and total quota. Writes are debounced and should never happen per keystroke or per message. High-churn data (e.g. pending message queue) uses `chrome.storage.local` instead.

### Reload during development

After editing extension files, go to `chrome://extensions` and click the reload button on the extension card. Content scripts require a page refresh on the target tab.

---

## Testing

Run the widget utility tests from the `backend/` directory (the test runner is configured there):

```bash
cd backend
npm test
```

This runs both backend tests (18) and chat widget tests (6) — **24 tests** total.

---

## Roadmap

Planned improvements and features:

- **Desktop notifications** — push notifications via `chrome.notifications` API for messages received while the panel is closed
- **Message edit & delete** — allow users to modify or remove sent messages
- **In-conversation search** — search messages within a room
- **File & image attachments** — upload and display files inline
- **Typing indicators** — show when other users are composing a message
- **Online status** — green/gray dots indicating user presence
- **Theme toggle** — light mode and custom theme support
- **Virtual scrolling** — efficient rendering for rooms with large message histories
- **CI/CD pipeline** — automated linting, testing, and packaging on push

---

## License

Internal use only — Backtrack.
