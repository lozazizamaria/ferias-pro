/* ===== Férias Pro — Servidor Completo (Auth, Multi-Viagens, Compartilhamento, Anexos) ===== */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = parseInt(process.env.PORT || "3080", 10);
const HOST = process.env.HOST || "127.0.0.1";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, "db.json");
const LEGACY_STATE_FILE = process.env.DATA_FILE || path.join(DATA_DIR, "state.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(__dirname, "..", "app");
const SERVE_STATIC = process.env.SERVE_STATIC !== "0";
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
const MAX_BODY_BYTES = 16 * 1024 * 1024; // 16 MB (suporta anexos até ~10 MB)
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 dias

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon"
};

const uid = (prefix = "") => prefix + crypto.randomBytes(8).toString("hex");

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function emptyDb() {
  return { users: {}, sessions: {}, trips: {}, shares: [], attachments: {} };
}

function loadDb() {
  ensureDirs();
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      return Object.assign(emptyDb(), parsed || {});
    }
  } catch {}
  return emptyDb();
}

let db = loadDb();

function saveDb() {
  ensureDirs();
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hex] = storedHash.split(":");
  const expected = Buffer.from(hex, "hex");
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || "";
  raw.split(";").forEach(part => {
    const idx = part.indexOf("=");
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  });
  return out;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  // Limpa sessões expiradas
  for (const [k, s] of Object.entries(db.sessions)) {
    if (!s || s.expiresAt < now) delete db.sessions[k];
  }
  db.sessions[token] = { userId, createdAt: now, expiresAt: now + SESSION_TTL_MS };
  saveDb();
  return token;
}

function setSessionCookie(req, res, token) {
  const isHttps = req.headers["x-forwarded-proto"] === "https" || process.env.FORCE_SECURE_COOKIE === "1";
  const parts = [
    `fp_sid=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ];
  if (isHttps) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "fp_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

function getAuthUser(req) {
  const cookies = parseCookies(req);
  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const sid = cookies.fp_sid || bearer;
  if (!sid) return null;
  const sess = db.sessions[sid];
  if (!sess || sess.expiresAt < Date.now()) {
    if (sess) { delete db.sessions[sid]; saveDb(); }
    return null;
  }
  const user = db.users[sess.userId];
  return user ? { user, sid } : null;
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar || "",
    hasGoogle: Boolean(u.googleSub)
  };
}

function linkSharesForUser(user) {
  let changed = false;
  db.shares.forEach(sh => {
    if (sh.targetEmail === user.email && sh.targetUserId !== user.id) {
      sh.targetUserId = user.id;
      changed = true;
    }
  });
  if (changed) saveDb();
}

function getLegacyMigrationData() {
  try {
    if (fs.existsSync(LEGACY_STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LEGACY_STATE_FILE, "utf8"));
      if (parsed && parsed.state && Array.isArray(parsed.state.activities)) {
        return { data: parsed.state, gmapsKey: parsed.gmapsKey || "" };
      }
    }
  } catch {}
  return null;
}

function getTripAccess(trip, user) {
  if (!trip || !user) return null;
  if (trip.ownerId === user.id) return "owner";
  const sh = db.shares.find(s => s.tripId === trip.id && s.status === "accepted" && (s.targetUserId === user.id || s.targetEmail === user.email));
  return sh ? (sh.role || "editor") : null;
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
    "Cache-Control": ext === ".png" || ext === ".svg" ? "public, max-age=86400" : "no-cache"
  });
  fs.createReadStream(resolved).pipe(res);
}

function safeFileName(name) {
  return String(name || "documento").replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "documento";
}

async function verifyGoogleIdToken(credential) {
  if (!GOOGLE_CLIENT_ID) throw new Error("GOOGLE_NOT_CONFIGURED");
  const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!resp.ok) throw new Error("GOOGLE_TOKEN_INVALID");
  const info = await resp.json();
  if (info.aud !== GOOGLE_CLIENT_ID) throw new Error("GOOGLE_AUD_MISMATCH");
  if (info.email_verified !== "true" && info.email_verified !== true) throw new Error("GOOGLE_EMAIL_UNVERIFIED");
  return info;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    /* ---------- HEALTH & CONFIG ---------- */
    if (pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        mode: "multi-user",
        googleClientId: GOOGLE_CLIENT_ID
      });
    }

    if (pathname === "/api/auth/config" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        googleClientId: GOOGLE_CLIENT_ID
      });
    }

    /* ---------- AUTH ---------- */
    if (pathname === "/api/auth/register" && req.method === "POST") {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
        return sendJson(res, 400, { ok: false, error: "Informe nome, e-mail válido e senha com ao menos 6 caracteres." });
      }
      const exists = Object.values(db.users).find(u => u.email === email);
      if (exists) {
        return sendJson(res, 409, { ok: false, error: "Este e-mail já está cadastrado." });
      }
      const userId = uid("u_");
      db.users[userId] = {
        id: userId,
        name,
        email,
        passwordHash: hashPassword(password),
        createdAt: Date.now()
      };
      linkSharesForUser(db.users[userId]);
      const token = createSession(userId);
      setSessionCookie(req, res, token);
      return sendJson(res, 201, {
        ok: true,
        user: publicUser(db.users[userId]),
        legacyData: Object.keys(db.trips).length === 0 ? getLegacyMigrationData() : null
      });
    }

    if (pathname === "/api/auth/login" && req.method === "POST") {
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = Object.values(db.users).find(u => u.email === email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return sendJson(res, 401, { ok: false, error: "E-mail ou senha inválidos." });
      }
      linkSharesForUser(user);
      const token = createSession(user.id);
      setSessionCookie(req, res, token);
      return sendJson(res, 200, { ok: true, user: publicUser(user) });
    }

    if (pathname === "/api/auth/google" && req.method === "POST") {
      const body = await readBody(req);
      if (!body.credential) return sendJson(res, 400, { ok: false, error: "Token do Google ausente." });
      let info;
      try {
        info = await verifyGoogleIdToken(body.credential);
      } catch (err) {
        return sendJson(res, 401, { ok: false, error: "Falha ao validar login Google: " + err.message });
      }
      const email = String(info.email || "").trim().toLowerCase();
      let user = Object.values(db.users).find(u => u.email === email || u.googleSub === info.sub);
      const isFirstUser = Object.keys(db.users).length === 0;
      if (!user) {
        const userId = uid("u_");
        user = {
          id: userId,
          name: info.name || email.split("@")[0],
          email,
          googleSub: info.sub,
          avatar: info.picture || "",
          createdAt: Date.now()
        };
        db.users[userId] = user;
      } else {
        user.googleSub = info.sub;
        if (!user.avatar && info.picture) user.avatar = info.picture;
      }
      saveDb();
      linkSharesForUser(user);
      const token = createSession(user.id);
      setSessionCookie(req, res, token);
      return sendJson(res, 200, {
        ok: true,
        user: publicUser(user),
        legacyData: isFirstUser && Object.keys(db.trips).length === 0 ? getLegacyMigrationData() : null
      });
    }

    if (pathname === "/api/auth/logout" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (auth) {
        delete db.sessions[auth.sid];
        saveDb();
      }
      clearSessionCookie(res);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/auth/me" && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      return sendJson(res, 200, { ok: true, user: publicUser(auth.user) });
    }

    /* ---------- TRIPS ---------- */
    if (pathname === "/api/trips" && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const user = auth.user;

      const ownTrips = Object.values(db.trips)
        .filter(t => t.ownerId === user.id)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        .map(t => ({
          id: t.id,
          name: t.name,
          role: "owner",
          ownerName: user.name,
          ownerEmail: user.email,
          updatedAt: t.updatedAt || 0,
          revision: t.revision || 1,
          count: Array.isArray(t.data?.activities) ? t.data.activities.length : 0
        }));

      const acceptedShares = db.shares.filter(
        s => s.status === "accepted" && (s.targetUserId === user.id || s.targetEmail === user.email)
      );
      const sharedTrips = acceptedShares
        .map(s => {
          const t = db.trips[s.tripId];
          if (!t) return null;
          const owner = db.users[t.ownerId];
          return {
            id: t.id,
            name: t.name,
            role: s.role || "editor",
            shareId: s.id,
            ownerName: owner ? owner.name : "Usuário",
            ownerEmail: owner ? owner.email : "",
            updatedAt: t.updatedAt || 0,
            revision: t.revision || 1,
            count: Array.isArray(t.data?.activities) ? t.data.activities.length : 0
          };
        })
        .filter(Boolean);

      const pendingShares = db.shares
        .filter(s => s.status === "pending" && (s.targetUserId === user.id || s.targetEmail === user.email))
        .map(s => {
          const t = db.trips[s.tripId];
          const owner = db.users[s.ownerId];
          if (!t) return null;
          return {
            id: s.id,
            tripId: t.id,
            tripName: t.name,
            role: s.role || "editor",
            ownerName: owner ? owner.name : "Usuário",
            ownerEmail: owner ? owner.email : "",
            createdAt: s.createdAt
          };
        })
        .filter(Boolean);

      return sendJson(res, 200, { ok: true, ownTrips, sharedTrips, pendingShares });
    }

    if (pathname === "/api/trips" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const body = await readBody(req);
      const name = String(body.name || "").trim() || "Nova Viagem";
      if (!body.data || !Array.isArray(body.data.activities)) {
        return sendJson(res, 400, { ok: false, error: "Dados da viagem inválidos." });
      }
      const tripId = uid("t_");
      const now = Date.now();
      db.trips[tripId] = {
        id: tripId,
        name,
        ownerId: auth.user.id,
        createdAt: now,
        updatedAt: now,
        revision: 1,
        gmapsKey: typeof body.gmapsKey === "string" ? body.gmapsKey : "",
        data: body.data
      };
      saveDb();
      return sendJson(res, 201, { ok: true, trip: db.trips[tripId] });
    }

    const tripMatch = pathname.match(/^\/api\/trips\/([a-zA-Z0-9_]+)$/);
    if (tripMatch) {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const trip = db.trips[tripMatch[1]];
      if (!trip) return sendJson(res, 404, { ok: false, error: "Viagem não encontrada." });
      const access = getTripAccess(trip, auth.user);
      if (!access) return sendJson(res, 403, { ok: false, error: "Sem permissão nesta viagem." });

      if (req.method === "GET") {
        const owner = db.users[trip.ownerId];
        const shares = db.shares
          .filter(s => s.tripId === trip.id)
          .map(s => ({
            id: s.id,
            targetEmail: s.targetEmail,
            role: s.role,
            status: s.status,
            createdAt: s.createdAt
          }));
        return sendJson(res, 200, {
          ok: true,
          trip: {
            id: trip.id,
            name: trip.name,
            ownerId: trip.ownerId,
            ownerName: owner ? owner.name : "",
            role: access,
            updatedAt: trip.updatedAt || 0,
            revision: trip.revision || 1,
            gmapsKey: trip.gmapsKey || "",
            data: trip.data
          },
          shares
        });
      }

      if (req.method === "PUT") {
        if (access !== "owner" && access !== "editor") {
          return sendJson(res, 403, { ok: false, error: "Permissão somente leitura." });
        }
        const body = await readBody(req);
        if (body.name !== undefined) trip.name = String(body.name || "").trim() || trip.name;
        if (body.data && Array.isArray(body.data.activities)) trip.data = body.data;
        if (typeof body.gmapsKey === "string") trip.gmapsKey = body.gmapsKey;
        trip.revision = (trip.revision || 1) + 1;
        trip.updatedAt = Math.max(Date.now(), Number(body.updatedAt) || 0);
        saveDb();
        return sendJson(res, 200, { ok: true, revision: trip.revision, updatedAt: trip.updatedAt });
      }

      if (req.method === "DELETE") {
        if (access !== "owner") {
          return sendJson(res, 403, { ok: false, error: "Apenas o criador pode excluir a viagem." });
        }
        // Remove anexos e compartilhamentos
        for (const [attId, att] of Object.entries(db.attachments)) {
          if (att.tripId === trip.id) {
            try { fs.unlinkSync(path.join(UPLOADS_DIR, attId)); } catch {}
            delete db.attachments[attId];
          }
        }
        db.shares = db.shares.filter(s => s.tripId !== trip.id);
        delete db.trips[trip.id];
        saveDb();
        return sendJson(res, 200, { ok: true });
      }
    }

    /* ---------- COMPARTILHAMENTO ---------- */
    const shareCreateMatch = pathname.match(/^\/api\/trips\/([a-zA-Z0-9_]+)\/share$/);
    if (shareCreateMatch && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const trip = db.trips[shareCreateMatch[1]];
      if (!trip) return sendJson(res, 404, { ok: false, error: "Viagem não encontrada." });
      if (trip.ownerId !== auth.user.id) {
        return sendJson(res, 403, { ok: false, error: "Apenas o dono da viagem pode compartilhar." });
      }
      const body = await readBody(req);
      const targetEmail = String(body.email || "").trim().toLowerCase();
      const role = body.role === "viewer" ? "viewer" : "editor";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
        return sendJson(res, 400, { ok: false, error: "E-mail inválido." });
      }
      if (targetEmail === auth.user.email) {
        return sendJson(res, 400, { ok: false, error: "Você já é o dono desta viagem." });
      }
      const existing = db.shares.find(s => s.tripId === trip.id && s.targetEmail === targetEmail);
      const recipient = Object.values(db.users).find(u => u.email === targetEmail);
      if (existing) {
        existing.role = role;
        if (existing.status === "declined") existing.status = "pending";
        if (recipient) existing.targetUserId = recipient.id;
        saveDb();
        return sendJson(res, 200, { ok: true, share: existing });
      }
      const share = {
        id: uid("sh_"),
        tripId: trip.id,
        ownerId: auth.user.id,
        targetEmail,
        targetUserId: recipient ? recipient.id : null,
        role,
        status: "pending",
        createdAt: Date.now(),
        respondedAt: null
      };
      db.shares.push(share);
      saveDb();
      return sendJson(res, 201, { ok: true, share });
    }

    const shareDeleteMatch = pathname.match(/^\/api\/trips\/([a-zA-Z0-9_]+)\/shares\/([a-zA-Z0-9_]+)$/);
    if (shareDeleteMatch && req.method === "DELETE") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const trip = db.trips[shareDeleteMatch[1]];
      if (!trip) return sendJson(res, 404, { ok: false, error: "Viagem não encontrada." });
      const idx = db.shares.findIndex(s => s.id === shareDeleteMatch[2] && s.tripId === trip.id);
      if (idx === -1) return sendJson(res, 404, { ok: false, error: "Compartilhamento não encontrado." });
      const sh = db.shares[idx];
      if (trip.ownerId !== auth.user.id && sh.targetEmail !== auth.user.email) {
        return sendJson(res, 403, { ok: false, error: "Sem permissão." });
      }
      db.shares.splice(idx, 1);
      saveDb();
      return sendJson(res, 200, { ok: true });
    }

    const shareRespondMatch = pathname.match(/^\/api\/shares\/([a-zA-Z0-9_]+)\/respond$/);
    if (shareRespondMatch && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const sh = db.shares.find(s => s.id === shareRespondMatch[1]);
      if (!sh) return sendJson(res, 404, { ok: false, error: "Convite não encontrado." });
      if (sh.targetEmail !== auth.user.email && sh.targetUserId !== auth.user.id) {
        return sendJson(res, 403, { ok: false, error: "Este convite não pertence à sua conta." });
      }
      const body = await readBody(req);
      sh.status = body.action === "accept" ? "accepted" : "declined";
      sh.targetUserId = auth.user.id;
      sh.respondedAt = Date.now();
      saveDb();
      return sendJson(res, 200, { ok: true, share: sh });
    }

    /* ---------- DOCUMENTOS / ANEXOS ---------- */
    const attUploadMatch = pathname.match(/^\/api\/trips\/([a-zA-Z0-9_]+)\/attachments$/);
    if (attUploadMatch && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const trip = db.trips[attUploadMatch[1]];
      if (!trip) return sendJson(res, 404, { ok: false, error: "Viagem não encontrada." });
      const access = getTripAccess(trip, auth.user);
      if (access !== "owner" && access !== "editor") {
        return sendJson(res, 403, { ok: false, error: "Sem permissão para anexar arquivos." });
      }
      const body = await readBody(req);
      const rawB64 = String(body.base64Data || "").replace(/^data:[^;]+;base64,/, "");
      if (!rawB64) return sendJson(res, 400, { ok: false, error: "Arquivo vazio." });
      const buf = Buffer.from(rawB64, "base64");
      if (buf.length > 10 * 1024 * 1024) {
        return sendJson(res, 413, { ok: false, error: "Arquivo excede o limite de 10 MB." });
      }
      const attId = uid("att_");
      const fileName = safeFileName(body.fileName);
      const mimeType = String(body.mimeType || "application/octet-stream").slice(0, 100);
      fs.writeFileSync(path.join(UPLOADS_DIR, attId), buf);
      const meta = {
        id: attId,
        tripId: trip.id,
        activityId: String(body.activityId || ""),
        fileName,
        mimeType,
        size: buf.length,
        uploadedBy: auth.user.name,
        uploadedAt: Date.now()
      };
      db.attachments[attId] = meta;
      saveDb();
      return sendJson(res, 201, { ok: true, attachment: meta });
    }

    const attItemMatch = pathname.match(/^\/api\/attachments\/([a-zA-Z0-9_]+)$/);
    if (attItemMatch) {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const att = db.attachments[attItemMatch[1]];
      if (!att) return sendJson(res, 404, { ok: false, error: "Anexo não encontrado." });
      const trip = db.trips[att.tripId];
      const access = getTripAccess(trip, auth.user);
      if (!access) return sendJson(res, 403, { ok: false, error: "Sem permissão." });

      if (req.method === "GET") {
        const filePath = path.resolve(UPLOADS_DIR, att.id);
        if (!filePath.startsWith(path.resolve(UPLOADS_DIR)) || !fs.existsSync(filePath)) {
          return sendJson(res, 404, { ok: false, error: "Arquivo ausente no disco." });
        }
        res.writeHead(200, {
          "Content-Type": att.mimeType || "application/octet-stream",
          "Content-Disposition": `inline; filename="${att.fileName}"`,
          "Content-Length": att.size,
          "X-Content-Type-Options": "nosniff"
        });
        return fs.createReadStream(filePath).pipe(res);
      }

      if (req.method === "DELETE") {
        if (access !== "owner" && access !== "editor") {
          return sendJson(res, 403, { ok: false, error: "Sem permissão para excluir." });
        }
        try { fs.unlinkSync(path.join(UPLOADS_DIR, att.id)); } catch {}
        delete db.attachments[att.id];
        saveDb();
        return sendJson(res, 200, { ok: true });
      }
    }

    if (SERVE_STATIC && req.method === "GET") {
      return serveStaticFile(pathname, res);
    }

    res.writeHead(404);
    res.end("Not Found");
  } catch (err) {
    console.error("Erro API:", err);
    sendJson(res, 500, { ok: false, error: "Erro interno no servidor." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Férias Pro Server ativo em http://${HOST}:${PORT}`);
  console.log(`DB: ${DB_FILE} | Google OAuth: ${GOOGLE_CLIENT_ID ? "Ativo" : "Não configurado"}`);
});
