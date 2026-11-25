// Local mode: when the village is opened from the local server on the director's Mac (not inside claude.ai),
// this stands in for claude.ai's page capabilities, so the same village code runs unchanged:
//   sample    -> the local server asks Claude Code on the Mac (the director's own subscription; agents get no tools)
//   db        -> JSON files on the Mac (local/data/db.json)
//   mcp       -> only host:ollama/ollama_chat, sent straight to Ollama on the Mac (free)
//   downloads -> an ordinary browser download
// Inside claude.ai, window.claude already exists and this file does nothing.
(function () {
  if (window.claude) return;
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  const post = (path, body) => fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw { code: j.code || "upstream_error", message: j.message || "local server error" }; return j; });

  // ---- sample: ask Claude (through Claude Code on this Mac) ----
  function sample(input, opts) {
    opts = opts || {};
    if (opts.tools) return Promise.reject({ code: "blocked_by_village_rules", message: "Agents can't be given tools." });
    if (opts.signal && opts.signal.aborted) return Promise.reject({ code: "cancelled", message: "cancelled" });
    const req = post("/api/sample", { input, model: opts.model || null, tier: opts.modelTier || "default" });
    const done = req.then((j) => { const text = String(j.text || "").trim(); if (!text) throw { code: "empty_completion", message: "no text" }; if (opts.onText) opts.onText({ text, delta: text }); return { text, truncated: false, modelTierApplied: opts.modelTier || "default", modelApplied: opts.model || undefined }; });
    if (!opts.signal) return done;
    return new Promise((res, rej) => { opts.signal.addEventListener("abort", () => rej({ code: "cancelled", message: "cancelled" }), { once: true }); done.then(res, rej); });
  }
  sample.json = async function (input, opts) {
    const { text } = await sample(input, Object.assign({}, opts, { onText: undefined }));
    const tryParse = (s) => { try { return JSON.parse(s); } catch (e) { return undefined; } };
    let v = tryParse(text);
    if (v === undefined) { const m = text.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) v = tryParse(m[1]); }
    if (v === undefined) { const a = text.search(/[\[{]/), b = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]")); if (a >= 0 && b > a) v = tryParse(text.slice(a, b + 1)); }
    if (v === undefined) throw { code: "invalid_json", message: "no JSON in reply", text };
    return v;
  };
  sample.limits = async () => ({ maxPromptBytes: 262144, modelTiers: ["default", "complex", "quick"] });

  // ---- db: JSON files on this Mac ----
  function collection(path) {
    let order = null, lim = 1000;
    const api = {
      orderBy(f) { order = f; return api; },
      limit(n) { lim = n; return api; },
      async get() {
        const j = await post("/api/db", { op: "list", c: path });
        let docs = j.docs || [];
        if (order) docs.sort((a, b) => (a.data[order] > b.data[order] ? 1 : -1));
        return { docs: docs.slice(0, lim).map((d) => ({ id: d.id, data: () => d.data })) };
      },
      async add(data) { const j = await post("/api/db", { op: "add", c: path, data }); return { id: j.id }; },
      doc(id) {
        return {
          async get() { const j = await post("/api/db", { op: "get", c: path, id }); return { id, exists: !!j.data, data: () => j.data || undefined }; },
          async set(data) { await post("/api/db", { op: "set", c: path, id, data }); },
          async update(data) { await post("/api/db", { op: "update", c: path, id, data }); },
          async delete() { await post("/api/db", { op: "delete", c: path, id }); },
        };
      },
    };
    return api;
  }
  const db = Object.freeze({ collection, doc: (p) => { const i = p.lastIndexOf("/"); return collection(p.slice(0, i)).doc(p.slice(i + 1)); } });

  // ---- mcp: only the free local model's chat ----
  const mcp = Object.freeze({
    async callTool(server, tool, input) {
      if (server !== "host:ollama" || tool !== "ollama_chat") throw { code: "not_in_manifest", message: "only ollama_chat is allowed" };
      const j = await post("/api/ollama", { model: input && input.model, messages: input && input.messages });
      return { content: [{ type: "text", text: j.text || "" }], payload: { message: { content: j.text || "" } } };
    },
    async listTools() { return { servers: [{ server: "host:ollama", tools: ["ollama_chat"] }] }; },
  });

  // ---- downloads: an ordinary browser download ----
  const downloads = Object.freeze({
    async save({ filename, data }) {
      const a = document.createElement("a"); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
      a.download = filename || "download"; document.body.append(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    },
  });

  const caps = { sample: Object.freeze(sample), db, mcp, downloads };
  window.claude = Object.freeze({ use: (name) => Promise.resolve(caps[name] || null), local: true });
})();
