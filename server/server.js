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
const ENV_GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "").trim();
const ENV_GMAPS_KEY = (process.env.GOOGLE_MAPS_API_KEY || "").trim();
const ENV_WALLET_ISSUER_ID = (process.env.GOOGLE_WALLET_ISSUER_ID || "").trim();
const ENV_WALLET_SA_JSON = (process.env.GOOGLE_WALLET_SA_JSON || "").trim();
const ENV_WALLET_SA_FILE = (process.env.GOOGLE_WALLET_SA_FILE || "").trim();
const MAX_BODY_BYTES = 32 * 1024 * 1024; // 32 MB (suporta áudios, imagens IA e anexos)
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

const VALID_BR_DDDS = new Set([
  "11","12","13","14","15","16","17","18","19",
  "21","22","24","27","28","31","32","33","34","35","37","38",
  "41","42","43","44","45","46","47","48","49","51","53","54","55",
  "61","62","63","64","65","66","67","68","69","71","73","74","75","77","79",
  "81","82","83","84","85","86","87","88","89","91","92","93","94","95","96","97","98","99"
]);

function validateServerWhatsApp(dial, rawNumber) {
  const cleanDial = String(dial || "+55").trim();
  const dialDigits = cleanDial.replace(/\D/g, "");
  let local = String(rawNumber || "").replace(/\D/g, "");
  if (!dialDigits) return { valid: false, error: "DDI do país inválido." };
  if (cleanDial === "+55") {
    if (local.startsWith("0") && local.length === 12) local = local.slice(1);
    if (local.startsWith("55") && local.length === 13) local = local.slice(2);
    if (local.length !== 11 || !VALID_BR_DDDS.has(local.slice(0, 2)) || local[2] !== "9" || /^(\d)\1{8}$/.test(local.slice(2))) {
      return { valid: false, error: "WhatsApp Brasil inválido. Use DDD (2 dígitos) + 9 + 8 dígitos: (DD) 9XXXX-XXXX." };
    }
    return {
      valid: true,
      dial: "+55",
      localDigits: local,
      full: `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`,
      e164Digits: `55${local}`
    };
  }
  if (local.length < 6 || local.length > 14) {
    return { valid: false, error: "Número internacional inválido (6 a 14 dígitos)." };
  }
  return { valid: true, dial: cleanDial, localDigits: local, full: `${cleanDial} ${local}`, e164Digits: `${dialDigits}${local}` };
}

function getEffectiveCredentials(user) {
  const integ = (user && user.integrations) || {};
  let saRaw = integ.walletSaJson || ENV_WALLET_SA_JSON;
  if (!saRaw && ENV_WALLET_SA_FILE && fs.existsSync(ENV_WALLET_SA_FILE)) {
    try { saRaw = fs.readFileSync(ENV_WALLET_SA_FILE, "utf8"); } catch {}
  }
  return {
    geminiKey: (integ.geminiKey || ENV_GEMINI_KEY || "").trim(),
    gmapsKey: (integ.gmapsKey || ENV_GMAPS_KEY || "").trim(),
    googleClientId: (integ.googleClientId || GOOGLE_CLIENT_ID || "").trim(),
    walletIssuerId: (integ.walletIssuerId || ENV_WALLET_ISSUER_ID || "").trim(),
    walletSaJson: (saRaw || "").trim()
  };
}

function maskKeyHint(k) {
  const s = String(k || "").trim();
  if (!s) return "";
  if (s.length <= 10) return "••••";
  return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

function publicUser(u) {
  const creds = getEffectiveCredentials(u);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar || "",
    hasGoogle: Boolean(u.googleSub),
    whatsappCountry: u.whatsappCountry || "+55",
    whatsappNumber: u.whatsappNumber || "",
    whatsappFull: u.whatsappFull || "",
    integrations: {
      hasGemini: Boolean(creds.geminiKey),
      geminiHint: maskKeyHint(creds.geminiKey),
      hasMaps: Boolean(creds.gmapsKey),
      gmapsKey: creds.gmapsKey || "",
      googleClientId: creds.googleClientId || "",
      hasWallet: Boolean(creds.walletIssuerId && creds.walletSaJson),
      walletIssuerId: creds.walletIssuerId || ""
    }
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

function addDaysISO(iso, delta) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function escapeIcsText(txt) {
  return String(txt || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildTripIcs(trip) {
  const data = trip.data || {};
  const tripName = trip.name || data.title || "Férias Pro";
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const remTime = data.params?.calendarReminderTime || "09:00";
  const [hh, mm] = String(remTime).split(":").map(x => String(parseInt(x, 10) || 0).padStart(2, "0"));
  const minsBefore = Math.max(60, 24 * 60 - ((parseInt(hh, 10) || 9) * 60 + (parseInt(mm, 10) || 0)));
  const seq = trip.revision || 1;
  const stamp = new Date(trip.updatedAt || Date.now()).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ferias Pro//VPS Feed//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText("Férias Pro — " + tripName)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H"
  ];

  activities.forEach(a => {
    if (!a || !a.start) return;
    const summary = (a.type === "Viagem" || a.type === "Voo") && (a.from || a.to)
      ? `${a.type === "Voo" ? "✈️ " : ""}${a.name} (${a.from || "?"} ➔ ${a.to || "?"})`
      : a.name;
    const descParts = [`Planejamento: ${tripName}`, `Tipo: ${a.type}`];
    if (a.from || a.to) descParts.push(`Trecho: ${a.from || "?"} ➔ ${a.to || "?"}`);
    if (a.km) descParts.push(`Distância: ${a.km} km`);
    if (a.toll) descParts.push(`Pedágio: R$ ${Number(a.toll).toFixed(2)}`);
    if (a.extraCost) descParts.push(`Custo: R$ ${Number(a.extraCost).toFixed(2)}`);
    if (a.notes) descParts.push(`Notas: ${a.notes}`);
    const desc = descParts.join("\n");

    const uidBase = `${trip.id}-${a.id || crypto.createHash("md5").update(summary + a.start).digest("hex").slice(0, 8)}`;
    const dtStart = a.start.replace(/-/g, "");
    const dtEnd = addDaysISO(a.end || a.start, 1).replace(/-/g, "");
    const prevDay = addDaysISO(a.start, -1).replace(/-/g, "");
    const endRemMin = Math.min(59, (parseInt(mm, 10) || 0) + 15);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uidBase}-main@feriaspro.app`,
      `SEQUENCE:${seq}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(desc)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText("Lembrete Férias Pro: " + summary)}`,
      `TRIGGER:-PT${minsBefore}M`,
      "END:VALARM",
      "END:VEVENT",
      "BEGIN:VEVENT",
      `UID:${uidBase}-rem@feriaspro.app`,
      `SEQUENCE:${seq}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${prevDay}T${hh}${mm}00`,
      `DTEND:${prevDay}T${hh}${String(endRemMin).padStart(2, "0")}00`,
      `SUMMARY:${escapeIcsText("🔔 Lembrete amanhã: " + summary)}`,
      `DESCRIPTION:${escapeIcsText(desc)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText("Amanhã: " + summary)}`,
      "TRIGGER:-PT0M",
      "END:VALARM",
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
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

async function callGeminiJSON(apiKey, parts, systemInstruction) {
  if (!apiKey) throw new Error("GEMINI_NOT_CONFIGURED");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2
    }
  };
  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(json?.error?.message || `Gemini API HTTP ${resp.status}`);
  }
  const rawTxt = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!rawTxt) throw new Error("Gemini não retornou resposta estruturada.");
  try {
    return JSON.parse(rawTxt);
  } catch {
    const cleaned = rawTxt.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  }
}

function base64Url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function buildGoogleWalletSaveUrl(issuerId, saJsonStr, activity, tripName, originHost) {
  let sa;
  try { sa = JSON.parse(saJsonStr); } catch { throw new Error("JSON da Service Account do Google Wallet inválido."); }
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Service Account precisa conter client_email e private_key.");
  }
  const suffix = crypto.createHash("md5").update(`${activity.id || activity.name}-${activity.start || ""}`).digest("hex").slice(0, 12);
  const classId = `${issuerId}.ferias_pro_pass_v1`;
  const objectId = `${issuerId}.fp_${suffix}`;
  const isFlight = activity.type === "Voo";
  const subParts = [activity.type || "Atividade"];
  if (activity.from || activity.to) subParts.push(`${activity.from || "?"} -> ${activity.to || "?"}`);
  if (activity.start) subParts.push(activity.end && activity.end !== activity.start ? `${activity.start} ate ${activity.end}` : activity.start);

  const genericObj = {
    id: objectId,
    classId,
    genericType: isFlight ? "GENERIC_TYPE_UNSPECIFIED" : "GENERIC_TYPE_UNSPECIFIED",
    hexBackgroundColor: "#4f46e5",
    cardTitle: { defaultValue: { language: "pt-BR", value: `Férias Pro · ${tripName || "Viagem"}` } },
    header: { defaultValue: { language: "pt-BR", value: activity.name || "Reserva" } },
    subheader: { defaultValue: { language: "pt-BR", value: subParts.join(" · ") } },
    barcode: {
      type: "QR_CODE",
      value: `FERIASPRO|${activity.id || suffix}|${activity.name || ""}|${activity.start || ""}`
    },
    textModulesData: [
      { id: "data", header: "Data", body: activity.end && activity.end !== activity.start ? `${activity.start} a ${activity.end}` : (activity.start || "-") },
      ...(activity.from || activity.to ? [{ id: "rota", header: "Trecho / Local", body: `${activity.from || ""} -> ${activity.to || ""}` }] : []),
      ...(activity.bookingRef ? [{ id: "reserva", header: "Localizador / Reserva", body: String(activity.bookingRef) }] : []),
      ...(activity.notes ? [{ id: "notas", header: "Notas", body: String(activity.notes).slice(0, 200) }] : [])
    ]
  };

  const claims = {
    iss: sa.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: originHost ? [originHost] : [],
    payload: {
      genericObjects: [genericObj]
    }
  };
  const headerB64 = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimB64 = base64Url(JSON.stringify(claims));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${headerB64}.${claimB64}`);
  const sig = signer.sign(sa.private_key);
  const jwt = `${headerB64}.${claimB64}.${base64Url(sig)}`;
  return `https://pay.google.com/gp/v/save/${jwt}`;
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
        googleClientId: GOOGLE_CLIENT_ID,
        hasGemini: Boolean(ENV_GEMINI_KEY),
        hasMaps: Boolean(ENV_GMAPS_KEY),
        hasWallet: Boolean(ENV_WALLET_ISSUER_ID && (ENV_WALLET_SA_JSON || ENV_WALLET_SA_FILE))
      });
    }

    if (pathname === "/api/auth/config" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        googleClientId: GOOGLE_CLIENT_ID,
        hasGemini: Boolean(ENV_GEMINI_KEY),
        hasMaps: Boolean(ENV_GMAPS_KEY),
        hasWallet: Boolean(ENV_WALLET_ISSUER_ID && (ENV_WALLET_SA_JSON || ENV_WALLET_SA_FILE))
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

    if (pathname === "/api/auth/profile" && req.method === "PUT") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const body = await readBody(req);
      const u = auth.user;
      if (typeof body.name === "string" && body.name.trim()) u.name = body.name.trim().slice(0, 80);
      if (body.whatsappCountry !== undefined || body.whatsappNumber !== undefined) {
        const dial = String(body.whatsappCountry || u.whatsappCountry || "+55").trim();
        const raw = String(body.whatsappNumber || "").trim();
        if (!raw) {
          u.whatsappCountry = dial;
          u.whatsappNumber = "";
          u.whatsappFull = "";
        } else {
          const v = validateServerWhatsApp(dial, raw);
          if (!v.valid) return sendJson(res, 400, { ok: false, error: v.error });
          u.whatsappCountry = v.dial;
          u.whatsappNumber = v.localDigits;
          u.whatsappFull = v.full;
        }
      }
      saveDb();
      return sendJson(res, 200, { ok: true, user: publicUser(u) });
    }

    if (pathname === "/api/integrations" && req.method === "PUT") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const body = await readBody(req);
      const u = auth.user;
      u.integrations = u.integrations || {};
      if (typeof body.geminiKey === "string") {
        if (body.clearGemini) u.integrations.geminiKey = "";
        else if (body.geminiKey.trim()) u.integrations.geminiKey = body.geminiKey.trim();
      }
      if (typeof body.gmapsKey === "string") {
        if (body.clearMaps) u.integrations.gmapsKey = "";
        else if (body.gmapsKey.trim()) u.integrations.gmapsKey = body.gmapsKey.trim();
      }
      if (typeof body.googleClientId === "string") {
        u.integrations.googleClientId = body.googleClientId.trim();
      }
      if (typeof body.walletIssuerId === "string") {
        u.integrations.walletIssuerId = body.walletIssuerId.trim();
      }
      if (typeof body.walletSaJson === "string") {
        if (body.clearWalletSa) u.integrations.walletSaJson = "";
        else if (body.walletSaJson.trim()) u.integrations.walletSaJson = body.walletSaJson.trim();
      }
      saveDb();
      return sendJson(res, 200, { ok: true, user: publicUser(u) });
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
        calToken: crypto.randomBytes(18).toString("hex"),
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
        if (!trip.calToken) {
          trip.calToken = crypto.randomBytes(18).toString("hex");
          saveDb();
        }
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
            calToken: trip.calToken,
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

    /* ---------- GEMINI AI (PLANEJAR COM ÁUDIO/IMAGENS + VEÍCULOS + ATIVIDADE) ---------- */
    if (pathname === "/api/ai/plan-trip" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      if (!creds.geminiKey) {
        return sendJson(res, 412, { ok: false, error: "GEMINI_NOT_CONFIGURED", message: "Configure sua Gemini API Key uma única vez na Central de Integrações." });
      }
      const body = await readBody(req);
      const todayIso = String(body.baseDate || new Date().toISOString().slice(0, 10));
      const parts = [{
        text: `Data de referência hoje: ${todayIso}. Instruções do usuário: ${String(body.prompt || "Analise os áudios e imagens anexos para criar um planejamento completo de férias.").trim()}`
      }];
      if (Array.isArray(body.media)) {
        body.media.slice(0, 10).forEach(m => {
          const b64 = String(m.dataBase64 || "").replace(/^data:[^;]+;base64,/, "").trim();
          if (b64) {
            parts.push({ inlineData: { mimeType: String(m.mimeType || "image/jpeg"), data: b64 } });
          }
        });
      }
      const sysPrompt = `Você é o planejador especialista do aplicativo Férias Pro.
Analise TODOS os áudios, imagens (passagens aéreas, ingressos, reservas de hotel, documento CRLV de carro) e textos enviados pelo usuário.
Retorne EXCLUSIVAMENTE um JSON válido com esta estrutura exata:
{
  "tripName": "Nome claro das férias (ex: Férias Europa Julho 2027)",
  "vehicle": {
    "name": "Modelo completo do carro se identificado ou padrão",
    "powertrain": "PHEV | HEV | COMBUSTION | BEV",
    "evRange": 0,
    "hevKmL": 14,
    "bevKwhPer100": 18,
    "tank": 55,
    "battery": 0,
    "kwhPerCharge": 0
  },
  "params": {
    "travelers": 2,
    "lodgingPerNight": 0,
    "dailyFoodPerPerson": 0
  },
  "activities": [
    {
      "type": "Viagem | Voo | Hospedagem | Ingresso | Evento | Passeio | Restaurante | Período | Outro",
      "name": "Nome curto da atividade",
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "from": "Cidade/Aeroporto origem (se Viagem ou Voo)",
      "to": "Cidade/Aeroporto destino (se Viagem ou Voo)",
      "km": 0,
      "drive": 0,
      "toll": 0,
      "extraCost": 0,
      "bookingRef": "Código localizador/voucher se houver",
      "notes": "Detalhes úteis (horários, voo, endereço, dicas)"
    }
  ],
  "checklist": [
    { "cat": "Categoria", "item": "Tarefa importante", "prio": "Alta | Média | Baixa", "notes": "" }
  ]
}
Regras: "drive" é em MINUTOS de direção (somente para type="Viagem"). Converta datas relativas usando ${todayIso} no formato YYYY-MM-DD. Se extrair passagens/ingressos/hotéis das imagens, preencha valores em extraCost, localizadores em bookingRef e todas as datas.`;

      try {
        const plan = await callGeminiJSON(creds.geminiKey, parts, sysPrompt);
        return sendJson(res, 200, { ok: true, plan });
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: err.message || "Falha ao consultar Gemini AI." });
      }
    }

    if (pathname === "/api/ai/vehicle-specs" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      if (!creds.geminiKey) {
        return sendJson(res, 412, { ok: false, error: "GEMINI_NOT_CONFIGURED", message: "Configure sua Gemini API Key para consultar modelos fora do catálogo local." });
      }
      const body = await readBody(req);
      const modelName = String(body.modelName || "").trim();
      if (!modelName) return sendJson(res, 400, { ok: false, error: "Informe o modelo do veículo." });
      try {
        const vehicle = await callGeminiJSON(
          creds.geminiKey,
          [{ text: `Retorne as especificações técnicas reais (padrão INMETRO/Brasil quando aplicável) para viagens rodoviárias do veículo: "${modelName}".` }],
          `Retorne JSON exato:
{
  "name": "Nome oficial formatado do veículo",
  "powertrain": "PHEV | HEV | COMBUSTION | BEV",
  "evRange": número em km de autonomia elétrica real (0 se não for BEV nem PHEV),
  "hevKmL": consumo rodoviário em km/L na gasolina (0 se 100% BEV),
  "bevKwhPer100": consumo elétrico em kWh/100km (ex: 17),
  "tank": litros do tanque de combustível (0 se BEV),
  "battery": kWh nominais da bateria (0 se combustão pura),
  "kwhPerCharge": kWh úteis por recarga ~80% da bateria (0 se não plug-in)
}`
        );
        return sendJson(res, 200, { ok: true, vehicle });
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: err.message || "Erro na consulta do veículo." });
      }
    }

    if (pathname === "/api/ai/analyze-activity" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      if (!creds.geminiKey) {
        return sendJson(res, 412, { ok: false, error: "GEMINI_NOT_CONFIGURED", message: "Configure sua Gemini API Key na Central de Integrações." });
      }
      const body = await readBody(req);
      const parts = [{ text: `Extraia dados de atividade/passagem/ingresso/reserva/viagem desta entrada: ${String(body.prompt || "").trim()}` }];
      if (Array.isArray(body.media)) {
        body.media.slice(0, 4).forEach(m => {
          const b64 = String(m.dataBase64 || "").replace(/^data:[^;]+;base64,/, "").trim();
          if (b64) parts.push({ inlineData: { mimeType: String(m.mimeType || "image/jpeg"), data: b64 } });
        });
      }
      try {
        const activity = await callGeminiJSON(
          creds.geminiKey,
          parts,
          `Retorne JSON com uma atividade do Férias Pro:
{
  "type": "Viagem | Voo | Hospedagem | Ingresso | Evento | Passeio | Restaurante | Período | Outro",
  "name": "Título curto",
  "start": "YYYY-MM-DD",
  "end": "YYYY-MM-DD",
  "from": "Origem se Viagem ou Voo",
  "to": "Destino se Viagem ou Voo",
  "extraCost": 0,
  "bookingRef": "Código localizador/ingresso",
  "notes": "Horário, companhia, local, poltrona ou detalhes úteis"
}`
        );
        return sendJson(res, 200, { ok: true, activity });
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: err.message || "Erro ao analisar atividade com IA." });
      }
    }

    /* ---------- GOOGLE WALLET PASS SIGNER ---------- */
    if (pathname === "/api/wallet/sign" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      if (!creds.walletIssuerId || !creds.walletSaJson) {
        return sendJson(res, 200, { ok: true, configured: false });
      }
      const body = await readBody(req);
      if (!body.activity) return sendJson(res, 400, { ok: false, error: "Dados da atividade ausentes." });
      try {
        const originHost = req.headers.origin || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
        const saveUrl = buildGoogleWalletSaveUrl(creds.walletIssuerId, creds.walletSaJson, body.activity, body.tripName || "Férias Pro", originHost);
        return sendJson(res, 200, { ok: true, configured: true, saveUrl });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message || "Falha ao assinar passe do Google Wallet." });
      }
    }

    /* ---------- CALENDAR FEED (.ics ASSINÁVEL) ---------- */
    const calTokenRotateMatch = pathname.match(/^\/api\/trips\/([a-zA-Z0-9_]+)\/cal-token$/);
    if (calTokenRotateMatch && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const trip = db.trips[calTokenRotateMatch[1]];
      if (!trip) return sendJson(res, 404, { ok: false, error: "Viagem não encontrada." });
      if (trip.ownerId !== auth.user.id) return sendJson(res, 403, { ok: false, error: "Sem permissão." });
      trip.calToken = crypto.randomBytes(18).toString("hex");
      saveDb();
      return sendJson(res, 200, { ok: true, calToken: trip.calToken });
    }

    const calFeedMatch = pathname.match(/^\/api\/calendar\/([a-f0-9]{16,64})\.ics$/i);
    if (calFeedMatch && req.method === "GET") {
      const token = calFeedMatch[1];
      const trip = Object.values(db.trips).find(t => t.calToken === token);
      if (!trip) {
        res.writeHead(404);
        return res.end("Calendar not found");
      }
      const ics = buildTripIcs(trip);
      res.writeHead(200, {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="ferias_pro_${trip.id}.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      return res.end(ics);
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
