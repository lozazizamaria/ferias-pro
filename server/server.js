/* ===== Férias Pro — Servidor leve de sincronização (sem dependências externas) ===== */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = parseInt(process.env.PORT || "3080", 10);
const HOST = process.env.HOST || "127.0.0.1";
const SYNC_TOKEN = (process.env.SYNC_TOKEN || "").trim();
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data", "state.json");
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(__dirname, "..", "app");
const SERVE_STATIC = process.env.SERVE_STATIC !== "0";
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readStored() {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStoredAtomic(payload) {
  ensureDirFor(DATA_FILE);
  const tmp = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tmp, DATA_FILE);
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ""), "utf8");
  const bufB = Buffer.from(String(b || ""), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isAuthorized(req) {
  if (!SYNC_TOKEN) return true;
  const headerToken = req.headers["x-sync-token"];
  return safeEqual(headerToken, SYNC_TOKEN);
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("PAYLOAD_TOO_LARGE"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const txt = Buffer.concat(chunks).toString("utf8");
        resolve(txt ? JSON.parse(txt) : {});
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });
    req.on("error", reject);
  });
}

function serveStaticFile(reqPath, res) {
  const cleanPath = reqPath === "/" ? "/index.html" : reqPath;
  const resolved = path.resolve(STATIC_DIR, "." + cleanPath);
  if (!resolved.startsWith(path.resolve(STATIC_DIR))) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    res.writeHead(404);
    return res.end("Not Found");
  }
  const ext = path.extname(resolved).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-cache"
  });
  fs.createReadStream(resolved).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (pathname === "/api/health" && req.method === "GET") {
    const stored = readStored();
    return sendJson(res, 200, {
      ok: true,
      requiresAuth: Boolean(SYNC_TOKEN),
      hasData: Boolean(stored && stored.state),
      updatedAt: stored?.updatedAt || 0,
      revision: stored?.revision || 0
    });
  }

  if (pathname === "/api/state") {
    if (!isAuthorized(req)) {
      return sendJson(res, 401, { ok: false, error: "PIN/Token inválido ou ausente." });
    }

    if (req.method === "GET") {
      const stored = readStored();
      if (!stored || !stored.state) {
        return sendJson(res, 200, { ok: true, empty: true, revision: 0, updatedAt: 0 });
      }
      return sendJson(res, 200, {
        ok: true,
        empty: false,
        revision: stored.revision || 1,
        updatedAt: stored.updatedAt || Date.now(),
        state: stored.state,
        gmapsKey: stored.gmapsKey || ""
      });
    }

    if (req.method === "PUT") {
      try {
        const body = await readBody(req);
        if (!body || !body.state || !Array.isArray(body.state.activities)) {
          return sendJson(res, 400, { ok: false, error: "Payload inválido." });
        }
        const current = readStored();
        const nextRevision = (current?.revision || 0) + 1;
        const updatedAt = Math.max(Date.now(), Number(body.updatedAt) || 0);
        const record = {
          revision: nextRevision,
          updatedAt,
          state: body.state,
          gmapsKey: typeof body.gmapsKey === "string" ? body.gmapsKey : (current?.gmapsKey || "")
        };
        writeStoredAtomic(record);
        return sendJson(res, 200, {
          ok: true,
          revision: nextRevision,
          updatedAt
        });
      } catch (err) {
        const status = err.message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
        return sendJson(res, status, { ok: false, error: err.message });
      }
    }

    return sendJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  if (SERVE_STATIC && req.method === "GET") {
    return serveStaticFile(pathname, res);
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, HOST, () => {
  console.log(`Férias Pro Sync Server ativo em http://${HOST}:${PORT}`);
  console.log(`Arquivo de dados: ${DATA_FILE} | Auth PIN ativo: ${Boolean(SYNC_TOKEN)}`);
});
