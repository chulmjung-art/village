#!/usr/bin/env node
// My AI Village: local server for the director's Mac.
// Serves the village at http://localhost:4747 and answers the page's requests:
//   /api/sample  -> Claude Code on this Mac (`claude -p`), signed in to the director's own subscription.
//                   Agents get NO tools, NO connectors and a tiny system prompt: they only write text.
//   /api/db      -> local JSON file (local/data/db.json): map edits, hires, agents' learned notes
//   /api/ollama  -> Ollama on this Mac (free local model) for villager small talk
// No API keys anywhere. Only listens on this computer (127.0.0.1), never on the network.
// No outside packages: plain Node (18 or newer).
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const crypto = require("crypto");

const PORT = Number(process.env.VILLAGE_PORT || 4747);
const ROOT = path.resolve(__dirname, "..", "ai-village");          // the village files
const DATA = path.resolve(__dirname, "data");                      // local saves
const SANDBOX = path.resolve(__dirname, "sandbox");                // empty folder Claude Code runs in
const DB_FILE = path.join(DATA, "db.json");
const CLAUDE = process.env.CLAUDE_BIN || "claude";
const OLLAMA = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const ALLOWED_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);   // never Fable
const TIER_MODEL = { complex: "claude-opus-5-5", default: "claude-sonnet-5-5", quick: "claude-sonnet-5-5" };
const MAX_CONCURRENT = 2;

fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(SANDBOX, { recursive: true });

// ---------- local database ----------
let db = {};
try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch (e) { db = {}; }
let saveTimer = null;
const saveDb = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => {
  fs.writeFileSync(DB_FILE + ".tmp", JSON.stringify(db, null, 1)); fs.renameSync(DB_FILE + ".tmp", DB_FILE); }, 200); };
const okPath = (c) => typeof c === "string" && /^[A-Za-z0-9_\-.~:@+]+(\/[A-Za-z0-9_\-.~:@+]+)*$/.test(c) && c.length < 400;
function dbOp(b) {
  if (!okPath(b.c)) throw { status: 400, code: "bad_request", message: "bad collection" };
  const col = (db[b.c] ||= {});
  switch (b.op) {
    case "list": return { docs: Object.entries(col).map(([id, data]) => ({ id, data })) };
    case "get": return { data: col[b.id] || null };
    case "add": { const id = crypto.randomBytes(8).toString("hex"); col[id] = b.data || {}; saveDb(); return { id }; }
    case "set": col[String(b.id)] = b.data || {}; saveDb(); return { ok: true };
    case "update": col[String(b.id)] = Object.assign(col[String(b.id)] || {}, b.data || {}); saveDb(); return { ok: true };
    case "delete": delete col[String(b.id)]; saveDb(); return { ok: true };
    default: throw { status: 400, code: "bad_request", message: "bad op" };
  }
}

// ---------- Claude Code: words only ----------
const SYSTEM = "You voice characters in a cozy Joseon-era village game. Follow the instructions in the message exactly and reply only with what is asked. You have no tools.";
function flatten(input) {
  if (typeof input === "string") return input;
  if (!Array.isArray(input)) return "";
  const turns = input.filter((t) => t && typeof t.content === "string");
  if (turns.length === 1) return turns[0].content;
  const [first, ...rest] = turns;
  return first.content + "\n\n--- Conversation so far (oldest first) ---\n" +
    rest.map((t) => (t.role === "assistant" ? "You: " : "Them: ") + t.content).join("\n\n") +
    "\n--- End ---\nReply to their last message, as yourself.";
}
let running = 0; const waiting = [];
function slot() { return new Promise((res) => { if (running < MAX_CONCURRENT) { running++; res(); } else waiting.push(res); }); }
function release() { const n = waiting.shift(); if (n) n(); else running--; }
async function askClaude(input, model, tier) {
  const m = ALLOWED_MODELS.has(model) ? model : (TIER_MODEL[tier] || TIER_MODEL.default);
  const prompt = flatten(input);
  if (!prompt || prompt.length > 262144) throw { status: 400, code: "prompt_too_large", message: "empty or too large" };
  await slot();
  try {
    return await new Promise((res, rej) => {
      const args = ["-p", "--model", m, "--tools", "", "--strict-mcp-config", "--no-session-persistence",
        "--system-prompt", SYSTEM, "--output-format", "text"];
      const p = spawn(CLAUDE, args, { cwd: SANDBOX, env: Object.assign({}, process.env, { ANTHROPIC_API_KEY: "" }) });   // subscription login only, never a key
      let out = "", err = "";
      const timer = setTimeout(() => { p.kill("SIGTERM"); rej({ status: 504, code: "upstream_error", message: "Claude took too long" }); }, 300000);
      p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
      p.on("error", (e) => { clearTimeout(timer); rej({ status: 500, code: "upstream_error", message: "Couldn't start Claude Code: " + e.message }); });
      p.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) return res(out.trim());
        const limited = /limit|rate/i.test(err);
        rej({ status: limited ? 429 : 500, code: limited ? "rate_limited" : "upstream_error", message: err.trim().slice(0, 300) || "Claude Code exited " + code });
      });
      p.stdin.end(prompt);
    });
  } finally { release(); }
}

// ---------- Ollama: free small talk ----------
async function askOllama(model, messages) {
  if (model !== "qwen2.5:3b") throw { status: 400, code: "not_in_manifest", message: "only qwen2.5:3b is allowed" };
  const r = await fetch(OLLAMA + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: (messages || []).slice(-8), stream: false }) });
  if (!r.ok) throw { status: 502, code: "upstream_error", message: "Ollama didn't answer" };
  const j = await r.json();
  return (j.message && j.message.content) || "";
}

// ---------- files ----------
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".css": "text/css; charset=utf-8" };
function serveFile(req, res) {
  let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (rel === "/") rel = "/index.html";
  const file = path.resolve(ROOT, "." + rel);
  if (!file.startsWith(ROOT + path.sep) || /\/\./.test(rel)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, buf) => {
    if (e) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(buf);
  });
}

// ---------- server ----------
function readBody(req) { return new Promise((res, rej) => { let b = ""; req.on("data", (d) => { b += d; if (b.length > 2e6) req.destroy(); }); req.on("end", () => { try { res(JSON.parse(b || "{}")); } catch (e) { rej({ status: 400, code: "bad_request", message: "bad JSON" }); } }); }); }
const send = (res, status, obj) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
http.createServer(async (req, res) => {
  try {
    // only pages served from this same local server may use the API
    if (req.method === "POST") {
      const origin = req.headers.origin || "";
      if (origin && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return send(res, 403, { code: "forbidden" });
      const b = await readBody(req);
      if (req.url === "/api/db") return send(res, 200, dbOp(b));
      if (req.url === "/api/sample") return send(res, 200, { text: await askClaude(b.input, b.model, b.tier) });
      if (req.url === "/api/ollama") return send(res, 200, { text: await askOllama(b.model, b.messages) });
      return send(res, 404, { code: "not_found" });
    }
    if (req.method === "GET") return serveFile(req, res);
    res.writeHead(405); res.end();
  } catch (e) { send(res, e.status || 500, { code: e.code || "upstream_error", message: e.message || String(e) }); }
}).listen(PORT, "127.0.0.1", () => console.log(`My AI Village is running: http://localhost:${PORT}`));
