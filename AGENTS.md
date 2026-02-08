# Backtrack Intranet Extension — Agent Context & Best Practices

This repo contains:
- A Chrome Extension (Manifest V3) that redirects the New Tab page to the Backtrack intranet and injects a floating chat widget into intranet pages.
- A local Node/Express chat backend with SQLite persistence and WebSocket realtime updates (for dev/local testing).

The goal of this file is to help humans and agents make safe, production-minded changes while keeping local testing easy.

---

## Quick Architecture

**Extension**
- `manifest.json`: MV3 config (content scripts, permissions, OAuth client id).
- `background.js`: service worker for Google SSO (`chrome.identity`) + extension badge management.
- `newtab.html`, `newtab.js`: new tab redirect logic.
- `popup.html`, `popup.js`, `popup.css`: settings + SSO sign-in/out UI.
- Chat widget is injected by a content script bundle:
  - `contentScript.js`: bootstrap (reads settings, sets API URL, mounts widget if enabled).
  - `chat/*.js`: the actual widget implementation (state, storage, auth, API, rendering, operations, connection, widget DOM).

**Backend**
- `backend/server.js`: Express REST endpoints + WebSocket upgrade handler + SQLite schema.
- `backend/data/chat.db`: dev DB (should not be committed).
- `backend/.env`: local env vars (should not be committed).

---

## Local Development

### Run backend
From `backend/`:
- `npm install`
- `npm run dev`

Common env vars (in `backend/.env`):
- `PORT=8787`
- `GOOGLE_CLIENT_ID=...`
- `REQUIRE_AUTH=true` (recommended even in local dev)
- `ALLOWED_ORIGIN=*` (local dev only; lock down in prod)

### Load extension
1. Open `chrome://extensions`
2. Enable Developer mode
3. “Load unpacked” → select repo root
4. Open the intranet page under the match pattern and use the chat launcher.

### Configure extension for local testing
In the extension popup:
- Enable `Chat Widget`
- Set `Chat backend URL` (default `http://localhost:8787`)
- Sign in via Google SSO if backend auth is required.

---

## Security / Privacy Rules (Non‑Negotiable)

### Secrets
- Never commit OAuth client secrets or `.env` files.
- `client_secret.json` is local-only; treat it as sensitive even if ignored.
- If a secret is ever committed or shared, rotate it immediately in GCP.

### Tokens
- Do not put ID tokens in URLs (query params). Prefer headers or WebSocket subprotocols.
- Avoid storing long-lived tokens in `chrome.storage.sync` or page storage. If caching is needed, prefer ephemeral/session storage.

### Authorization
- Backend must enforce room access:
  - Public rooms may be auto-join (if intended).
  - Private rooms (DM/group) require explicit membership checks on every endpoint and WS connect.
- Never “create membership by requesting the room”.

### XSS
- Render message bodies with `textContent` (not `innerHTML`).
- Treat any message content as untrusted.

---

## Extension Best Practices

### Manifest/content script ordering
The chat widget depends on globals loaded in order. Keep the `manifest.json` content script list ordered so `chat/*.js` load before `contentScript.js`.

### Storage
- `chrome.storage.sync` has strict quotas; do not write per keystroke or per message.
- Debounce sync writes; flush on close/unload if needed.
- Use `chrome.storage.local` for high-churn queues (offline pending messages).

### Network / reliability
- WebSocket lifecycle should be room-bound:
  - Messages received on a socket must be attributed to the room the socket was opened for.
  - Intentional closes (panel close/navigation) should not trigger reconnect loops.
- Handle offline gracefully: queue, retry, and clearly communicate state.

### UX/accessibility
- If the panel is a dialog, trap focus while open and support Escape to close.
- Provide clear signed-in/out state in the widget, not just in the popup.

---

## Backend Best Practices

### Data integrity
- Support idempotent sends with a `(room_id, client_message_id)` unique constraint.
- Validate inputs: message size, empty body, member lists, etc.

### Retention
- If retention is enabled, apply it consistently (not only “on send”).

### CORS/Origins
- `ALLOWED_ORIGIN=*` is for local dev only.
- For production, set an explicit origin list and run behind HTTPS.

---

## Coding Conventions (Project)

### JavaScript style
- Prefer small, purpose-built functions; keep modules cohesive.
- Avoid introducing new dependencies in the extension unless necessary.
- Keep UI DOM updates localized to render modules; avoid mixing networking + DOM where possible.

### Error handling
- Surface actionable errors to the user (“Sign in required”, “Forbidden”, “Backend unreachable”) rather than generic failures.
- Log unexpected errors with enough context to debug, but never log tokens.

---

## Common Changes Checklist

When changing chat behavior, verify:
- Widget still mounts only when `chatEnabled` is true.
- API URL setting works and does not require code edits.
- WS connection authenticates without leaking tokens.
- Private rooms cannot be accessed by guessing IDs.
- Unread badges update for both launcher badge and extension action badge.
- Storage writes remain debounced (no per-message sync writes).

