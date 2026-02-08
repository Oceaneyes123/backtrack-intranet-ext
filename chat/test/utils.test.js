const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const utilsPath = path.resolve(__dirname, "..", "utils.js");
const code = fs.readFileSync(utilsPath, "utf8");

const context = {
  console,
  crypto: { randomUUID: () => "uuid" },
  atob: (str) => Buffer.from(str, "base64").toString("binary")
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(code, context);

const {
  sanitize,
  slugify,
  initials,
  getMessageKey,
  normalizeMessage,
  decodeJwt
} = context;

test("sanitize returns empty string for null", () => {
  assert.equal(sanitize(null), "");
});

test("slugify normalizes text", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
});

test("initials returns two-letter initials", () => {
  assert.equal(initials("Ada Lovelace"), "AL");
});

test("getMessageKey prioritizes client ids", () => {
  assert.equal(getMessageKey({ client_message_id: "c1", id: "1" }), "c1");
  assert.equal(getMessageKey({ clientMessageId: "c2", id: "2" }), "c2");
  assert.equal(getMessageKey({ id: "3" }), "3");
});

test("normalizeMessage maps backend fields", () => {
  const msg = normalizeMessage({
    id: 1,
    display_name: "Alice",
    email: "alice@example.com",
    body: "Hi",
    created_at: "2024-01-01T00:00:00.000Z",
    client_message_id: "c1"
  });
  assert.equal(msg.id, 1);
  assert.equal(msg.author, "Alice");
  assert.equal(msg.email, "alice@example.com");
  assert.equal(msg.body, "Hi");
  assert.equal(msg.created_at, "2024-01-01T00:00:00.000Z");
  assert.equal(msg.client_message_id, "c1");
});

test("decodeJwt parses base64 payload", () => {
  const payload = Buffer.from(JSON.stringify({ email: "test@example.com" })).toString("base64");
  const token = `x.${payload}.y`;
  const decoded = decodeJwt(token);
  assert.equal(decoded.email, "test@example.com");
});
