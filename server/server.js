/* ===== My Plan — Servidor Completo (Auth, Modos Pessoal/Profissional, Compartilhamento, Anexos) ===== */
const http = require("node:http");
const fs = require("node:fs");
const net = require("node:net");
const tls = require("node:tls");
const zlib = require("node:zlib");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");
const { buildDocxBuffer, buildPptxBuffer } = require("./ooxml");

function loadDotEnv() {
  if (process.env.SKIP_DOTENV === "1") return;
  for (const envPath of [path.join(__dirname, "..", ".env"), path.join(__dirname, ".env")]) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const raw = fs.readFileSync(envPath, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const k = trimmed.slice(0, eq).trim();
        let v = trimmed.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (k && process.env[k] === undefined) process.env[k] = v;
      }
    } catch {}
  }
}
loadDotEnv();

const DEFAULT_GOOGLE_CLIENT_ID = "1075987097030-j9htnv6l02rfdbt4spbjp84btj8bopqq.apps.googleusercontent.com";
const PORT = parseInt(process.env.PORT || "3080", 10);
const HOST = process.env.HOST || "127.0.0.1";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, "db.json");
const LEGACY_STATE_FILE = process.env.DATA_FILE || path.join(DATA_DIR, "state.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");
const MAIL_LOGS_DIR = path.join(DATA_DIR, "logs", "mail");
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(__dirname, "..", "app");
const SERVE_STATIC = process.env.SERVE_STATIC !== "0";
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim()
  || (process.env.DISABLE_DEFAULT_GOOGLE_CLIENT_ID === "1" ? "" : DEFAULT_GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
const GOOGLE_LOGIN_CLIENT_ID = (process.env.GOOGLE_LOGIN_CLIENT_ID || "").trim();
const SUPER_ADMIN_EMAILS = new Set([
  "adelphi86@gmail.com",
  ...String(process.env.SUPER_ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
]);
const ENV_GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "").trim();
const ENV_GEMINI_MODEL = (process.env.GEMINI_MODEL || "").trim().replace(/^models\//i, "");
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.0-flash", "gemini-2.5-flash-lite"];
const geminiDiscoveredModelCache = new Map();
const ENV_GMAPS_KEY = (process.env.GOOGLE_MAPS_API_KEY || "").trim();
const ENV_WALLET_ISSUER_ID = (process.env.GOOGLE_WALLET_ISSUER_ID || "").trim();
const ENV_WALLET_SA_JSON = (process.env.GOOGLE_WALLET_SA_JSON || "").trim();
const ENV_WALLET_SA_FILE = (process.env.GOOGLE_WALLET_SA_FILE || "").trim();
const ENV_WALLET_CLIENT_EMAIL = (process.env.GOOGLE_WALLET_CLIENT_EMAIL || "").trim();
const ENV_WALLET_PRIVATE_KEY = String(process.env.GOOGLE_WALLET_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
const SMTP_HOST = (process.env.SMTP_HOST || "").trim();
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = (process.env.SMTP_USER || "").trim();
const SMTP_PASS = String(process.env.SMTP_PASS || "");
const SMTP_FROM = (process.env.SMTP_FROM || SMTP_USER || "no-reply@myplan.app").trim();
const SMTP_SECURE = (process.env.SMTP_SECURE || "").trim().toLowerCase();
const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
const APP_BASE_URL = (process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
const MAX_BODY_BYTES = 32 * 1024 * 1024; // 32 MB (suporta áudios, imagens IA e anexos)
const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || "720", 10); // 30 dias padrão
const SESSION_TTL_MS = Math.max(1, SESSION_TTL_HOURS) * 3600 * 1000;
const PASS_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutos
const LOGIN_MAX_ATTEMPTS = Math.max(3, parseInt(process.env.LOGIN_MAX_ATTEMPTS || "8", 10) || 8);
const SIGNUP_MAX_ATTEMPTS = Math.max(5, parseInt(process.env.SIGNUP_MAX_ATTEMPTS || "20", 10) || 20);
const SCHEDULER_TICK_MS = Math.max(5000, parseInt(process.env.SCHEDULER_TICK_MS || "60000", 10) || 60000);
const BACKUP_INTERVAL_HOURS = Math.max(0, parseInt(process.env.BACKUP_INTERVAL_HOURS || "24", 10) || 0);
const BACKUP_RETENTION = Math.max(3, parseInt(process.env.BACKUP_RETENTION || "15", 10) || 15);
const MASK_PLACEHOLDER = "••••••••";

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
  ".pkpass": "application/vnd.apple.pkpass",
  ".ico": "image/x-icon"
};

const uid = (prefix = "") => prefix + crypto.randomBytes(8).toString("hex");

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  fs.mkdirSync(MAIL_LOGS_DIR, { recursive: true });
}

let cachedMasterKey = null;
function loadMasterKey() {
  if (cachedMasterKey) return cachedMasterKey;
  ensureDirs();
  const envKey = String(process.env.MASTER_KEY || "").trim();
  if (envKey.length >= 32) {
    cachedMasterKey = crypto.createHash("sha256").update(envKey, "utf8").digest();
    return cachedMasterKey;
  }
  const keyFile = path.join(DATA_DIR, ".master.key");
  try {
    if (fs.existsSync(keyFile)) {
      const hex = fs.readFileSync(keyFile, "utf8").trim();
      if (/^[a-f0-9]{64}$/i.test(hex)) {
        cachedMasterKey = Buffer.from(hex, "hex");
        return cachedMasterKey;
      }
    }
  } catch {}
  const fresh = crypto.randomBytes(32);
  fs.writeFileSync(keyFile, fresh.toString("hex"), { mode: 0o600 });
  cachedMasterKey = fresh;
  return cachedMasterKey;
}

function encryptSecret(plaintext) {
  const s = String(plaintext || "").trim();
  if (!s) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", loadMasterKey(), iv);
  const enc = Buffer.concat([cipher.update(s, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

function decryptSecret(payload) {
  if (!payload) return "";
  const raw = String(payload);
  if (!raw.startsWith("v1.")) return raw; // Fallback transparente para dados legados não cifrados
  const parts = raw.split(".");
  if (parts.length !== 4) return "";
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", loadMasterKey(), Buffer.from(parts[1], "base64url"));
    decipher.setAuthTag(Buffer.from(parts[2], "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(parts[3], "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

function isMaskedSecret(val) {
  const s = String(val || "").trim();
  return !s || s === MASK_PLACEHOLDER || /^[•*]{4,}$/.test(s);
}

function emptyDb() {
  return {
    users: {},
    sessions: {},
    trips: {},
    shares: [],
    attachments: {},
    passwordResets: {},
    admins: [],
    systemSettings: {},
    auditLogs: [],
    meta: {}
  };
}

function loadDb() {
  ensureDirs();
  loadMasterKey();
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      const merged = Object.assign(emptyDb(), parsed || {});
      if (!merged.passwordResets || typeof merged.passwordResets !== "object") merged.passwordResets = {};
      if (!Array.isArray(merged.admins)) merged.admins = [];
      if (!merged.systemSettings || typeof merged.systemSettings !== "object") merged.systemSettings = {};
      if (!Array.isArray(merged.auditLogs)) merged.auditLogs = [];
      if (!merged.meta || typeof merged.meta !== "object") merged.meta = {};
      return merged;
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

function validateStrongPassword(password) {
  const pw = String(password || "");
  const checks = {
    length: pw.length >= 8,
    upper: /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(pw),
    lower: /[a-záàâãéêíóôõúç]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-zÀ-ÿ0-9\s]/.test(pw)
  };
  const missing = [];
  if (!checks.length) missing.push("mínimo 8 caracteres");
  if (!checks.upper) missing.push("1 letra maiúscula");
  if (!checks.lower) missing.push("1 letra minúscula");
  if (!checks.number) missing.push("1 número");
  if (!checks.special) missing.push("1 caractere especial (ex: !@#$%)");
  return {
    valid: missing.length === 0,
    checks,
    error: missing.length ? `Senha fraca: inclua ${missing.join(", ")}.` : ""
  };
}

function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken || "")).digest("hex");
}

function pruneExpiredResets() {
  const now = Date.now();
  let changed = false;
  for (const [k, rec] of Object.entries(db.passwordResets || {})) {
    if (!rec || rec.expiresAt <= now) {
      delete db.passwordResets[k];
      changed = true;
    }
  }
  if (changed) saveDb();
}

function maskEmail(email) {
  const s = String(email || "");
  const at = s.indexOf("@");
  if (at <= 1) return s;
  const local = s.slice(0, at);
  const dom = s.slice(at);
  return `${local[0]}${"*".repeat(Math.min(5, Math.max(2, local.length - 1)))}${dom}`;
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

function getClientIp(req) {
  const fwd = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req?.socket?.remoteAddress || "unknown";
}

function hashSessionToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken || "")).digest("hex");
}

function createSession(userId, req) {
  const token = crypto.randomBytes(48).toString("base64url");
  const sidHash = hashSessionToken(token);
  const now = Date.now();
  // Limpa sessões expiradas
  for (const [k, s] of Object.entries(db.sessions)) {
    if (!s || s.expiresAt < now) delete db.sessions[k];
  }
  db.sessions[sidHash] = {
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + SESSION_TTL_MS,
    ip: getClientIp(req),
    userAgent: String(req?.headers?.["user-agent"] || "").slice(0, 140)
  };
  saveDb();
  return token;
}

function revokeUserSessions(userId, keepSessionKey = null) {
  let count = 0;
  for (const [k, s] of Object.entries(db.sessions || {})) {
    if (s && s.userId === userId && k !== keepSessionKey) {
      delete db.sessions[k];
      count++;
    }
  }
  return count;
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
  const sidHash = hashSessionToken(sid);
  let sessKey = sidHash;
  let sess = db.sessions[sidHash];
  if (!sess && db.sessions[sid]) {
    sess = db.sessions[sid];
    sessKey = sid;
  }
  const now = Date.now();
  if (!sess || sess.expiresAt < now) {
    if (sess) { delete db.sessions[sessKey]; saveDb(); }
    return null;
  }
  const user = db.users[sess.userId];
  if (!user) return null;
  // Sliding expiration: renova sessão ativa no máximo a cada 5 min sem I/O excessivo
  if (now - (sess.lastSeenAt || sess.createdAt || 0) > 5 * 60 * 1000) {
    sess.lastSeenAt = now;
    sess.expiresAt = now + SESSION_TTL_MS;
    saveDb();
  }
  return { user, sid, sidKey: sessKey };
}

/* ---------- RATE LIMITING & AUDIT LOGS ---------- */
const rateLimitBuckets = new Map();

function pruneRateLimits() {
  const now = Date.now();
  for (const [k, b] of rateLimitBuckets.entries()) {
    if (!b || b.resetAt <= now) rateLimitBuckets.delete(k);
  }
}

function checkRateLimit(bucketKey, maxHits, windowMs) {
  const now = Date.now();
  if (rateLimitBuckets.size > 500) pruneRateLimits();
  let rec = rateLimitBuckets.get(bucketKey);
  if (!rec || rec.resetAt <= now) {
    rec = { count: 0, resetAt: now + windowMs };
    rateLimitBuckets.set(bucketKey, rec);
  }
  if (rec.count >= maxHits) {
    const retryAfterSec = Math.max(1, Math.ceil((rec.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }
  rec.count++;
  return { allowed: true, retryAfterSec: 0 };
}

function clearRateLimit(bucketKey) {
  rateLimitBuckets.delete(bucketKey);
}

function auditLog(action, { userId = "", email = "", ip = "", detail = "" } = {}) {
  try {
    if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
    db.auditLogs.unshift({
      id: uid("aud_"),
      ts: Date.now(),
      action: String(action || "").slice(0, 64),
      userId: String(userId || "").slice(0, 64),
      email: String(email || "").slice(0, 120),
      ip: String(ip || "").slice(0, 64),
      detail: String(detail || "").slice(0, 240)
    });
    if (db.auditLogs.length > 1000) db.auditLogs.length = 1000;
  } catch {}
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

function getGlobalConfig() {
  const sys = (db.systemSettings && typeof db.systemSettings === "object") ? db.systemSettings : {};
  const envClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const envDefaultClientId = process.env.DISABLE_DEFAULT_GOOGLE_CLIENT_ID === "1" ? "" : DEFAULT_GOOGLE_CLIENT_ID;
  const googleClientId = envClientId || String(sys.googleClientId || "").trim() || envDefaultClientId;
  const googleLoginClientId = GOOGLE_LOGIN_CLIENT_ID || String(sys.googleLoginClientId || "").trim();
  const googleClientSecret = GOOGLE_CLIENT_SECRET || decryptSecret(sys.googleClientSecretEnc);
  const geminiKey = ENV_GEMINI_KEY || decryptSecret(sys.geminiKeyEnc);
  const gmapsKey = ENV_GMAPS_KEY || decryptSecret(sys.gmapsKeyEnc);
  const walletIssuerId = ENV_WALLET_ISSUER_ID || String(sys.walletIssuerId || "").trim();
  let envSaRaw = ENV_WALLET_SA_JSON;
  if (!envSaRaw && ENV_WALLET_SA_FILE && fs.existsSync(ENV_WALLET_SA_FILE)) {
    try { envSaRaw = fs.readFileSync(ENV_WALLET_SA_FILE, "utf8"); } catch {}
  }
  if (!envSaRaw && ENV_WALLET_CLIENT_EMAIL && ENV_WALLET_PRIVATE_KEY) {
    envSaRaw = JSON.stringify({ client_email: ENV_WALLET_CLIENT_EMAIL, private_key: ENV_WALLET_PRIVATE_KEY });
  }
  const walletSaJson = (envSaRaw || decryptSecret(sys.walletSaJsonEnc) || "").trim();

  const smtpHost = SMTP_HOST || String(sys.smtpHost || "").trim();
  const smtpPort = SMTP_HOST ? SMTP_PORT : (parseInt(sys.smtpPort || "587", 10) || 587);
  const smtpSecure = SMTP_HOST ? SMTP_SECURE : String(sys.smtpSecure || "").trim().toLowerCase();
  const smtpUser = SMTP_HOST ? SMTP_USER : String(sys.smtpUser || "").trim();
  const smtpPass = SMTP_HOST ? SMTP_PASS : decryptSecret(sys.smtpPassEnc);
  const smtpFrom = (process.env.SMTP_FROM || "").trim() || String(sys.smtpFrom || "").trim() || smtpUser || "no-reply@myplan.app";
  const resendApiKey = RESEND_API_KEY || decryptSecret(sys.resendApiKeyEnc);
  const appBaseUrl = (APP_BASE_URL || String(sys.appBaseUrl || "").trim()).replace(/\/+$/, "");

  return {
    googleClientId,
    googleLoginClientId,
    googleClientSecret,
    geminiKey,
    gmapsKey,
    walletIssuerId,
    walletSaJson,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    smtpFrom,
    resendApiKey,
    appBaseUrl,
    sources: {
      googleClientId: envClientId ? "env" : (sys.googleClientId ? "vault" : (envDefaultClientId ? "default" : "none")),
      googleClientSecret: GOOGLE_CLIENT_SECRET ? "env" : (sys.googleClientSecretEnc ? "vault" : "none"),
      geminiKey: ENV_GEMINI_KEY ? "env" : (sys.geminiKeyEnc ? "vault" : "none"),
      gmapsKey: ENV_GMAPS_KEY ? "env" : (sys.gmapsKeyEnc ? "vault" : "none"),
      wallet: (ENV_WALLET_ISSUER_ID && envSaRaw) ? "env" : ((sys.walletIssuerId && sys.walletSaJsonEnc) ? "vault" : "none"),
      smtp: SMTP_HOST ? "env" : (sys.smtpHost ? "vault" : "none"),
      resend: RESEND_API_KEY ? "env" : (sys.resendApiKeyEnc ? "vault" : "none")
    }
  };
}

function getServerGoogleClientId() {
  const sys = getGlobalConfig();
  if (sys.googleClientId) return sys.googleClientId;
  const u = Object.values(db.users).find(usr => usr?.integrations?.googleClientId);
  return u ? String(u.integrations.googleClientId || "").trim() : "";
}

function getEffectiveCredentials(user) {
  const integ = (user && user.integrations) || {};
  const sys = getGlobalConfig();
  const userGemini = decryptSecret(integ.geminiKeyEnc || integ.geminiKey);
  const userMaps = decryptSecret(integ.gmapsKeyEnc || integ.gmapsKey);
  const userWalletSa = decryptSecret(integ.walletSaJsonEnc || integ.walletSaJson);
  return {
    geminiKey: (userGemini || sys.geminiKey || "").trim(),
    gmapsKey: (userMaps || sys.gmapsKey || "").trim(),
    googleClientId: (integ.googleClientId || sys.googleClientId || "").trim(),
    walletIssuerId: (integ.walletIssuerId || sys.walletIssuerId || "").trim(),
    walletSaJson: (userWalletSa || sys.walletSaJson || "").trim()
  };
}

function parseGeminiMediaPart(m) {
  let raw = String(m?.dataBase64 || "").trim();
  const b64Idx = raw.indexOf("base64,");
  if (b64Idx !== -1) {
    raw = raw.slice(b64Idx + 7);
  } else {
    raw = raw.replace(/^data:.*?,/i, "");
  }
  raw = raw.replace(/\s+/g, "");
  let mime = String(m?.mimeType || "image/jpeg").split(";")[0].trim().toLowerCase();
  if (mime === "audio/x-m4a") mime = "audio/mp4";
  if (mime === "audio/wave" || mime === "audio/x-wav") mime = "audio/wav";
  if (!mime || !mime.includes("/")) mime = "application/octet-stream";
  return raw ? { inlineData: { mimeType: mime, data: raw } } : null;
}

function maskKeyHint(k) {
  const s = String(k || "").trim();
  if (!s) return "";
  if (s.length <= 10) return "••••";
  return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

function isSuperAdminEmail(email) {
  return SUPER_ADMIN_EMAILS.has(String(email || "").trim().toLowerCase());
}

function isAdminUser(user) {
  if (!user) return false;
  const email = String(user.email || "").trim().toLowerCase();
  return isSuperAdminEmail(email) || (Array.isArray(db.admins) && db.admins.includes(email));
}

function buildAdminUserSummary(u) {
  const creds = getEffectiveCredentials(u);
  const ownTrips = Object.values(db.trips).filter(t => t.ownerId === u.id);
  const sharedToUser = db.shares.filter(s => s.status === "accepted" && (s.targetUserId === u.id || s.targetEmail === u.email));
  const sharesSent = db.shares.filter(s => s.ownerId === u.id && s.status !== "declined");
  const totalActivitiesCount = ownTrips.reduce((sum, t) => sum + (Array.isArray(t.data?.activities) ? t.data.activities.length : 0), 0);
  const attachmentsCount = ownTrips.reduce((sum, t) => sum + Object.values(db.attachments).filter(a => a.tripId === t.id).length, 0);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar || "",
    isSuperAdmin: isSuperAdminEmail(u.email),
    isAdmin: isAdminUser(u),
    isDemo: Boolean(u.isDemo),
    hasGoogle: Boolean(u.googleSub),
    hasPassword: Boolean(u.passwordHash),
    age: u.age ?? "",
    doc: u.doc || "",
    emergencyContact: u.emergencyContact || "",
    cep: u.cep || "",
    address: u.address || "",
    city: u.city || "",
    state: u.state || "",
    whatsappCountry: u.whatsappCountry || "+55",
    whatsappNumber: u.whatsappNumber || "",
    whatsappFull: u.whatsappFull || "",
    createdAt: u.createdAt || null,
    lastLoginAt: u.lastLoginAt || u.createdAt || null,
    ownTripsCount: ownTrips.length,
    sharedWithUserCount: sharedToUser.length,
    sharesSentCount: sharesSent.length,
    totalActivitiesCount,
    attachmentsCount,
    integrations: {
      hasGemini: Boolean(creds.geminiKey),
      geminiHint: maskKeyHint(creds.geminiKey),
      hasMaps: Boolean(creds.gmapsKey),
      gmapsHint: maskKeyHint(creds.gmapsKey),
      googleClientId: creds.googleClientId || "",
      hasWallet: Boolean(creds.walletIssuerId && creds.walletSaJson),
      walletIssuerId: creds.walletIssuerId || ""
    }
  };
}

function buildDemoTripData() {
  return {
    title: "Roteiro Sul & Litoral — Rodrigo",
    vehicle: {
      name: "Jeep Compass 1.3 Turbo 2024",
      powertrain: "Flex/Gasolina",
      evRange: 0,
      hevKmL: 12.8,
      bevKwhPer100: 0,
      fuelPrice: 6.39,
      tank: 60,
      kwhPerCharge: 0,
      kwhPrice: 0.92,
      battery: 0
    },
    params: {
      travelers: 2,
      stopIntervalHours: 4,
      stopDurationMin: 45,
      defaultCharges: 0,
      tollPass: "BR_SEM_PARAR",
      trafficAware: true,
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false,
      lodgingPerNight: 320,
      lodgingNightsOverride: 10,
      dailyFoodPerPerson: 110,
      otherFixedBudget: 600,
      contingencyPct: 10,
      calendarReminderTime: "09:00"
    },
    scenarios: [
      { id: "s1", name: "Econômico (100 km/h)", kmL: 14.0 },
      { id: "s2", name: "Realista (110 km/h)", kmL: null },
      { id: "s3", name: "Rápido / Serra", kmL: 11.2 }
    ],
    activities: [
      { id: "demo_act_1", type: "Viagem", name: "Campinas ➔ São Paulo", from: "Campinas", to: "São Paulo", start: "2026-12-08", end: "2026-12-08", km: 96, drive: 85, stops: 0, stopTime: 0, toll: 24.4, charges: 0, extraCost: 0, includeRouteCost: true, notes: "Mesma data em São Paulo (08/12)!", attachments: [], tickets: [] },
      { id: "demo_act_2", type: "Viagem", name: "São Paulo ➔ Pirassununga", from: "São Paulo", to: "Pirassununga", start: "2026-12-09", end: "2026-12-09", km: 209, drive: 165, stops: 0, stopTime: 0, toll: 58, charges: 0, extraCost: 0, includeRouteCost: true, notes: "Encontro no interior de SP", attachments: [], tickets: [] },
      { id: "demo_act_3", type: "Evento", name: "Churrasco & Encontro Pirassununga", start: "2026-12-11", end: "2026-12-11", extraCost: 180, tickets: [{ label: "Rateio churrasco", qty: 2, unitPrice: 90 }], notes: "Datas em comum em Pirassununga", attachments: [] },
      { id: "demo_act_4", type: "Viagem", name: "Pirassununga ➔ Navegantes", from: "Pirassununga", to: "Navegantes", start: "2026-12-14", end: "2026-12-14", km: 785, drive: 590, stops: 2, stopTime: 90, toll: 99.5, charges: 0, extraCost: 0, includeRouteCost: true, notes: "Seguindo para SC", attachments: [], tickets: [] },
      { id: "demo_act_5", type: "Hospedagem", name: "Pousada Praia de Navegantes", start: "2026-12-21", end: "2026-12-23", extraCost: 1140, tickets: [{ label: "Diária casal", qty: 3, unitPrice: 380 }], notes: "Coincide com a chegada em Navegantes pré-Natal", attachments: [] },
      { id: "demo_act_6", type: "Passeio", name: "Beto Carrero World (Rodrigo)", start: "2027-01-04", end: "2027-01-04", extraCost: 340, tickets: [{ label: "Passaporte", qty: 2, unitPrice: 170 }], notes: "Mesmo passeio em Penha / Navegantes!", attachments: [] },
      { id: "demo_act_7", type: "Viagem", name: "Retorno Navegantes ➔ Campinas", from: "Navegantes", to: "Campinas", start: "2027-01-05", end: "2027-01-05", km: 720, drive: 540, stops: 1, stopTime: 45, toll: 88, charges: 0, extraCost: 0, includeRouteCost: true, notes: "Retorno para casa", attachments: [], tickets: [] }
    ],
    checklist: [
      { id: "demo_chk_1", cat: "Documentos", item: "CNH, CRLV digital e seguro em dia", prio: "Alta", status: "Concluído", notes: "" },
      { id: "demo_chk_2", cat: "Eventos", item: "Ingressos Beto Carrero 04/01", prio: "Alta", status: "Pendente", notes: "Combinar horário no parque" }
    ],
    finance: {
      savingsGoal: 400,
      dailyRecords: {
        "2026-12-08": {
          checkedPlanned: { "demo_act_1:fuel": { checked: true, actualAmount: 47.93 }, "demo_act_1:toll": { checked: true, actualAmount: 24.4 } },
          entries: [{ cat: "Alimentação", desc: "Almoço em SP", amount: 145 }],
          manualTotalOverride: false,
          spent: 217.33,
          note: "Trecho tranquilo pela Anhanguera"
        }
      }
    }
  };
}

function ensureAdminSeedDemoData(adminUser, forceRecreate = false) {
  if (!adminUser) return null;
  if (!forceRecreate && db.meta?.adelphiDemoSeeded) return null;

  const demoEmail = "rodrigo.simulado@feriaspro.demo";
  let demoUser = Object.values(db.users).find(u => u.email === demoEmail);
  const now = Date.now();
  if (!demoUser) {
    const demoId = uid("u_demo_");
    demoUser = {
      id: demoId,
      name: "Rodrigo Almeida (Simulado)",
      email: demoEmail,
      isDemo: true,
      passwordHash: hashPassword(crypto.randomBytes(16).toString("hex") + "Aa1!"),
      age: "36",
      doc: "",
      emergencyContact: "Camila Almeida (11) 98888-7777",
      cep: "13020-000",
      city: "Campinas",
      state: "SP",
      address: "Av. Brasil, 1450 (Usuário Fictício Demo)",
      whatsappCountry: "+55",
      whatsappNumber: "11987654321",
      whatsappFull: "+55 (11) 98765-4321",
      createdAt: now - 3600 * 1000,
      lastLoginAt: now - 600 * 1000
    };
    db.users[demoId] = demoUser;
  } else {
    demoUser.isDemo = true;
  }

  let demoTrip = Object.values(db.trips).find(t => t.ownerId === demoUser.id && t.isDemoTrip);
  if (!demoTrip || forceRecreate) {
    const tripId = demoTrip ? demoTrip.id : uid("t_demo_");
    demoTrip = {
      id: tripId,
      name: "Roteiro Sul & Litoral — Rodrigo",
      isDemoTrip: true,
      ownerId: demoUser.id,
      calToken: demoTrip?.calToken || crypto.randomBytes(18).toString("hex"),
      createdAt: now - 3000 * 1000,
      updatedAt: now,
      revision: (demoTrip?.revision || 0) + 1,
      gmapsKey: "",
      data: buildDemoTripData()
    };
    db.trips[tripId] = demoTrip;
  }

  const existingShare = db.shares.find(
    s => s.tripId === demoTrip.id && (s.targetUserId === adminUser.id || s.targetEmail === adminUser.email)
  );
  if (!existingShare) {
    db.shares.push({
      id: uid("sh_demo_"),
      tripId: demoTrip.id,
      ownerId: demoUser.id,
      targetEmail: adminUser.email,
      targetUserId: adminUser.id,
      role: "viewer",
      status: "accepted",
      createdAt: now - 1800 * 1000,
      respondedAt: now - 1200 * 1000
    });
  } else {
    existingShare.targetUserId = adminUser.id;
    existingShare.status = "accepted";
    existingShare.respondedAt = existingShare.respondedAt || now;
  }

  db.meta = db.meta || {};
  db.meta.adelphiDemoSeeded = true;
  saveDb();
  return { demoUserId: demoUser.id, demoTripId: demoTrip.id };
}

function publicUser(u) {
  const creds = getEffectiveCredentials(u);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar || "",
    isAdmin: isAdminUser(u),
    isSuperAdmin: isSuperAdminEmail(u.email),
    isDemo: Boolean(u.isDemo),
    hasGoogle: Boolean(u.googleSub),
    hasPassword: Boolean(u.passwordHash),
    createdAt: u.createdAt || null,
    lastLoginAt: u.lastLoginAt || u.createdAt || null,
    age: u.age ?? "",
    doc: u.doc || "",
    emergencyContact: u.emergencyContact || "",
    cep: u.cep || "",
    address: u.address || "",
    city: u.city || "",
    state: u.state || "",
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
      walletIssuerId: creds.walletIssuerId || "",
      driveFolderId: String(u.integrations?.driveFolderId || ""),
      driveFolderName: String(u.integrations?.driveFolderName || ""),
      driveFolderUrl: String(u.integrations?.driveFolderUrl || ""),
      driveConnectedEmail: String(u.integrations?.driveConnectedEmail || ""),
      personalDriveFolderId: String(u.integrations?.personalDriveFolderId || ""),
      personalDriveFolderName: String(u.integrations?.personalDriveFolderName || ""),
      personalDriveFolderUrl: String(u.integrations?.personalDriveFolderUrl || "")
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

function applySecurityHeaders(res, extraHeaders = {}) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(self), microphone=(self), camera=()",
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https:; " +
      "script-src 'self' 'unsafe-inline' https:; connect-src 'self' https:; font-src 'self' data: https:; " +
      "media-src 'self' blob: data:; frame-src 'self' https://accounts.google.com https://content.googleapis.com; frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
    ...extraHeaders
  };
  return headers;
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, applySecurityHeaders(res, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  }));
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

function serveStaticFile(req, res, reqPath) {
  let cleanPath = reqPath === "/" ? "/index.html" : reqPath;
  if (cleanPath === "/sobre" || cleanPath === "/como-usar" || cleanPath === "/saiba-mais") {
    cleanPath = "/como-usar.html";
  }
  const baseStatic = path.resolve(STATIC_DIR);
  const resolved = path.resolve(STATIC_DIR, "." + cleanPath);
  if (resolved !== baseStatic && !resolved.startsWith(baseStatic + path.sep)) {
    res.writeHead(403, applySecurityHeaders(res));
    return res.end("Forbidden");
  }
  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    res.writeHead(404, applySecurityHeaders(res));
    return res.end("Not Found");
  }
  if (stat.isDirectory()) {
    res.writeHead(404, applySecurityHeaders(res));
    return res.end("Not Found");
  }
  const ext = path.extname(resolved).toLowerCase();
  const isMedia = ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp" || ext === ".svg" || ext === ".ico";
  const cacheControl = isMedia ? "public, max-age=86400" : "no-cache";
  const etag = `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, applySecurityHeaders(res, {
      "ETag": etag,
      "Cache-Control": cacheControl
    }));
    return res.end();
  }
  res.writeHead(200, applySecurityHeaders(res, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": cacheControl,
    "ETag": etag,
    "Last-Modified": stat.mtime.toUTCString()
  }));
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

function getTripMode(trip) {
  return (trip?.mode || trip?.data?.mode) === "professional" ? "professional" : "personal";
}

function buildTripIcs(trip) {
  const data = trip.data || {};
  const isPro = getTripMode(trip) === "professional";
  const tripName = trip.name || data.title || "My Plan";
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const colMap = new Map((Array.isArray(data.columns) ? data.columns : []).map(c => [c.id, c.title]));
  const remTime = data.params?.calendarReminderTime || "09:00";
  const [hh, mm] = String(remTime).split(":").map(x => String(parseInt(x, 10) || 0).padStart(2, "0"));
  const minsBefore = Math.max(60, 24 * 60 - ((parseInt(hh, 10) || 9) * 60 + (parseInt(mm, 10) || 0)));
  const seq = trip.revision || 1;
  const stamp = new Date(trip.updatedAt || Date.now()).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//My Plan//VPS Feed//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(`My Plan (${isPro ? "Pro" : "Pessoal"}) — ${tripName}`)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H"
  ];

  activities.forEach(a => {
    if (!a || !a.start) return;
    const isRouteOrTransit = ["Viagem", "Voo", "Trem", "Ônibus", "Navio"].includes(a.type);
    const modePrefix = a.type === "Voo" ? "✈️ " : a.type === "Navio" ? "🚢 " : a.type === "Trem" ? "🚂 " : a.type === "Ônibus" ? "🚌 " : "";
    const colTitle = isPro ? (colMap.get(a.columnId) || "") : "";
    let summary = isRouteOrTransit && (a.from || a.to)
      ? `${modePrefix}${a.name} (${a.from || "?"} ➔ ${a.to || "?"})`
      : a.name;
    if (isPro && colTitle) summary = `[${colTitle}] ${summary}`;

    const descParts = [`${isPro ? "Projeto" : "Planejamento"}: ${tripName}`, `Tipo: ${a.type}`];
    if (colTitle) descParts.push(`Etapa / Lista: ${colTitle}`);
    if (a.startTime) descParts.push(`Horário: ${String(a.startTime).slice(0, 5)}${a.endTime ? " – " + String(a.endTime).slice(0, 5) : ""}`);
    if (a.priority) descParts.push(`Prioridade: ${a.priority}`);
    if (a.progress != null && a.progress !== "") descParts.push(`Progresso: ${Number(a.progress) || 0}%`);
    if (a.client) descParts.push(`Cliente / Conta: ${a.client}`);
    if (a.assignee) descParts.push(`Responsável: ${a.assignee}`);
    if (a.location) descParts.push(`Local / Link: ${a.location}`);
    if (a.from || a.to) descParts.push(`Trecho: ${a.from || "?"} ➔ ${a.to || "?"}`);
    if (a.airline) descParts.push(`Cia / Empresa / Navio: ${a.airline}`);
    if (a.bookingRef) descParts.push(`Localizador / Reserva: ${a.bookingRef}`);
    if (a.km) descParts.push(`Distância: ${a.km} km`);
    if (a.toll) descParts.push(`Pedágio: R$ ${Number(a.toll).toFixed(2)}`);
    if (a.extraCost) descParts.push(`Custo: R$ ${Number(a.extraCost).toFixed(2)}`);
    if (a.finDirection === "income" && Number(a.amount) > 0) {
      descParts.push(`Recebimento: +R$ ${Number(a.amount).toFixed(2)}${a.finStatus ? ` (${a.finStatus})` : ""}`);
    } else if (a.finDirection === "expense" && Number(a.amount) > 0) {
      descParts.push(`Despesa: -R$ ${Number(a.amount).toFixed(2)}${a.finStatus ? ` (${a.finStatus})` : ""}`);
    }
    if (Array.isArray(a.subtasks) && a.subtasks.length) {
      const doneSub = a.subtasks.filter(s => s && s.done).length;
      descParts.push(`Subtarefas (${doneSub}/${a.subtasks.length}): ${a.subtasks.map(s => `${s.done ? "[x]" : "[ ]"} ${s.text || ""}`).join(" | ")}`);
    }
    if (Array.isArray(a.tags) && a.tags.length) descParts.push(`Tags: ${a.tags.map(t => String(t)).join(", ")}`);
    if (a.notes) descParts.push(`Notas: ${a.notes}`);
    const desc = descParts.join("\n");

    const uidBase = `${trip.id}-${a.id || crypto.createHash("md5").update(summary + a.start).digest("hex").slice(0, 8)}`;
    const dtStart = a.start.replace(/-/g, "");
    const dtEnd = addDaysISO(a.end || a.start, 1).replace(/-/g, "");
    const prevDay = addDaysISO(a.start, -1).replace(/-/g, "");
    const endRemMin = Math.min(59, (parseInt(mm, 10) || 0) + 15);
    const locProp = a.location || a.to || a.from || "";

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uidBase}-main@myplan.app`,
      `SEQUENCE:${seq}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      ...(locProp ? [`LOCATION:${escapeIcsText(locProp)}`] : []),
      `DESCRIPTION:${escapeIcsText(desc)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText("Lembrete My Plan: " + summary)}`,
      `TRIGGER:-PT${minsBefore}M`,
      "END:VALARM",
      "END:VEVENT",
      "BEGIN:VEVENT",
      `UID:${uidBase}-rem@myplan.app`,
      `SEQUENCE:${seq}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${prevDay}T${hh}${mm}00`,
      `DTEND:${prevDay}T${hh}${String(endRemMin).padStart(2, "0")}00`,
      `SUMMARY:${escapeIcsText("🔔 Lembrete amanhã: " + summary)}`,
      ...(locProp ? [`LOCATION:${escapeIcsText(locProp)}`] : []),
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
  const sys = getGlobalConfig();
  const cids = [...new Set([getServerGoogleClientId(), sys.googleLoginClientId].filter(Boolean))];
  if (!cids.length) throw new Error("GOOGLE_NOT_CONFIGURED");
  const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!resp.ok) throw new Error("GOOGLE_TOKEN_INVALID");
  const info = await resp.json();
  if (!cids.includes(info.aud)) throw new Error("GOOGLE_AUD_MISMATCH");
  if (info.email_verified !== "true" && info.email_verified !== true) throw new Error("GOOGLE_EMAIL_UNVERIFIED");
  return info;
}

function getAppBaseUrl(req) {
  const sys = getGlobalConfig();
  if (sys.appBaseUrl) return sys.appBaseUrl;
  const rawHost = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  const safeHost = /^[a-z0-9.-]+(:\d+)?$/i.test(rawHost) ? rawHost : `127.0.0.1:${PORT}`;
  const rawProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  const proto = rawProto === "https" ? "https" : (rawProto === "http" ? "http" : (safeHost.startsWith("127.") || safeHost.startsWith("localhost") ? "http" : "https"));
  return `${proto}://${safeHost}`;
}

function getSendmailPath() {
  for (const p of ["/usr/sbin/sendmail", "/usr/bin/sendmail"]) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return "";
}

function isEmailTransportConfigured() {
  const sys = getGlobalConfig();
  return Boolean(sys.resendApiKey || sys.smtpHost || getSendmailPath());
}

function extractEmailAddress(str) {
  const s = String(str || "").trim();
  const m = s.match(/<([^>\s]+)>/);
  return (m ? m[1] : s).trim();
}

function encodeRfc2047(str) {
  return `=?UTF-8?B?${Buffer.from(String(str || ""), "utf8").toString("base64")}?=`;
}

function buildMimeEmail({ from, to, subject, text, html }) {
  const boundary = `=_fp_${crypto.randomBytes(10).toString("hex")}`;
  const cleanFrom = String(from || "").replace(/[\r\n]+/g, " ").trim();
  const cleanTo = extractEmailAddress(to);
  const b64Wrap = s => Buffer.from(String(s || ""), "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trimEnd();
  return [
    `From: ${cleanFrom}`,
    `To: ${cleanTo}`,
    `Subject: ${encodeRfc2047(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${uid("msg.")}@myplan.app>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64Wrap(text),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64Wrap(html),
    "",
    `--${boundary}--`,
    ""
  ].join("\r\n");
}

async function sendSmtpEmail({ host, port, secure, user, pass, from, to, subject, text, html }) {
  const useImplicitTls = secure === "1" || secure === "true" || (secure !== "0" && secure !== "false" && port === 465);
  const allowStartTls = secure !== "0" && secure !== "false";

  const makeReader = sock => {
    let buf = "";
    let lines = [];
    let waiter = null;
    const onData = chunk => {
      buf += chunk.toString("utf8");
      const parts = buf.split(/\r?\n/);
      buf = parts.pop() || "";
      for (const ln of parts) {
        if (!ln) continue;
        lines.push(ln);
        if (/^\d{3}(?: |$)/.test(ln) && waiter) {
          const code = parseInt(ln.slice(0, 3), 10);
          const full = lines.join("\n");
          lines = [];
          const w = waiter;
          waiter = null;
          w.resolve({ code, text: full });
        }
      }
    };
    const onErr = err => {
      if (waiter) {
        const w = waiter;
        waiter = null;
        w.reject(err);
      }
    };
    const onClose = () => {
      if (waiter) {
        const w = waiter;
        waiter = null;
        w.reject(new Error("Conexão SMTP encerrada inesperadamente."));
      }
    };
    sock.on("data", onData);
    sock.on("error", onErr);
    sock.on("close", onClose);
    return {
      readReply() {
        for (let i = 0; i < lines.length; i++) {
          if (/^\d{3}(?: |$)/.test(lines[i])) {
            const chunk = lines.slice(0, i + 1);
            lines = lines.slice(i + 1);
            return Promise.resolve({ code: parseInt(chunk[i].slice(0, 3), 10), text: chunk.join("\n") });
          }
        }
        return new Promise((resolve, reject) => { waiter = { resolve, reject }; });
      },
      detach() {
        sock.off("data", onData);
        sock.off("error", onErr);
        sock.off("close", onClose);
      }
    };
  };

  let sock = await new Promise((resolve, reject) => {
    const opts = useImplicitTls ? { host, port, servername: host } : { host, port };
    const s = useImplicitTls ? tls.connect(opts, () => resolve(s)) : net.connect(opts, () => resolve(s));
    s.setTimeout(15000, () => {
      s.destroy(new Error("Tempo esgotado conectando ao servidor SMTP."));
    });
    s.once("error", reject);
  });

  let reader = makeReader(sock);
  const cmd = async (line, expectedCodes) => {
    if (line !== null) sock.write(line + "\r\n");
    const r = await reader.readReply();
    if (!expectedCodes.includes(r.code)) {
      throw new Error(`Erro SMTP (${r.code}): ${r.text}`);
    }
    return r;
  };

  try {
    await cmd(null, [220]);
    let ehlo = await cmd("EHLO ferias-pro.local", [250]);

    if (!useImplicitTls && allowStartTls && /STARTTLS/i.test(ehlo.text)) {
      await cmd("STARTTLS", [220]);
      reader.detach();
      sock = await new Promise((resolve, reject) => {
        const ts = tls.connect({ socket: sock, servername: host }, () => resolve(ts));
        ts.setTimeout(15000, () => ts.destroy(new Error("Tempo esgotado no STARTTLS.")));
        ts.once("error", reject);
      });
      reader = makeReader(sock);
      ehlo = await cmd("EHLO ferias-pro.local", [250]);
    }

    if (user && pass) {
      if (/\bAUTH\b[^\n]*\bPLAIN\b/i.test(ehlo.text) && !/\bLOGIN\b/i.test(ehlo.text)) {
        const authB64 = Buffer.from(`\0${user}\0${pass}`, "utf8").toString("base64");
        await cmd(`AUTH PLAIN ${authB64}`, [235]);
      } else {
        await cmd("AUTH LOGIN", [334]);
        await cmd(Buffer.from(user, "utf8").toString("base64"), [334]);
        await cmd(Buffer.from(pass, "utf8").toString("base64"), [235]);
      }
    }

    await cmd(`MAIL FROM:<${extractEmailAddress(from)}>`, [250]);
    await cmd(`RCPT TO:<${extractEmailAddress(to)}>`, [250, 251]);
    await cmd("DATA", [354]);
    const mime = buildMimeEmail({ from, to, subject, text, html });
    const stuffed = mime.replace(/^\./gm, "..");
    sock.write(stuffed + (stuffed.endsWith("\r\n") ? "" : "\r\n") + ".\r\n");
    await cmd(null, [250]);
    try { await cmd("QUIT", [221]); } catch {}
  } finally {
    try { reader.detach(); } catch {}
    try { sock.end(); } catch {}
  }
}

function writeMailAuditFile({ to, subject, transport, status, error = "" }) {
  try {
    ensureDirs();
    const day = new Date().toISOString().slice(0, 10);
    const logPath = path.join(MAIL_LOGS_DIR, `mail-${day}.log`);
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      to: maskEmail(extractEmailAddress(to)),
      subject: String(subject || "").slice(0, 100),
      transport,
      status,
      ...(error ? { error: String(error).slice(0, 200) } : {})
    });
    fs.appendFileSync(logPath, entry + "\n", "utf8");
  } catch {}
}

async function sendTransactionalEmail({ to, subject, text, html }) {
  const sys = getGlobalConfig();
  if (sys.resendApiKey) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sys.resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ from: sys.smtpFrom, to: [extractEmailAddress(to)], subject, text, html })
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => "");
        throw new Error(`Resend HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
      }
      writeMailAuditFile({ to, subject, transport: "resend", status: "sent" });
      return { transport: "resend" };
    } catch (err) {
      writeMailAuditFile({ to, subject, transport: "resend", status: "failed", error: err.message });
      throw err;
    }
  }

  if (sys.smtpHost) {
    try {
      await sendSmtpEmail({
        host: sys.smtpHost,
        port: Number.isFinite(sys.smtpPort) && sys.smtpPort > 0 ? sys.smtpPort : 587,
        secure: sys.smtpSecure,
        user: sys.smtpUser,
        pass: sys.smtpPass,
        from: sys.smtpFrom,
        to,
        subject,
        text,
        html
      });
      writeMailAuditFile({ to, subject, transport: "smtp", status: "sent" });
      return { transport: "smtp" };
    } catch (err) {
      writeMailAuditFile({ to, subject, transport: "smtp", status: "failed", error: err.message });
      throw err;
    }
  }

  const sendmail = getSendmailPath();
  if (sendmail) {
    try {
      const mime = buildMimeEmail({ from: sys.smtpFrom, to, subject, text, html });
      await new Promise((resolve, reject) => {
        const child = execFile(sendmail, ["-t", "-i"], err => (err ? reject(err) : resolve()));
        child.stdin.end(mime);
      });
      writeMailAuditFile({ to, subject, transport: "sendmail", status: "sent" });
      return { transport: "sendmail" };
    } catch (err) {
      writeMailAuditFile({ to, subject, transport: "sendmail", status: "failed", error: err.message });
      throw err;
    }
  }

  writeMailAuditFile({ to, subject, transport: "none", status: "not_configured" });
  throw new Error("EMAIL_NOT_CONFIGURED");
}

/* ---------- BACKUPS COMPACTADOS (.json.gz + SHA-256, SEM .master.key) ---------- */
function listBackups() {
  ensureDirs();
  const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith(".json.gz"));
  return files.map(file => {
    const fullPath = path.join(BACKUPS_DIR, file);
    const stat = fs.statSync(fullPath);
    let meta = {};
    try {
      const metaPath = fullPath + ".meta.json";
      if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) || {};
    } catch {}
    return {
      filename: file,
      bytes: stat.size,
      createdAt: meta.createdAt || stat.mtimeMs,
      reason: meta.reason || "manual",
      sha256: meta.sha256 || "",
      usersCount: meta.usersCount ?? null,
      tripsCount: meta.tripsCount ?? null,
      attachmentsCount: meta.attachmentsCount ?? null
    };
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function pruneBackups() {
  const items = listBackups();
  if (items.length <= BACKUP_RETENTION) return;
  for (const old of items.slice(BACKUP_RETENTION)) {
    try { fs.unlinkSync(path.join(BACKUPS_DIR, old.filename)); } catch {}
    try { fs.unlinkSync(path.join(BACKUPS_DIR, old.filename + ".meta.json")); } catch {}
  }
}

function createBackup(reason = "manual") {
  ensureDirs();
  const now = Date.now();
  const stamp = new Date(now).toISOString().replace(/[:.]/g, "-");
  const filename = `ferias-pro-backup-${stamp}.json.gz`;
  const snapshot = {
    version: 1,
    createdAt: now,
    reason,
    db: {
      users: db.users || {},
      trips: db.trips || {},
      shares: db.shares || [],
      attachments: db.attachments || {},
      admins: db.admins || [],
      systemSettings: db.systemSettings || {},
      auditLogs: (db.auditLogs || []).slice(0, 300),
      meta: db.meta || {}
    }
  };
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(snapshot), "utf8"), { level: 8 });
  const sha256 = crypto.createHash("sha256").update(gz).digest("hex");
  const fullPath = path.join(BACKUPS_DIR, filename);
  fs.writeFileSync(fullPath, gz, { mode: 0o600 });
  const meta = {
    filename,
    createdAt: now,
    reason,
    bytes: gz.length,
    sha256,
    usersCount: Object.keys(db.users || {}).length,
    tripsCount: Object.keys(db.trips || {}).length,
    attachmentsCount: Object.keys(db.attachments || {}).length
  };
  fs.writeFileSync(fullPath + ".meta.json", JSON.stringify(meta, null, 2), { mode: 0o600 });
  pruneBackups();
  return meta;
}

function resolveBackupFileSafe(rawName) {
  const clean = path.basename(String(rawName || ""));
  if (!/^ferias-pro-backup-[a-zA-Z0-9._-]+\.json\.gz$/.test(clean)) return null;
  const base = path.resolve(BACKUPS_DIR) + path.sep;
  const resolved = path.resolve(BACKUPS_DIR, clean);
  if (!resolved.startsWith(base) || !fs.existsSync(resolved)) return null;
  return { filename: clean, resolved };
}

function buildResetEmailContent(name, resetUrl) {
  const safeName = String(name || "Usuário").replace(/[<>&"]/g, "");
  const text = [
    `Olá, ${safeName}!`,
    "",
    "Recebemos uma solicitação para redefinir sua senha no My Plan.",
    "Acesse o link abaixo para criar uma nova senha forte (válido por 30 minutos):",
    "",
    resetUrl,
    "",
    "Se você não solicitou esta alteração, pode ignorar este e-mail com segurança."
  ].join("\n");
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a">
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px">
      <h2 style="margin:0 0 12px;color:#1e293b">🔐 Redefinição de Senha — My Plan</h2>
      <p style="margin:0 0 14px;line-height:1.55">Olá, <b>${safeName}</b>!</p>
      <p style="margin:0 0 20px;line-height:1.55">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para cadastrar uma nova senha forte (link válido por <b>30 minutos</b>):</p>
      <p style="margin:0 0 22px;text-align:center">
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;border-radius:10px;background:#1d4ed8;color:#ffffff;font-weight:700;text-decoration:none">Redefinir minha senha</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#475569">Ou copie e cole este endereço no seu navegador:</p>
      <p style="margin:0 0 18px;font-size:12px;word-break:break-all;color:#1d4ed8">${resetUrl}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:18px 0">
      <p style="margin:0;font-size:12px;color:#64748b">Se você não pediu esta redefinição, ignore este e-mail — sua conta permanece protegida.</p>
    </div>
  </div>`;
  return { subject: "My Plan — Link para redefinir sua senha", text, html };
}

function normalizeGeminiModelId(name) {
  return String(name || "").trim().replace(/^models\//i, "").replace(/[.,;:!?]+$/g, "");
}

function scoreGeminiFlashModel(id) {
  const clean = normalizeGeminiModelId(id).toLowerCase();
  const verMatch = clean.match(/gemini-(\d+)(?:\.(\d+))?/);
  const major = verMatch ? parseInt(verMatch[1], 10) : 0;
  const minor = verMatch && verMatch[2] ? parseInt(verMatch[2], 10) : 0;
  let score = major * 1000 + minor * 50;
  if (clean.includes("flash")) score += 20;
  if (!clean.includes("lite")) score += 10;
  if (clean.includes("preview") || clean.includes("exp")) score -= 3;
  if (clean.includes("8b")) score -= 12;
  return score;
}

async function discoverAvailableGeminiFlashModels(apiKey) {
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !Array.isArray(json?.models)) return [];
    const list = json.models
      .filter(m => {
        const name = normalizeGeminiModelId(m?.name).toLowerCase();
        const methods = Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
        return methods.includes("generateContent")
          && name.includes("gemini-")
          && name.includes("flash")
          && !/embedding|tts|image-generation|thinking-exp|native-audio/i.test(name);
      })
      .map(m => normalizeGeminiModelId(m.name))
      .filter(Boolean);
    const unique = [...new Set(list)];
    unique.sort((a, b) => scoreGeminiFlashModel(b) - scoreGeminiFlashModel(a));
    return unique;
  } catch {
    return [];
  }
}

async function callGeminiJSON(apiKey, parts, systemInstruction) {
  if (!apiKey) throw new Error("GEMINI_NOT_CONFIGURED");
  const cacheEntry = geminiDiscoveredModelCache.get(apiKey);
  const cachedModel = cacheEntry && cacheEntry.expiresAt > Date.now() ? cacheEntry.model : "";
  const initialCandidates = [
    ENV_GEMINI_MODEL,
    cachedModel,
    DEFAULT_GEMINI_MODEL,
    ...GEMINI_FALLBACK_MODELS
  ].map(normalizeGeminiModelId).filter(Boolean);

  const queue = [];
  const seen = new Set();
  const pushUnique = (m, toFront = false) => {
    const clean = normalizeGeminiModelId(m);
    if (!clean || seen.has(clean) || queue.includes(clean)) return;
    if (toFront) queue.unshift(clean);
    else queue.push(clean);
  };
  initialCandidates.forEach(m => pushUnique(m, false));

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

  let didDiscover = false;
  let lastErr = null;

  while (queue.length > 0 || !didDiscover) {
    if (!queue.length && !didDiscover) {
      didDiscover = true;
      const discovered = await discoverAvailableGeminiFlashModels(apiKey);
      discovered.forEach(m => pushUnique(m, false));
      if (!queue.length) break;
    }
    const model = queue.shift();
    if (!model || seen.has(model)) continue;
    seen.add(model);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      const errMsg = json?.error?.message || `Gemini API HTTP ${resp.status}`;
      lastErr = new Error(errMsg);
      const isModelIssue = [400, 404, 410].includes(resp.status)
        && /no longer available|not found|not supported|deprecated|invalid.*model|models\//i.test(errMsg);
      if (isModelIssue) {
        const suggestedMatches = [...errMsg.matchAll(/models\/(gemini-[a-z0-9._-]+)/gi)].map(m => m[1]);
        for (let i = suggestedMatches.length - 1; i >= 0; i--) {
          pushUnique(suggestedMatches[i], true);
        }
        continue;
      }
      throw lastErr;
    }

    geminiDiscoveredModelCache.set(apiKey, { model, expiresAt: Date.now() + 6 * 3600 * 1000 });
    const rawTxt = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!rawTxt) throw new Error("Gemini não retornou resposta estruturada.");
    try {
      return JSON.parse(rawTxt);
    } catch {
      const cleaned = rawTxt.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      return JSON.parse(cleaned);
    }
  }

  throw lastErr || new Error("Nenhum modelo Gemini disponível para gerar a resposta.");
}

function base64Url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function buildGoogleWalletSaveUrl(issuerId, saJsonStr, activity, tripName, originHost) {
  let sa;
  try { sa = JSON.parse(saJsonStr); } catch { throw new Error("JSON da Service Account da Carteira do Google inválido."); }
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Service Account precisa conter client_email e private_key.");
  }
  const act = activity && typeof activity === "object" ? activity : {};
  const suffix = crypto.createHash("md5").update(`${act.id || act.name || "pass"}-${act.start || ""}`).digest("hex").slice(0, 12);
  const classId = `${issuerId}.ferias_pro_pass_v1`;
  const objectId = `${issuerId}.fp_${suffix}`;
  const actType = String(act.type || "Atividade");
  const isTravel = ["Viagem", "Voo", "Trem", "Ônibus", "Navio"].includes(actType);
  const typeBgColors = {
    Voo: "#0284c7",
    Navio: "#0e7490",
    Trem: "#0d9488",
    "Ônibus": "#d97706",
    Hospedagem: "#059669",
    Ingresso: "#4f46e5",
    Evento: "#e11d48",
    Passeio: "#9333ea",
    Restaurante: "#ea580c",
    Viagem: "#2563eb",
    Desenvolvimento: "#2563eb",
    "Reunião": "#0284c7",
    "Viagem Corp.": "#d97706",
    Recebimento: "#059669",
    Despesa: "#dc2626",
    Entrega: "#4f46e5",
    Marco: "#0ea5e9",
    Proposta: "#7c3aed",
    "Follow-up": "#7c3aed"
  };
  const dateLabel = act.end && act.end !== act.start ? `${act.start} até ${act.end}` : (act.start || "-");
  const subParts = [actType];
  if (act.from || act.to) subParts.push(`${act.from || "?"} -> ${act.to || "?"}`);
  if (act.startTime) subParts.push(`${String(act.startTime).slice(0, 5)}`);
  if (act.start) subParts.push(dateLabel);

  const ticketsArr = Array.isArray(act.tickets) ? act.tickets.filter(t => (Number(t.qty) || 0) > 0 && (Number(t.unitPrice) || 0) > 0) : [];
  const qrMap = { aztec: "AZTEC", pdf417: "PDF_417", code_128: "CODE_128" };
  const barcodeType = qrMap[String(act.qrFormat || "").toLowerCase()] || "QR_CODE";
  const barcodeValue = String(act.qrPayload || "").trim()
    || `MYPLAN|${act.id || suffix}|${act.name || ""}|${act.start || ""}|${act.bookingRef || ""}`;

  const textModulesData = [
    { id: "tipo", header: "Tipo", body: actType },
    {
      id: "data",
      header: isTravel ? "Saída / Chegada" : "Data",
      body: `${dateLabel}${act.startTime ? ` · ${String(act.startTime).slice(0, 5)}` : ""}`
    }
  ];
  if (act.from || act.to) {
    textModulesData.push({ id: "rota", header: actType === "Navio" ? "Porto / Rota" : "Origem -> Destino", body: `${act.from || "-"} -> ${act.to || "-"}` });
  }
  if (act.airline) {
    textModulesData.push({ id: "companhia", header: actType === "Navio" ? "Navio / Companhia" : "Cia / Transporte", body: String(act.airline).slice(0, 120) });
  }
  if (act.bookingRef) {
    textModulesData.push({ id: "reserva", header: "Localizador / Cabine / Código", body: String(act.bookingRef).slice(0, 120) });
  }
  if (act.client) {
    textModulesData.push({ id: "cliente", header: "Cliente / Conta", body: String(act.client).slice(0, 120) });
  }
  if (act.assignee) {
    textModulesData.push({ id: "responsavel", header: "Responsável", body: String(act.assignee).slice(0, 120) });
  }
  if (act.location) {
    textModulesData.push({ id: "local", header: "Local / Link", body: String(act.location).slice(0, 200) });
  }
  if (act.finDirection && act.finDirection !== "none" && Number(act.amount) > 0) {
    const sign = act.finDirection === "income" ? "+" : "-";
    textModulesData.push({ id: "financeiro", header: act.finDirection === "income" ? "Recebimento" : "Despesa", body: `${sign}R$ ${Number(act.amount).toFixed(2).replace(".", ",")}${act.finStatus ? ` (${act.finStatus})` : ""}` });
  }
  if (act.km || act.drive || act.toll) {
    const parts = [];
    if (act.km) parts.push(`${act.km} km`);
    if (act.drive) parts.push(`${act.drive} min`);
    if (act.toll) parts.push(`Pedágio R$ ${Number(act.toll).toFixed(2).replace(".", ",")}`);
    if (parts.length) textModulesData.push({ id: "rodovia", header: "Percurso", body: parts.join(" · ") });
  }
  if (ticketsArr.length || Number(act.extraCost) > 0) {
    const listTxt = ticketsArr.map(t => `${t.qty}x ${t.label || "Item"} (R$ ${Number(t.unitPrice).toFixed(2).replace(".", ",")})`).join(", ");
    const totalTxt = Number(act.extraCost) > 0 ? `R$ ${Number(act.extraCost).toFixed(2).replace(".", ",")}` : "";
    textModulesData.push({ id: "valores", header: "Ingressos / Valor", body: [listTxt, totalTxt ? `Total: ${totalTxt}` : ""].filter(Boolean).join(" · ") });
  }
  if (Array.isArray(act.tags) && act.tags.length) {
    textModulesData.push({ id: "tags", header: "Tags", body: act.tags.map(t => String(t)).join(", ").slice(0, 120) });
  }
  if (act.notes) {
    textModulesData.push({ id: "notas", header: "Observações", body: String(act.notes).slice(0, 400) });
  }

  const genericObj = {
    id: objectId,
    classId,
    state: "ACTIVE",
    genericType: "GENERIC_TYPE_UNSPECIFIED",
    hexBackgroundColor: typeBgColors[actType] || "#4f46e5",
    cardTitle: { defaultValue: { language: "pt-BR", value: `My Plan · ${tripName || "Planejamento"}` } },
    header: { defaultValue: { language: "pt-BR", value: act.name || "Reserva" } },
    subheader: { defaultValue: { language: "pt-BR", value: subParts.join(" · ") } },
    barcode: {
      type: barcodeType,
      value: barcodeValue,
      alternateText: String(act.bookingRef || act.airline || `MP-${suffix.toUpperCase()}`).slice(0, 36)
    },
    textModulesData
  };

  const claims = {
    iss: sa.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: originHost ? [originHost] : [],
    payload: {
      genericClasses: [{ id: classId, issuerName: "My Plan", reviewStatus: "UNDER_REVIEW" }],
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

const BR_CITY_IATA = {
  brasilia: "BSB", "sao paulo": "GRU", guarulhos: "GRU", congonhas: "CGH",
  "rio de janeiro": "GIG", galeao: "GIG", "santos dumont": "SDU",
  manaus: "MAO", "porto alegre": "POA", salvador: "SSA", recife: "REC",
  fortaleza: "FOR", "belo horizonte": "CNF", confins: "CNF", curitiba: "CWB",
  florianopolis: "FLN", belem: "BEL", goiania: "GYN", vitoria: "VIX",
  natal: "NAT", maceio: "MCZ", campinas: "VCP", viracopos: "VCP",
  cuiaba: "CGB", "campo grande": "CGR", "joao pessoa": "JPA", aracaju: "AJU",
  "sao luis": "SLZ", teresina: "THE", palmas: "PMW", "porto velho": "PVH",
  macapa: "MCP", "boa vista": "BVB", "rio branco": "RBR", navegantes: "NVT",
  "foz do iguacu": "IGU", "porto seguro": "BPS", ilheus: "IOS", uberlandia: "UDI"
};

function resolveIataAirportCode(rawText) {
  const s = String(rawText || "").trim();
  if (!s) return "";
  const direct = s.match(/\b([A-Z]{3})\b/);
  if (direct && !["IDA", "VOL", "VOO", "DIA", "BUS", "CAR", "PDF", "BRL"].includes(direct[1])) {
    return direct[1];
  }
  const norm = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const [city, code] of Object.entries(BR_CITY_IATA)) {
    if (norm.includes(city)) return code;
  }
  return "";
}

function parseCarrierAndFlightNumber(carrierRaw, flightNumRaw) {
  const combined = `${String(flightNumRaw || "").trim()} ${String(carrierRaw || "").trim()}`.trim();
  const m = combined.match(/\b([A-Z0-9]{2})\s*[-]?\s*(\d{1,5})\b/i);
  if (m) {
    return { carrierIataCode: m[1].toUpperCase(), flightNumber: m[2] };
  }
  const cNorm = String(carrierRaw || "").toLowerCase();
  let code = "MP";
  if (cNorm.includes("latam") || cNorm.includes("tam")) code = "LA";
  else if (cNorm.includes("gol")) code = "G3";
  else if (cNorm.includes("azul")) code = "AD";
  else if (cNorm.includes("voepass") || cNorm.includes("passaredo")) code = "2Z";
  else if (cNorm.includes("tap")) code = "TP";
  else if (cNorm.includes("american")) code = "AA";
  else if (cNorm.includes("united")) code = "UA";
  else if (cNorm.includes("delta")) code = "DL";
  else if (cNorm.includes("copa")) code = "CM";
  else if (cNorm.includes("air france")) code = "AF";
  else if (cNorm.includes("lufthansa")) code = "LH";
  else if (cNorm.includes("iberia")) code = "IB";
  else if (cNorm.includes("emirates")) code = "EK";
  else if (cNorm.includes("qatar")) code = "QR";
  const digits = String(flightNumRaw || "").replace(/\D+/g, "").slice(0, 5) || "0001";
  return { carrierIataCode: code, flightNumber: digits };
}

function normalizeWalletLocalDateTime(dtStr, fallbackDateIso) {
  const clean = String(dtStr || "").trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(clean)) {
    return clean.length === 16 ? `${clean}:00` : clean.slice(0, 19);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return `${clean}T08:00:00`;
  if (fallbackDateIso && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDateIso)) return `${fallbackDateIso}T08:00:00`;
  return `${new Date().toISOString().slice(0, 10)}T08:00:00`;
}

function buildGoogleWalletSegmentSaveUrl(issuerId, saJsonStr, segment, card, tripName, originHost) {
  let sa;
  try { sa = JSON.parse(saJsonStr); } catch { throw new Error("JSON da Service Account da Carteira do Google inválido."); }
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Service Account precisa conter client_email e private_key.");
  }
  const privateKey = String(sa.private_key).replace(/\\n/g, "\n");
  const seg = segment && typeof segment === "object" ? segment : {};
  const crd = card && typeof card === "object" ? card : {};

  const legLabels = {
    ida: "Ida",
    conexao_ida: "Conexão Ida",
    volta: "Volta",
    conexao_volta: "Conexão Volta",
    outro: "Trecho"
  };
  const legLabel = legLabels[String(seg.legType || "ida").toLowerCase()] || "Trecho";
  const transport = String(seg.transport || crd.travelDetails?.transport || "Avião").trim() || "Avião";
  const originTxt = String(seg.origin || "").trim() || "Origem";
  const destTxt = String(seg.destination || crd.location || "").trim() || "Destino";
  const passenger = String(seg.passengerName || crd.assignee || "Passageiro").trim().slice(0, 80);
  const locator = String(seg.locator || "").trim().toUpperCase().slice(0, 40);
  const seat = String(seg.seat || "").trim().toUpperCase().slice(0, 16);
  const carrier = String(seg.carrier || "").trim().slice(0, 60);
  const flightNum = String(seg.flightNumber || "").trim().slice(0, 24);
  const depDt = normalizeWalletLocalDateTime(seg.departAt, crd.start);
  const arrDt = seg.arriveAt ? normalizeWalletLocalDateTime(seg.arriveAt, crd.end || crd.start) : "";

  const suffix = crypto
    .createHash("md5")
    .update(`${crd.id || "card"}-${seg.id || "seg"}-${originTxt}-${destTxt}-${depDt}`)
    .digest("hex")
    .slice(0, 14);

  const bcMap = {
    aztec: "AZTEC",
    pdf417: "PDF_417",
    pdf_417: "PDF_417",
    code_128: "CODE_128",
    code128: "CODE_128",
    qr_code: "QR_CODE",
    qr: "QR_CODE"
  };
  const barcodeType = bcMap[String(seg.barcodeType || "").toLowerCase()] || "QR_CODE";
  const barcodeValue = String(seg.barcodeValue || "").trim()
    || `MYPLAN|${legLabel.toUpperCase()}|${originTxt}->${destTxt}|${depDt}|${carrier} ${flightNum}|${locator || suffix}|${passenger}`.slice(0, 240);

  const isAir = /avi[aã]o|a[eé]re|voo|flight/i.test(transport) || Boolean(flightNum);
  const origIata = resolveIataAirportCode(originTxt);
  const destIata = resolveIataAirportCode(destTxt);

  let payload;
  let objectType;

  if (isAir && origIata && destIata && origIata !== destIata) {
    objectType = "flightObject";
    const { carrierIataCode, flightNumber } = parseCarrierAndFlightNumber(carrier, flightNum);
    const classId = `${issuerId}.mp_flt_${suffix}`;
    const objectId = `${issuerId}.mp_fltobj_${suffix}`;
    const flightClass = {
      id: classId,
      issuerName: "My Plan",
      reviewStatus: "UNDER_REVIEW",
      localScheduledDepartureDateTime: depDt,
      flightHeader: {
        carrier: {
          carrierIataCode,
          airlineName: carrier ? { defaultValue: { language: "pt-BR", value: carrier } } : undefined
        },
        flightNumber
      },
      origin: {
        airportIataCode: origIata,
        terminal: seg.terminal ? String(seg.terminal).slice(0, 16) : undefined,
        gate: seg.gate ? String(seg.gate).slice(0, 16) : undefined
      },
      destination: {
        airportIataCode: destIata
      }
    };
    if (arrDt) flightClass.localScheduledArrivalDateTime = arrDt;

    const flightObject = {
      id: objectId,
      classId,
      state: "ACTIVE",
      hexBackgroundColor: String(seg.legType || "").includes("volta") ? "#059669" : "#0284c7",
      passengerName: passenger,
      reservationInfo: {
        confirmationCode: locator || `MP${suffix.slice(0, 6).toUpperCase()}`
      },
      boardingAndSeatingInfo: seat ? { seatNumber: seat } : undefined,
      barcode: {
        type: barcodeType,
        value: barcodeValue,
        alternateText: (locator || `${carrierIataCode}${flightNumber}`).slice(0, 32)
      },
      textModulesData: [
        { id: "trecho", header: "Trecho", body: `${legLabel}: ${originTxt} → ${destTxt}` },
        crd.name ? { id: "evento", header: "Evento / Missão", body: String(crd.name).slice(0, 140) } : null,
        seg.notes ? { id: "obs", header: "Observações", body: String(seg.notes).slice(0, 300) } : null
      ].filter(Boolean)
    };
    payload = {
      flightClasses: [flightClass],
      flightObjects: [flightObject]
    };
  } else {
    objectType = "genericObject";
    const classId = `${issuerId}.myplan_travel_seg_v1`;
    const objectId = `${issuerId}.mp_seg_${suffix}`;
    const fmtDtBR = (iso) => {
      if (!iso) return "";
      const [d, t] = iso.split("T");
      const [y, m, day] = (d || "").split("-");
      return `${day}/${m}/${y}${t ? ` ${t.slice(0, 5)}` : ""}`;
    };
    const textModulesData = [
      { id: "passageiro", header: "Passageiro", body: passenger },
      { id: "partida", header: "Partida", body: fmtDtBR(depDt) || "-" }
    ];
    if (arrDt) textModulesData.push({ id: "chegada", header: "Chegada", body: fmtDtBR(arrDt) });
    if (carrier || flightNum) textModulesData.push({ id: "cia", header: "Companhia / Transporte", body: [transport, carrier, flightNum].filter(Boolean).join(" · ") });
    if (locator) textModulesData.push({ id: "localizador", header: "Localizador / Código", body: locator });
    if (seat) textModulesData.push({ id: "assento", header: "Assento", body: seat });
    if (crd.name) textModulesData.push({ id: "evento", header: "Evento / Cartão", body: String(crd.name).slice(0, 140) });
    if (seg.notes) textModulesData.push({ id: "obs", header: "Observações", body: String(seg.notes).slice(0, 300) });

    const bgByTransport = {
      "Avião": "#0284c7",
      "Ônibus": "#d97706",
      "Carro": "#0f766e",
      "Outro": "#4f46e5"
    };
    const genericObj = {
      id: objectId,
      classId,
      state: "ACTIVE",
      genericType: "GENERIC_TYPE_UNSPECIFIED",
      hexBackgroundColor: bgByTransport[transport] || "#2563eb",
      cardTitle: { defaultValue: { language: "pt-BR", value: `My Plan · ${legLabel} (${transport})` } },
      header: { defaultValue: { language: "pt-BR", value: `${originTxt} → ${destTxt}` } },
      subheader: { defaultValue: { language: "pt-BR", value: [fmtDtBR(depDt), carrier, flightNum].filter(Boolean).join(" · ") || (tripName || "Viagem") } },
      barcode: {
        type: barcodeType,
        value: barcodeValue,
        alternateText: (locator || `${carrier} ${flightNum}`.trim() || `MP-${suffix.slice(0, 6).toUpperCase()}`).slice(0, 36)
      },
      textModulesData
    };
    payload = {
      genericClasses: [{ id: classId, issuerName: "My Plan", reviewStatus: "UNDER_REVIEW" }],
      genericObjects: [genericObj]
    };
  }

  const claims = {
    iss: sa.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: originHost ? [originHost] : [],
    payload
  };
  const headerB64 = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimB64 = base64Url(JSON.stringify(claims));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${headerB64}.${claimB64}`);
  const sig = signer.sign(privateKey);
  const jwt = `${headerB64}.${claimB64}.${base64Url(sig)}`;
  return {
    saveUrl: `https://pay.google.com/gp/v/save/${jwt}`,
    objectType
  };
}

/* ---------- ZERO-DEPENDENCY .PKPASS (ZIP) PARA CARTEIRA DO GOOGLE ---------- */
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC32_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildZipBuffer(entries) {
  const localParts = [];
  const cdParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(String(entry.name || "file"), "utf8");
    const dataBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data || ""), "utf8");
    const crc = crc32(dataBuf);

    const lf = Buffer.alloc(30 + nameBuf.length);
    lf.writeUInt32LE(0x04034b50, 0);
    lf.writeUInt16LE(20, 4);
    lf.writeUInt16LE(0x0800, 6);
    lf.writeUInt16LE(0, 8);
    lf.writeUInt16LE(0, 10);
    lf.writeUInt16LE(0x5421, 12);
    lf.writeUInt32LE(crc, 14);
    lf.writeUInt32LE(dataBuf.length, 18);
    lf.writeUInt32LE(dataBuf.length, 22);
    lf.writeUInt16LE(nameBuf.length, 26);
    lf.writeUInt16LE(0, 28);
    nameBuf.copy(lf, 30);

    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x5421, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(dataBuf.length, 20);
    cd.writeUInt32LE(dataBuf.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    nameBuf.copy(cd, 46);

    localParts.push(lf, dataBuf);
    cdParts.push(cd);
    offset += lf.length + dataBuf.length;
  }

  const cdBuf = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, cdBuf, eocd]);
}

let cachedPassIconPng = null;
function getPassIconPng() {
  if (cachedPassIconPng) return cachedPassIconPng;
  try {
    const p = path.join(STATIC_DIR, "icons", "icon-192.png");
    if (fs.existsSync(p)) cachedPassIconPng = fs.readFileSync(p);
  } catch {}
  return cachedPassIconPng;
}

function buildPkpassBuffer(activity, tripName) {
  const act = activity && typeof activity === "object" ? activity : {};
  const suffix = crypto.createHash("md5").update(`${act.id || act.name || "pass"}-${act.start || ""}`).digest("hex").slice(0, 12);
  const actType = String(act.type || "Atividade");
  const cleanName = String(act.name || "Reserva My Plan").trim();
  const dateLabel = act.end && act.end !== act.start ? `${act.start} a ${act.end}` : (act.start || "-");
  const totalCost = Number(act.extraCost) || 0;
  const ticketsArr = Array.isArray(act.tickets) ? act.tickets.filter(t => (Number(t.qty) || 0) > 0 && (Number(t.unitPrice) || 0) > 0) : [];
  const totalTickets = ticketsArr.reduce((s, t) => s + (Number(t.qty) || 0), 0);

  const bgColors = {
    Voo: "rgb(2, 132, 199)",
    Navio: "rgb(14, 116, 144)",
    Trem: "rgb(13, 148, 136)",
    "Ônibus": "rgb(217, 119, 6)",
    Hospedagem: "rgb(5, 150, 105)",
    Ingresso: "rgb(79, 70, 229)",
    Evento: "rgb(225, 29, 72)",
    Passeio: "rgb(147, 51, 234)",
    Restaurante: "rgb(234, 88, 12)",
    Viagem: "rgb(37, 99, 235)",
    Desenvolvimento: "rgb(37, 99, 235)",
    "Reunião": "rgb(2, 132, 199)",
    "Viagem Corp.": "rgb(217, 119, 6)",
    Recebimento: "rgb(5, 150, 105)",
    Despesa: "rgb(220, 38, 38)",
    Entrega: "rgb(79, 70, 229)",
    Marco: "rgb(14, 165, 233)",
    Proposta: "rgb(124, 58, 237)",
    "Follow-up": "rgb(124, 58, 237)"
  };

  const qrMap = {
    aztec: "PKBarcodeFormatAztec",
    pdf417: "PKBarcodeFormatPDF417",
    code_128: "PKBarcodeFormatCode128"
  };
  const pkBarcodeFormat = qrMap[String(act.qrFormat || "").toLowerCase()] || "PKBarcodeFormatQR";
  const barcodeMsg = String(act.qrPayload || "").trim()
    || `MYPLAN|${act.id || suffix}|${cleanName}|${act.start || ""}|${act.bookingRef || ""}`;
  const mainBarcode = {
    message: barcodeMsg,
    format: pkBarcodeFormat,
    messageEncoding: pkBarcodeFormat === "PKBarcodeFormatQR" ? "utf-8" : "iso-8859-1",
    altText: String(act.bookingRef || act.airline || `MP-${suffix.toUpperCase()}`).slice(0, 36)
  };

  const passObj = {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.myplan.pass",
    serialNumber: `mp-${suffix}`,
    teamIdentifier: "MYPLAN1",
    organizationName: "My Plan",
    description: `${cleanName} — ${tripName || "Planejamento"}`,
    logoText: "My Plan",
    backgroundColor: bgColors[actType] || "rgb(79, 70, 229)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(224, 231, 255)",
    barcode: mainBarcode,
    barcodes: [mainBarcode]
  };

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(act.start || ""))) {
    const tStr = (act.startTime && /^\d{2}:\d{2}/.test(String(act.startTime))) ? String(act.startTime).slice(0, 5) + ":00" : "09:00:00";
    passObj.relevantDate = `${act.start}T${tStr}-03:00`;
  }

  const isTravel = ["Viagem", "Voo", "Trem", "Ônibus", "Navio"].includes(actType);
  const secondaryFields = [
    { key: "trip", label: "PLANEJAMENTO", value: String(tripName || "My Plan").slice(0, 48) },
    { key: "date", label: isTravel ? "SAÍDA / CHEGADA" : "DATA", value: dateLabel }
  ];
  if (act.airline) {
    secondaryFields.push({ key: "carrier", label: actType === "Navio" ? "NAVIO / CIA" : "CIA / EMPRESA", value: String(act.airline).slice(0, 48) });
  }
  const auxiliaryFields = [];
  if (act.startTime) auxiliaryFields.push({ key: "time", label: "HORÁRIO", value: String(act.startTime).slice(0, 5) });
  if (act.bookingRef) auxiliaryFields.push({ key: "ref", label: "LOCALIZADOR", value: String(act.bookingRef).slice(0, 32) });
  if (act.location) auxiliaryFields.push({ key: "loc", label: "LOCAL", value: String(act.location).slice(0, 40) });
  if (act.client) auxiliaryFields.push({ key: "client", label: "CLIENTE", value: String(act.client).slice(0, 32) });
  if (totalTickets > 0) auxiliaryFields.push({ key: "tickets", label: "INGRESSOS", value: `${totalTickets} un.` });
  if (totalCost > 0) auxiliaryFields.push({ key: "cost", label: "VALOR", value: `R$ ${totalCost.toFixed(2).replace(".", ",")}` });
  else if (act.finDirection && act.finDirection !== "none" && Number(act.amount) > 0) {
    auxiliaryFields.push({ key: "fin", label: act.finDirection === "income" ? "RECEBIMENTO" : "DESPESA", value: `R$ ${Number(act.amount).toFixed(2).replace(".", ",")}` });
  }

  const backFields = [
    { key: "type_full", label: "Tipo de Atividade", value: actType },
    { key: "dates_full", label: isTravel ? "Saída e Chegada" : "Período", value: dateLabel }
  ];
  if (act.from || act.to) backFields.push({ key: "route", label: actType === "Navio" ? "Porto / Rota" : "Origem -> Destino", value: `${act.from || "-"} -> ${act.to || "-"}` });
  if (act.airline) backFields.push({ key: "airline_full", label: actType === "Navio" ? "Navio / Companhia" : "Companhia / Transporte", value: String(act.airline).slice(0, 120) });
  if (act.bookingRef) backFields.push({ key: "booking_full", label: "Localizador / Reserva / Cabine", value: String(act.bookingRef).slice(0, 120) });
  if (act.km || act.drive || act.toll) {
    const road = [];
    if (act.km) road.push(`${act.km} km`);
    if (act.drive) road.push(`${act.drive} min`);
    if (act.toll) road.push(`Pedágio R$ ${Number(act.toll).toFixed(2).replace(".", ",")}`);
    if (road.length) backFields.push({ key: "road_info", label: "Dados do Percurso", value: road.join(" · ") });
  }
  if (ticketsArr.length) {
    backFields.push({
      key: "ticket_detail",
      label: "Detalhamento de Ingressos / Passagens",
      value: ticketsArr.map(t => `${t.qty}x ${t.label || "Item"} @ R$ ${Number(t.unitPrice).toFixed(2).replace(".", ",")}`).join(" | ")
    });
  }
  if (Array.isArray(act.tags) && act.tags.length) {
    backFields.push({ key: "tags", label: "Tags", value: act.tags.map(t => String(t)).join(", ").slice(0, 120) });
  }
  if (act.notes) backFields.push({ key: "notes", label: "Observações", value: String(act.notes).slice(0, 500) });

  const isTransit = actType === "Voo" || actType === "Trem" || actType === "Ônibus" || actType === "Navio";
  if (isTransit) {
    const tType = actType === "Voo"
      ? "PKTransitTypeAir"
      : actType === "Trem"
        ? "PKTransitTypeTrain"
        : actType === "Navio"
          ? "PKTransitTypeBoat"
          : "PKTransitTypeBus";
    passObj.boardingPass = {
      transitType: tType,
      headerFields: [{ key: "type", label: "EMBARQUE", value: actType.toUpperCase() }],
      primaryFields: (act.from || act.to)
        ? [
            { key: "origin", label: "ORIGEM", value: String(act.from || "Origem").slice(0, 28) },
            { key: "dest", label: "DESTINO", value: String(act.to || cleanName).slice(0, 28) }
          ]
        : [{ key: "title", label: "TRECHO", value: cleanName.slice(0, 42) }],
      secondaryFields,
      auxiliaryFields,
      backFields
    };
  } else if (["Ingresso", "Evento", "Passeio", "Restaurante"].includes(actType) || totalTickets > 0) {
    passObj.eventTicket = {
      headerFields: [{ key: "dateh", label: "DATA", value: act.start || "-" }],
      primaryFields: [{ key: "event", label: actType.toUpperCase(), value: cleanName.slice(0, 48) }],
      secondaryFields,
      auxiliaryFields,
      backFields
    };
  } else {
    passObj.generic = {
      headerFields: [{ key: "typeh", label: "ATIVIDADE", value: actType.toUpperCase() }],
      primaryFields: [{ key: "main", label: "TÍTULO", value: cleanName.slice(0, 48) }],
      secondaryFields,
      auxiliaryFields,
      backFields
    };
  }

  const entries = [{ name: "pass.json", data: Buffer.from(JSON.stringify(passObj, null, 2), "utf8") }];
  const iconPng = getPassIconPng();
  if (iconPng) {
    entries.push({ name: "icon.png", data: iconPng });
    entries.push({ name: "icon@2x.png", data: iconPng });
    entries.push({ name: "logo.png", data: iconPng });
  }
  const manifestObj = {};
  entries.forEach(e => {
    manifestObj[e.name] = crypto.createHash("sha1").update(e.data).digest("hex");
  });
  entries.push({ name: "manifest.json", data: Buffer.from(JSON.stringify(manifestObj, null, 2), "utf8") });
  return buildZipBuffer(entries);
}

const walletPassTokens = new Map();
function storeWalletPkpass(buf, activityName) {
  const now = Date.now();
  for (const [k, v] of walletPassTokens.entries()) {
    if (v.expiresAt <= now) walletPassTokens.delete(k);
  }
  if (walletPassTokens.size >= 400) {
    const oldestKey = walletPassTokens.keys().next().value;
    if (oldestKey) walletPassTokens.delete(oldestKey);
  }
  const token = crypto.randomBytes(24).toString("hex");
  const cleanFile = safeFileName(String(activityName || "passe_my_plan").replace(/\s+/g, "_").replace(/[^\w-]/g, "")) || "passe_my_plan";
  walletPassTokens.set(token, {
    buf,
    filename: `${cleanFile}.pkpass`,
    expiresAt: now + 15 * 60 * 1000
  });
  return { token, filename: `${cleanFile}.pkpass` };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    /* ---------- HEALTH & CONFIG ---------- */
    if (pathname === "/api/health" && req.method === "GET") {
      const sys = getGlobalConfig();
      return sendJson(res, 200, {
        ok: true,
        mode: "multi-user",
        version: "27",
        encryption: "aes-256-gcm",
        googleClientId: getServerGoogleClientId(),
        hasGemini: Boolean(sys.geminiKey),
        hasMaps: Boolean(sys.gmapsKey),
        hasWallet: Boolean(sys.walletIssuerId && sys.walletSaJson),
        hasEmailSender: isEmailTransportConfigured(),
        backupsCount: listBackups().length
      });
    }

    if (pathname === "/api/auth/config" && req.method === "GET") {
      const sys = getGlobalConfig();
      return sendJson(res, 200, {
        ok: true,
        googleClientId: getServerGoogleClientId(),
        hasGemini: Boolean(sys.geminiKey),
        hasMaps: Boolean(sys.gmapsKey),
        hasWallet: Boolean(sys.walletIssuerId && sys.walletSaJson),
        hasEmailSender: isEmailTransportConfigured()
      });
    }

    /* ---------- AUTH ---------- */
    if (pathname === "/api/auth/register" && req.method === "POST") {
      const ip = getClientIp(req);
      const rl = checkRateLimit(`signup:${ip}`, SIGNUP_MAX_ATTEMPTS, 60 * 60 * 1000);
      if (!rl.allowed) {
        return sendJson(res, 429, { ok: false, error: `Muitos cadastros deste endereço. Tente novamente em ${rl.retryAfterSec}s.` });
      }
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return sendJson(res, 400, { ok: false, error: "Informe nome e um e-mail válido." });
      }
      const pwCheck = validateStrongPassword(password);
      if (!pwCheck.valid) {
        return sendJson(res, 400, { ok: false, error: pwCheck.error });
      }
      const exists = Object.values(db.users).find(u => u.email === email);
      if (exists) {
        return sendJson(res, 409, { ok: false, error: "Este e-mail já está cadastrado." });
      }
      const userId = uid("u_");
      const now = Date.now();
      db.users[userId] = {
        id: userId,
        name,
        email,
        passwordHash: hashPassword(password),
        createdAt: now,
        lastLoginAt: now
      };
      linkSharesForUser(db.users[userId]);
      if (isSuperAdminEmail(email)) ensureAdminSeedDemoData(db.users[userId]);
      auditLog("auth.register", { userId, email, ip, detail: "Cadastro com e-mail e senha" });
      const token = createSession(userId, req);
      setSessionCookie(req, res, token);
      return sendJson(res, 201, {
        ok: true,
        user: publicUser(db.users[userId]),
        legacyData: Object.keys(db.trips).filter(k => !db.trips[k]?.isDemoTrip).length === 0 ? getLegacyMigrationData() : null
      });
    }

    if (pathname === "/api/auth/login" && req.method === "POST") {
      const ip = getClientIp(req);
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const bucket = `login:${ip}:${email}`;
      const rl = checkRateLimit(bucket, LOGIN_MAX_ATTEMPTS, 15 * 60 * 1000);
      if (!rl.allowed) {
        auditLog("auth.login_throttled", { email, ip, detail: `Bloqueado por ${rl.retryAfterSec}s` });
        saveDb();
        return sendJson(res, 429, { ok: false, error: `Muitas tentativas de login. Aguarde ${Math.ceil(rl.retryAfterSec / 60)} min e tente novamente.` });
      }
      const user = Object.values(db.users).find(u => u.email === email);
      if (user && !user.passwordHash) {
        return sendJson(res, 401, { ok: false, error: "Esta conta usa login pelo Google e ainda não possui senha. Entre pelo Google ou clique em 'Esqueci minha senha' para criar uma senha." });
      }
      if (!user || !verifyPassword(password, user.passwordHash)) {
        auditLog("auth.login_failed", { email, ip, detail: "Credenciais inválidas" });
        saveDb();
        return sendJson(res, 401, { ok: false, error: "E-mail ou senha inválidos." });
      }
      clearRateLimit(bucket);
      user.lastLoginAt = Date.now();
      linkSharesForUser(user);
      if (isSuperAdminEmail(user.email)) ensureAdminSeedDemoData(user);
      auditLog("auth.login", { userId: user.id, email: user.email, ip, detail: "Login por senha" });
      const token = createSession(user.id, req);
      setSessionCookie(req, res, token);
      return sendJson(res, 200, { ok: true, user: publicUser(user) });
    }

    if (pathname === "/api/auth/google" && req.method === "POST") {
      const ip = getClientIp(req);
      const body = await readBody(req);
      if (!body.credential) return sendJson(res, 400, { ok: false, error: "Token do Google ausente." });
      let info;
      try {
        info = await verifyGoogleIdToken(body.credential);
      } catch (err) {
        auditLog("auth.google_failed", { ip, detail: err.message });
        saveDb();
        return sendJson(res, 401, { ok: false, error: "Falha ao validar login Google: " + err.message });
      }
      const email = String(info.email || "").trim().toLowerCase();
      let user = Object.values(db.users).find(u => u.email === email || u.googleSub === info.sub);
      const nonDemoUserCount = Object.values(db.users).filter(u => !u.isDemo).length;
      const isFirstUser = nonDemoUserCount === 0;
      const now = Date.now();
      if (!user) {
        const userId = uid("u_");
        user = {
          id: userId,
          name: info.name || email.split("@")[0],
          email,
          googleSub: info.sub,
          avatar: info.picture || "",
          createdAt: now,
          lastLoginAt: now
        };
        db.users[userId] = user;
      } else {
        user.googleSub = info.sub;
        if (!user.avatar && info.picture) user.avatar = info.picture;
        user.lastLoginAt = now;
      }
      linkSharesForUser(user);
      if (isSuperAdminEmail(user.email)) ensureAdminSeedDemoData(user);
      auditLog("auth.google", { userId: user.id, email: user.email, ip, detail: "Login OAuth Google validado" });
      const token = createSession(user.id, req);
      setSessionCookie(req, res, token);
      return sendJson(res, 200, {
        ok: true,
        user: publicUser(user),
        legacyData: isFirstUser && Object.keys(db.trips).filter(k => !db.trips[k]?.isDemoTrip).length === 0 ? getLegacyMigrationData() : null
      });
    }

    if (pathname === "/api/auth/logout" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (auth) {
        delete db.sessions[auth.sidKey];
        auditLog("auth.logout", { userId: auth.user.id, email: auth.user.email, ip: getClientIp(req) });
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

    if (pathname === "/api/auth/sessions" && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const now = Date.now();
      const sessions = Object.entries(db.sessions || {})
        .filter(([, s]) => s && s.userId === auth.user.id && s.expiresAt > now)
        .map(([k, s]) => ({
          id: k.slice(0, 16),
          current: k === auth.sidKey,
          createdAt: s.createdAt || null,
          lastSeenAt: s.lastSeenAt || s.createdAt || null,
          expiresAt: s.expiresAt,
          ip: s.ip || "",
          userAgent: s.userAgent || ""
        }))
        .sort((a, b) => Number(b.current) - Number(a.current) || (b.lastSeenAt || 0) - (a.lastSeenAt || 0));
      return sendJson(res, 200, { ok: true, sessions });
    }

    if (pathname === "/api/auth/sessions/revoke-others" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const revoked = revokeUserSessions(auth.user.id, auth.sidKey);
      auditLog("auth.sessions_revoke_others", { userId: auth.user.id, email: auth.user.email, ip: getClientIp(req), detail: `${revoked} sessão(ões)` });
      saveDb();
      return sendJson(res, 200, { ok: true, revoked });
    }

    const sessionDelMatch = pathname.match(/^\/api\/auth\/sessions\/([a-zA-Z0-9_-]{8,64})$/);
    if (sessionDelMatch && req.method === "DELETE") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const prefix = sessionDelMatch[1];
      let removed = 0;
      for (const [k, s] of Object.entries(db.sessions || {})) {
        if (s && s.userId === auth.user.id && k.startsWith(prefix) && k !== auth.sidKey) {
          delete db.sessions[k];
          removed++;
        }
      }
      if (removed) saveDb();
      return sendJson(res, 200, { ok: true, removed });
    }

    if (pathname === "/api/auth/password" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const u = auth.user;
      const body = await readBody(req);
      const newPassword = String(body.newPassword || "");
      const oldPassword = String(body.oldPassword || "");
      const hasConfirm = body.confirmPassword !== undefined;
      const confirmPassword = String(body.confirmPassword || "");

      if (u.passwordHash) {
        if (!oldPassword || !verifyPassword(oldPassword, u.passwordHash)) {
          return sendJson(res, 400, { ok: false, error: "Senha atual incorreta." });
        }
        if (confirmPassword !== newPassword) {
          return sendJson(res, 400, { ok: false, error: "A confirmação da nova senha não confere." });
        }
        if (oldPassword === newPassword) {
          return sendJson(res, 400, { ok: false, error: "A nova senha deve ser diferente da senha atual." });
        }
      } else if (hasConfirm && confirmPassword !== newPassword) {
        return sendJson(res, 400, { ok: false, error: "A confirmação da nova senha não confere." });
      }

      const pwCheck = validateStrongPassword(newPassword);
      if (!pwCheck.valid) {
        return sendJson(res, 400, { ok: false, error: pwCheck.error });
      }

      u.passwordHash = hashPassword(newPassword);
      const revokedCount = revokeUserSessions(u.id, auth.sidKey);
      auditLog("auth.password_change", { userId: u.id, email: u.email, ip: getClientIp(req), detail: `Demais sessões revogadas: ${revokedCount}` });
      saveDb();
      return sendJson(res, 200, { ok: true, user: publicUser(u), revokedOtherSessions: revokedCount });
    }

    if (pathname === "/api/auth/forgot-password" && req.method === "POST") {
      const ip = getClientIp(req);
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return sendJson(res, 400, { ok: false, error: "Informe um e-mail válido." });
      }
      const rl = checkRateLimit(`reset:${ip}:${email}`, 5, 15 * 60 * 1000);
      if (!rl.allowed) {
        return sendJson(res, 429, { ok: false, error: `Muitas solicitações de redefinição. Aguarde ${Math.ceil(rl.retryAfterSec / 60)} min.` });
      }
      if (!isEmailTransportConfigured()) {
        return sendJson(res, 503, {
          ok: false,
          error: "Envio de e-mail não configurado neste servidor (configure SMTP_HOST/SMTP_USER/SMTP_PASS ou RESEND_API_KEY). Caso use Google, entre diretamente com o botão Google."
        });
      }

      pruneExpiredResets();
      const user = Object.values(db.users).find(u => u.email === email);
      const safeOkMsg = "Se este e-mail estiver cadastrado, enviamos um link para redefinir sua senha (válido por 30 minutos). Verifique também a caixa de spam.";
      if (!user) {
        return sendJson(res, 200, { ok: true, message: safeOkMsg });
      }

      // Remove solicitações anteriores do mesmo usuário para manter apenas o link mais recente
      for (const [k, rec] of Object.entries(db.passwordResets || {})) {
        if (rec.userId === user.id) delete db.passwordResets[k];
      }
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(rawToken);
      db.passwordResets[tokenHash] = {
        userId: user.id,
        email: user.email,
        createdAt: Date.now(),
        expiresAt: Date.now() + PASS_RESET_TTL_MS
      };
      saveDb();

      const resetUrl = `${getAppBaseUrl(req)}/?resetToken=${encodeURIComponent(rawToken)}`;
      const msg = buildResetEmailContent(user.name, resetUrl);
      try {
        await sendTransactionalEmail({ to: user.email, ...msg });
        return sendJson(res, 200, { ok: true, message: safeOkMsg });
      } catch (err) {
        delete db.passwordResets[tokenHash];
        saveDb();
        return sendJson(res, 500, { ok: false, error: "Falha ao enviar o e-mail de redefinição: " + (err.message || err) });
      }
    }

    if (pathname === "/api/auth/reset-password/validate" && req.method === "GET") {
      pruneExpiredResets();
      const rawToken = url.searchParams.get("token") || "";
      if (!rawToken) return sendJson(res, 400, { ok: false, error: "Token de redefinição ausente." });
      const rec = db.passwordResets?.[hashResetToken(rawToken)];
      const user = rec ? db.users[rec.userId] : null;
      if (!rec || !user || rec.expiresAt <= Date.now()) {
        return sendJson(res, 400, { ok: false, error: "Link de redefinição inválido ou expirado. Solicite um novo link." });
      }
      return sendJson(res, 200, {
        ok: true,
        emailMasked: maskEmail(user.email),
        hasPassword: Boolean(user.passwordHash)
      });
    }

    if (pathname === "/api/auth/reset-password" && req.method === "POST") {
      pruneExpiredResets();
      const body = await readBody(req);
      const rawToken = String(body.token || "");
      const newPassword = String(body.newPassword || "");
      const confirmPassword = String(body.confirmPassword || "");

      const tokenHash = hashResetToken(rawToken);
      const rec = db.passwordResets?.[tokenHash];
      const user = rec ? db.users[rec.userId] : null;
      if (!rawToken || !rec || !user || rec.expiresAt <= Date.now()) {
        return sendJson(res, 400, { ok: false, error: "Link de redefinição inválido ou expirado. Solicite um novo link." });
      }

      if (newPassword !== confirmPassword) {
        return sendJson(res, 400, { ok: false, error: "As senhas digitadas não conferem." });
      }
      const pwCheck = validateStrongPassword(newPassword);
      if (!pwCheck.valid) {
        return sendJson(res, 400, { ok: false, error: pwCheck.error });
      }

      user.passwordHash = hashPassword(newPassword);
      for (const [k, r] of Object.entries(db.passwordResets || {})) {
        if (r.userId === user.id) delete db.passwordResets[k];
      }
      revokeUserSessions(user.id, null);
      linkSharesForUser(user);
      auditLog("auth.password_reset", { userId: user.id, email: user.email, ip: getClientIp(req), detail: "Redefinição concluída via token" });
      const sidToken = createSession(user.id, req);
      setSessionCookie(req, res, sidToken);
      return sendJson(res, 200, { ok: true, user: publicUser(user) });
    }

    if (pathname === "/api/auth/profile" && req.method === "PUT") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const body = await readBody(req);
      const u = auth.user;
      if (typeof body.name === "string" && body.name.trim()) u.name = body.name.trim().slice(0, 80);
      if (typeof body.email === "string") {
        const nextEmail = body.email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
          return sendJson(res, 400, { ok: false, error: "Informe um e-mail válido." });
        }
        const conflict = Object.values(db.users).find(other => other.id !== u.id && other.email === nextEmail);
        if (conflict) {
          return sendJson(res, 409, { ok: false, error: "Este e-mail já está em uso por outra conta." });
        }
        u.email = nextEmail;
        linkSharesForUser(u);
      }
      if (body.age !== undefined) {
        const rawAge = String(body.age ?? "").trim();
        u.age = rawAge ? Math.max(1, Math.min(120, parseInt(rawAge, 10) || 0)) || "" : "";
      }
      if (body.doc !== undefined) u.doc = String(body.doc || "").trim().slice(0, 40);
      if (body.emergencyContact !== undefined) u.emergencyContact = String(body.emergencyContact || "").trim().slice(0, 120);
      if (body.cep !== undefined) u.cep = String(body.cep || "").trim().slice(0, 20);
      if (body.address !== undefined) u.address = String(body.address || "").trim().slice(0, 180);
      if (body.city !== undefined) u.city = String(body.city || "").trim().slice(0, 80);
      if (body.state !== undefined) u.state = String(body.state || "").trim().toUpperCase().slice(0, 10);
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
        if (body.clearGemini) {
          delete u.integrations.geminiKey;
          delete u.integrations.geminiKeyEnc;
        } else if (!isMaskedSecret(body.geminiKey)) {
          u.integrations.geminiKeyEnc = encryptSecret(body.geminiKey.trim());
          delete u.integrations.geminiKey;
        }
      }
      if (typeof body.gmapsKey === "string") {
        if (body.clearMaps) {
          delete u.integrations.gmapsKey;
          delete u.integrations.gmapsKeyEnc;
        } else if (!isMaskedSecret(body.gmapsKey)) {
          u.integrations.gmapsKeyEnc = encryptSecret(body.gmapsKey.trim());
          delete u.integrations.gmapsKey;
        }
      }
      if (typeof body.googleClientId === "string") {
        u.integrations.googleClientId = body.googleClientId.trim();
      }
      if (typeof body.walletIssuerId === "string") {
        u.integrations.walletIssuerId = body.walletIssuerId.trim();
      }
      if (typeof body.walletSaJson === "string") {
        if (body.clearWalletSa) {
          delete u.integrations.walletSaJson;
          delete u.integrations.walletSaJsonEnc;
        } else if (!isMaskedSecret(body.walletSaJson)) {
          u.integrations.walletSaJsonEnc = encryptSecret(body.walletSaJson.trim());
          delete u.integrations.walletSaJson;
        }
      }
      if (typeof body.driveFolderId === "string") {
        u.integrations.driveFolderId = body.driveFolderId.trim().slice(0, 128);
      }
      if (typeof body.driveFolderName === "string") {
        u.integrations.driveFolderName = body.driveFolderName.trim().slice(0, 180);
      }
      if (typeof body.driveFolderUrl === "string") {
        u.integrations.driveFolderUrl = body.driveFolderUrl.trim().slice(0, 320);
      }
      if (typeof body.driveConnectedEmail === "string") {
        u.integrations.driveConnectedEmail = body.driveConnectedEmail.trim().slice(0, 160);
      }
      if (typeof body.personalDriveFolderId === "string") {
        u.integrations.personalDriveFolderId = body.personalDriveFolderId.trim().slice(0, 128);
      }
      if (typeof body.personalDriveFolderName === "string") {
        u.integrations.personalDriveFolderName = body.personalDriveFolderName.trim().slice(0, 180);
      }
      if (typeof body.personalDriveFolderUrl === "string") {
        u.integrations.personalDriveFolderUrl = body.personalDriveFolderUrl.trim().slice(0, 320);
      }
      auditLog("user.integrations_update", { userId: u.id, email: u.email, ip: getClientIp(req), detail: "Integrações criptografadas (AES-256-GCM)" });
      saveDb();
      return sendJson(res, 200, { ok: true, user: publicUser(u) });
    }

    /* ---------- TRIPS ---------- */
    if (pathname === "/api/trips" && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const user = auth.user;
      if (isSuperAdminEmail(user.email) && !db.meta?.adelphiDemoSeeded) {
        ensureAdminSeedDemoData(user);
      }

      const ownTrips = Object.values(db.trips)
        .filter(t => t.ownerId === user.id)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        .map(t => ({
          id: t.id,
          name: t.name,
          mode: getTripMode(t),
          role: "owner",
          ownerName: user.name,
          ownerEmail: user.email,
          updatedAt: t.updatedAt || 0,
          revision: t.revision || 1,
          sharedCount: db.shares.filter(sh => sh.tripId === t.id && sh.status !== "declined").length,
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
            mode: getTripMode(t),
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
            mode: getTripMode(t),
            role: s.role || "editor",
            ownerName: owner ? owner.name : "Usuário",
            ownerEmail: owner ? owner.email : "",
            createdAt: s.createdAt
          };
        })
        .filter(Boolean);

      const hasSharedTrips = sharedTrips.length > 0 || ownTrips.some(t => (t.sharedCount || 0) > 0);
      return sendJson(res, 200, { ok: true, ownTrips, sharedTrips, pendingShares, hasSharedTrips });
    }

    /* ---------- SUPER ADMIN & DELEGATED ADMINS ---------- */
    if (pathname === "/api/admin/overview" && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isAdminUser(auth.user)) return sendJson(res, 403, { ok: false, error: "Acesso restrito a administradores." });

      const usersList = Object.values(db.users)
        .map(buildAdminUserSummary)
        .sort((a, b) => Number(b.isSuperAdmin) - Number(a.isSuperAdmin) || Number(b.isAdmin) - Number(a.isAdmin) || (b.lastLoginAt || 0) - (a.lastLoginAt || 0));

      const tripsList = Object.values(db.trips)
        .map(t => {
          const owner = db.users[t.ownerId];
          const tripShares = db.shares.filter(s => s.tripId === t.id && s.status !== "declined");
          const tripAtts = Object.values(db.attachments).filter(a => a.tripId === t.id);
          return {
            id: t.id,
            name: t.name,
            mode: getTripMode(t),
            isDemoTrip: Boolean(t.isDemoTrip || owner?.isDemo),
            ownerId: t.ownerId,
            ownerName: owner ? owner.name : "Usuário removido",
            ownerEmail: owner ? owner.email : "",
            createdAt: t.createdAt || null,
            updatedAt: t.updatedAt || null,
            revision: t.revision || 1,
            activitiesCount: Array.isArray(t.data?.activities) ? t.data.activities.length : 0,
            sharesCount: tripShares.length,
            attachmentsCount: tripAtts.length,
            data: t.data
          };
        })
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      const allAdminEmails = [...new Set([...SUPER_ADMIN_EMAILS, ...(db.admins || [])])];
      const adminsList = allAdminEmails.map(em => {
        const u = Object.values(db.users).find(usr => usr.email === em);
        return {
          email: em,
          isSuperAdmin: isSuperAdminEmail(em),
          registered: Boolean(u),
          userId: u ? u.id : null,
          name: u ? u.name : "",
          hasGoogle: Boolean(u?.googleSub),
          lastLoginAt: u?.lastLoginAt || u?.createdAt || null
        };
      });

      const allAtts = Object.values(db.attachments || {});
      const stats = {
        totalUsers: usersList.length,
        googleUsers: usersList.filter(u => u.hasGoogle).length,
        passwordUsers: usersList.filter(u => u.hasPassword).length,
        demoUsers: usersList.filter(u => u.isDemo).length,
        totalTrips: tripsList.length,
        totalActivities: tripsList.reduce((sum, t) => sum + t.activitiesCount, 0),
        totalShares: db.shares.length,
        acceptedShares: db.shares.filter(s => s.status === "accepted").length,
        pendingShares: db.shares.filter(s => s.status === "pending").length,
        totalAttachments: allAtts.length,
        totalAttachmentBytes: allAtts.reduce((sum, a) => sum + (Number(a.size) || 0), 0),
        delegatedAdminsCount: (db.admins || []).filter(e => !isSuperAdminEmail(e)).length
      };

      const sharesList = db.shares.map(s => {
        const tr = db.trips[s.tripId];
        const owner = db.users[s.ownerId];
        return {
          id: s.id,
          tripId: s.tripId,
          tripName: tr ? tr.name : "(Removida)",
          ownerName: owner ? owner.name : "Usuário",
          ownerEmail: owner ? owner.email : "",
          targetEmail: s.targetEmail,
          role: s.role || "editor",
          status: s.status,
          createdAt: s.createdAt
        };
      });

      return sendJson(res, 200, {
        ok: true,
        isSuperAdmin: isSuperAdminEmail(auth.user.email),
        stats,
        admins: adminsList,
        users: usersList,
        trips: tripsList,
        shares: sharesList
      });
    }

    const adminUserMatch = pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_]+)$/);
    if (adminUserMatch && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isAdminUser(auth.user)) return sendJson(res, 403, { ok: false, error: "Acesso restrito a administradores." });

      const target = db.users[adminUserMatch[1]];
      if (!target) return sendJson(res, 404, { ok: false, error: "Usuário não encontrado." });

      const mapTripFull = (t, extra = {}) => {
        const atts = Object.values(db.attachments || {})
          .filter(a => a.tripId === t.id)
          .map(a => ({ id: a.id, activityId: a.activityId, fileName: a.fileName, mimeType: a.mimeType, size: a.size, createdAt: a.createdAt }));
        const shares = db.shares
          .filter(s => s.tripId === t.id)
          .map(s => ({ id: s.id, targetEmail: s.targetEmail, role: s.role, status: s.status, createdAt: s.createdAt }));
        return {
          id: t.id,
          name: t.name,
          mode: getTripMode(t),
          isDemoTrip: Boolean(t.isDemoTrip),
          createdAt: t.createdAt || null,
          updatedAt: t.updatedAt || null,
          revision: t.revision || 1,
          data: t.data,
          attachments: atts,
          shares,
          ...extra
        };
      };

      const ownTrips = Object.values(db.trips)
        .filter(t => t.ownerId === target.id)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        .map(t => mapTripFull(t, { role: "owner", ownerName: target.name, ownerEmail: target.email }));

      const sharedTrips = db.shares
        .filter(s => s.status !== "declined" && (s.targetUserId === target.id || s.targetEmail === target.email))
        .map(s => {
          const t = db.trips[s.tripId];
          if (!t) return null;
          const owner = db.users[t.ownerId];
          return mapTripFull(t, {
            role: s.role || "editor",
            shareStatus: s.status,
            ownerName: owner ? owner.name : "Usuário",
            ownerEmail: owner ? owner.email : ""
          });
        })
        .filter(Boolean);

      return sendJson(res, 200, {
        ok: true,
        user: buildAdminUserSummary(target),
        ownTrips,
        sharedTrips
      });
    }

    if (adminUserMatch && req.method === "DELETE") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isSuperAdminEmail(auth.user.email)) {
        return sendJson(res, 403, { ok: false, error: "Apenas o Super Admin pode excluir contas de usuários." });
      }
      const target = db.users[adminUserMatch[1]];
      if (!target) return sendJson(res, 404, { ok: false, error: "Usuário não encontrado." });
      if (target.id === auth.user.id || isSuperAdminEmail(target.email)) {
        return sendJson(res, 400, { ok: false, error: "Não é permitido excluir o Super Admin principal." });
      }

      const ownedTrips = Object.values(db.trips).filter(t => t.ownerId === target.id);
      for (const tr of ownedTrips) {
        for (const [attId, att] of Object.entries(db.attachments || {})) {
          if (att.tripId === tr.id) {
            try { fs.unlinkSync(path.join(UPLOADS_DIR, attId)); } catch {}
            delete db.attachments[attId];
          }
        }
        db.shares = db.shares.filter(s => s.tripId !== tr.id);
        delete db.trips[tr.id];
      }
      db.shares = db.shares.filter(s => s.targetUserId !== target.id && s.targetEmail !== target.email);
      for (const [sid, s] of Object.entries(db.sessions || {})) {
        if (s.userId === target.id) delete db.sessions[sid];
      }
      for (const [rk, r] of Object.entries(db.passwordResets || {})) {
        if (r.userId === target.id) delete db.passwordResets[rk];
      }
      db.admins = (db.admins || []).filter(e => e !== target.email);
      auditLog("admin.user_delete", { userId: auth.user.id, email: auth.user.email, ip: getClientIp(req), detail: `Excluiu ${target.email}` });
      delete db.users[target.id];
      saveDb();
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/admin/delegates" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isSuperAdminEmail(auth.user.email)) {
        return sendJson(res, 403, { ok: false, error: "Apenas o Super Admin pode delegar ou remover administradores." });
      }
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const action = body.action === "remove" ? "remove" : "add";
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return sendJson(res, 400, { ok: false, error: "Informe um e-mail válido." });
      }
      if (isSuperAdminEmail(email)) {
        return sendJson(res, 400, { ok: false, error: "O Super Admin principal já possui privilégios permanentes." });
      }
      db.admins = Array.isArray(db.admins) ? db.admins : [];
      if (action === "add") {
        if (!db.admins.includes(email)) db.admins.push(email);
      } else {
        db.admins = db.admins.filter(e => e !== email);
      }
      auditLog("admin.delegate", { userId: auth.user.id, email: auth.user.email, ip: getClientIp(req), detail: `${action}: ${email}` });
      saveDb();
      return sendJson(res, 200, { ok: true, admins: db.admins });
    }

    if (pathname === "/api/admin/seed-demo" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isAdminUser(auth.user)) return sendJson(res, 403, { ok: false, error: "Acesso restrito a administradores." });
      const seeded = ensureAdminSeedDemoData(auth.user, true);
      auditLog("admin.seed_demo", { userId: auth.user.id, email: auth.user.email, ip: getClientIp(req) });
      saveDb();
      return sendJson(res, 200, { ok: true, ...(seeded || {}) });
    }

    if (pathname === "/api/admin/audit" && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isAdminUser(auth.user)) return sendJson(res, 403, { ok: false, error: "Acesso restrito a administradores." });
      const limit = Math.min(250, Math.max(10, parseInt(url.searchParams.get("limit") || "120", 10) || 120));
      return sendJson(res, 200, {
        ok: true,
        logs: (db.auditLogs || []).slice(0, limit),
        total: (db.auditLogs || []).length
      });
    }

    if (pathname === "/api/admin/system-settings" && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isSuperAdminEmail(auth.user.email)) {
        return sendJson(res, 403, { ok: false, error: "Apenas o Super Admin principal gerencia credenciais globais." });
      }
      const sys = getGlobalConfig();
      const raw = db.systemSettings || {};
      return sendJson(res, 200, {
        ok: true,
        encryption: "aes-256-gcm",
        hasMasterKeyEnv: String(process.env.MASTER_KEY || "").trim().length >= 32,
        settings: {
          googleClientId: sys.googleClientId || "",
          googleLoginClientId: sys.googleLoginClientId || "",
          googleClientSecretHint: sys.googleClientSecret ? maskKeyHint(sys.googleClientSecret) : "",
          hasGoogleClientSecret: Boolean(sys.googleClientSecret),
          geminiHint: sys.geminiKey ? maskKeyHint(sys.geminiKey) : "",
          hasGemini: Boolean(sys.geminiKey),
          gmapsHint: sys.gmapsKey ? maskKeyHint(sys.gmapsKey) : "",
          hasMaps: Boolean(sys.gmapsKey),
          walletIssuerId: sys.walletIssuerId || "",
          hasWalletSaJson: Boolean(sys.walletSaJson),
          smtpHost: sys.smtpHost || "",
          smtpPort: String(sys.smtpPort || 587),
          smtpSecure: String(sys.smtpSecure || ""),
          smtpUser: sys.smtpUser || "",
          hasSmtpPass: Boolean(sys.smtpPass),
          smtpPassHint: sys.smtpPass ? maskKeyHint(sys.smtpPass) : "",
          smtpFrom: sys.smtpFrom || "",
          hasResendApiKey: Boolean(sys.resendApiKey),
          resendHint: sys.resendApiKey ? maskKeyHint(sys.resendApiKey) : "",
          appBaseUrl: sys.appBaseUrl || "",
          vaultHasGoogleClientSecret: Boolean(raw.googleClientSecretEnc),
          vaultHasGemini: Boolean(raw.geminiKeyEnc),
          vaultHasMaps: Boolean(raw.gmapsKeyEnc),
          vaultHasWalletSaJson: Boolean(raw.walletSaJsonEnc),
          vaultHasSmtpPass: Boolean(raw.smtpPassEnc),
          vaultHasResend: Boolean(raw.resendApiKeyEnc)
        },
        sources: sys.sources
      });
    }

    if (pathname === "/api/admin/system-settings" && req.method === "PUT") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isSuperAdminEmail(auth.user.email)) {
        return sendJson(res, 403, { ok: false, error: "Apenas o Super Admin principal altera credenciais globais." });
      }
      const body = await readBody(req);
      db.systemSettings = db.systemSettings || {};
      const sys = db.systemSettings;

      const setPlain = (field, maxLen = 200) => {
        if (typeof body[field] === "string") sys[field] = body[field].trim().slice(0, maxLen);
      };
      const setSecret = (bodyField, clearField, encField) => {
        if (body[clearField]) {
          delete sys[encField];
        } else if (typeof body[bodyField] === "string" && !isMaskedSecret(body[bodyField])) {
          sys[encField] = encryptSecret(body[bodyField].trim());
        }
      };

      setPlain("googleClientId", 240);
      setPlain("googleLoginClientId", 240);
      setPlain("walletIssuerId", 120);
      setPlain("smtpHost", 180);
      if (body.smtpPort !== undefined) {
        const p = parseInt(body.smtpPort, 10);
        sys.smtpPort = Number.isFinite(p) && p > 0 && p <= 65535 ? String(p) : "";
      }
      setPlain("smtpSecure", 16);
      setPlain("smtpUser", 180);
      setPlain("smtpFrom", 180);
      if (typeof body.appBaseUrl === "string") {
        sys.appBaseUrl = body.appBaseUrl.trim().replace(/\/+$/, "").slice(0, 240);
      }

      setSecret("googleClientSecret", "clearGoogleClientSecret", "googleClientSecretEnc");
      setSecret("geminiKey", "clearGeminiKey", "geminiKeyEnc");
      setSecret("gmapsKey", "clearGmapsKey", "gmapsKeyEnc");
      setSecret("walletSaJson", "clearWalletSaJson", "walletSaJsonEnc");
      setSecret("smtpPass", "clearSmtpPass", "smtpPassEnc");
      setSecret("resendApiKey", "clearResendApiKey", "resendApiKeyEnc");

      auditLog("admin.credentials_update", { userId: auth.user.id, email: auth.user.email, ip: getClientIp(req), detail: "Cofre de credenciais atualizado (AES-256-GCM)" });
      saveDb();
      return sendJson(res, 200, { ok: true, message: "Credenciais globais criptografadas e salvas com segurança." });
    }

    if (pathname === "/api/admin/test-smtp" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isSuperAdminEmail(auth.user.email)) {
        return sendJson(res, 403, { ok: false, error: "Apenas o Super Admin pode testar envio de e-mail global." });
      }
      const body = await readBody(req);
      const to = String(body.to || auth.user.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return sendJson(res, 400, { ok: false, error: "Informe um e-mail destinatário válido." });
      }
      if (!isEmailTransportConfigured()) {
        return sendJson(res, 503, { ok: false, error: "Nenhum transporte de e-mail (SMTP, Resend ou sendmail) configurado." });
      }
      try {
        const result = await sendTransactionalEmail({
          to,
          subject: "My Plan — Teste de E-mail / SMTP",
          text: `Teste de envio concluído com sucesso em ${new Date().toLocaleString("pt-BR")}.`,
          html: `<p>Teste de envio do <b>My Plan</b> concluído com sucesso em ${new Date().toLocaleString("pt-BR")}.</p>`
        });
        auditLog("admin.test_smtp", { userId: auth.user.id, email: auth.user.email, ip: getClientIp(req), detail: `Enviado via ${result.transport} para ${maskEmail(to)}` });
        saveDb();
        return sendJson(res, 200, { ok: true, transport: result.transport, to });
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message || "Falha ao enviar e-mail de teste." });
      }
    }

    if (pathname === "/api/admin/backups" && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isSuperAdminEmail(auth.user.email)) {
        return sendJson(res, 403, { ok: false, error: "Apenas o Super Admin principal gerencia backups do banco." });
      }
      return sendJson(res, 200, { ok: true, backups: listBackups() });
    }

    if (pathname === "/api/admin/backups" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isSuperAdminEmail(auth.user.email)) {
        return sendJson(res, 403, { ok: false, error: "Apenas o Super Admin principal cria backups do banco." });
      }
      const meta = createBackup("manual");
      auditLog("backup.create", { userId: auth.user.id, email: auth.user.email, ip: getClientIp(req), detail: meta.filename });
      saveDb();
      return sendJson(res, 201, { ok: true, backup: meta, backups: listBackups() });
    }

    const backupDlMatch = pathname.match(/^\/api\/admin\/backups\/([a-zA-Z0-9._-]+)\/download$/);
    if (backupDlMatch && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      if (!isSuperAdminEmail(auth.user.email)) {
        return sendJson(res, 403, { ok: false, error: "Apenas o Super Admin principal pode baixar backups." });
      }
      const found = resolveBackupFileSafe(backupDlMatch[1]);
      if (!found) return sendJson(res, 404, { ok: false, error: "Backup não encontrado." });
      const stat = fs.statSync(found.resolved);
      res.writeHead(200, applySecurityHeaders(res, {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${found.filename}"`,
        "Content-Length": stat.size,
        "Cache-Control": "no-store"
      }));
      return fs.createReadStream(found.resolved).pipe(res);
    }

    if (pathname === "/api/crossings" && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const user = auth.user;

      const ownFull = Object.values(db.trips)
        .filter(t => t.ownerId === user.id && getTripMode(t) === "personal")
        .map(t => ({
          id: t.id,
          name: t.name,
          role: "owner",
          isShared: db.shares.some(sh => sh.tripId === t.id && sh.status !== "declined"),
          ownerName: user.name,
          ownerEmail: user.email,
          data: t.data
        }));

      const sharedFull = db.shares
        .filter(s => s.status === "accepted" && (s.targetUserId === user.id || s.targetEmail === user.email))
        .map(s => {
          const t = db.trips[s.tripId];
          if (!t || getTripMode(t) !== "personal") return null;
          const owner = db.users[t.ownerId];
          return {
            id: t.id,
            name: t.name,
            role: s.role || "viewer",
            isShared: true,
            ownerName: owner ? owner.name : "Usuário",
            ownerEmail: owner ? owner.email : "",
            data: t.data
          };
        })
        .filter(Boolean);

      return sendJson(res, 200, { ok: true, trips: [...ownFull, ...sharedFull] });
    }

    if (pathname === "/api/trips" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const body = await readBody(req);
      const mode = (body.mode === "professional" || body.data?.mode === "professional") ? "professional" : "personal";
      const name = String(body.name || "").trim() || (mode === "professional" ? "Novo Projeto" : "Nova Viagem");
      if (!body.data || !Array.isArray(body.data.activities)) {
        return sendJson(res, 400, { ok: false, error: "Dados do planejamento inválidos." });
      }
      body.data.mode = mode;
      const tripId = uid("t_");
      const now = Date.now();
      db.trips[tripId] = {
        id: tripId,
        name,
        mode,
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
      if (!trip) return sendJson(res, 404, { ok: false, error: "Planejamento não encontrado." });
      const access = getTripAccess(trip, auth.user);
      if (!access) return sendJson(res, 403, { ok: false, error: "Sem permissão neste planejamento." });

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
            mode: getTripMode(trip),
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
        const nextMode = (body.mode === "professional" || body.data?.mode === "professional")
          ? "professional"
          : (body.mode === "personal" || body.data?.mode === "personal" ? "personal" : getTripMode(trip));
        trip.mode = nextMode;
        if (body.data && Array.isArray(body.data.activities)) {
          body.data.mode = nextMode;
          trip.data = body.data;
        }
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
      const isAdminRead = req.method === "GET" && isAdminUser(auth.user);
      if (!access && !isAdminRead) return sendJson(res, 403, { ok: false, error: "Sem permissão." });

      if (req.method === "GET") {
        const uploadsBase = path.resolve(UPLOADS_DIR) + path.sep;
        const filePath = path.resolve(UPLOADS_DIR, att.id);
        if (!filePath.startsWith(uploadsBase) || !fs.existsSync(filePath)) {
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

      if (req.method === "PATCH") {
        if (access !== "owner" && access !== "editor") {
          return sendJson(res, 403, { ok: false, error: "Sem permissão para renomear." });
        }
        const body = await readBody(req);
        const rawName = String(body.fileName || "").trim();
        if (!rawName) return sendJson(res, 400, { ok: false, error: "Nome do arquivo inválido." });
        att.fileName = safeFileName(rawName);
        saveDb();
        return sendJson(res, 200, { ok: true, attachment: att });
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

    /* ---------- GEMINI AI (TRANSCRIÇÃO DE ÁUDIO + PLANEJAMENTO + IMPORTAR CALENDÁRIO POR IMAGEM) ---------- */
    if (pathname === "/api/ai/transcribe" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      if (!creds.geminiKey) {
        return sendJson(res, 412, { ok: false, error: "GEMINI_NOT_CONFIGURED", message: "Configure sua Gemini API Key uma única vez na Central de Integrações." });
      }
      const body = await readBody(req);
      const audioPart = parseGeminiMediaPart(body.audio);
      if (!audioPart) {
        return sendJson(res, 400, { ok: false, error: "Áudio vazio ou inválido." });
      }
      const lang = String(body.language || "pt-BR").slice(0, 16);
      const parts = [
        {
          text: `Transcreva com máxima fidelidade o áudio anexo (idioma principal esperado: ${lang}). Não invente absolutamente nada que não tenha sido falado no áudio.`
        },
        audioPart
      ];
      const sysTranscribe = `Você é um motor de transcrição exata de voz do aplicativo My Plan.
Ouça atentamente o áudio enviado e transcreva palavra por palavra tudo que foi falado pelo usuário (mantendo datas, horários, cidades, nomes próprios, clientes, valores em reais e tarefas exatamente como ditos).
REGRAS INVIOLÁVEIS:
1. Se o áudio estiver mudo, apenas ruído estático, vazio ou completamente incompreensível, retorne audible=false, transcript="" e warning explicando que nenhuma fala compreensível foi captada no microfone.
2. NUNCA invente, complete ou adivinhe frases ou viagens/projetos que não estão claramente no áudio.
Retorne EXCLUSIVAMENTE JSON válido:
{
  "audible": true,
  "transcript": "Texto exato transcrito do que o usuário falou.",
  "warning": ""
}`;
      try {
        const out = await callGeminiJSON(creds.geminiKey, parts, sysTranscribe);
        const transcript = String(out?.transcript || "").trim();
        const audible = Boolean(out?.audible !== false && transcript.length > 0);
        const warning = String(out?.warning || (!audible ? "Áudio silencioso ou sem fala compreensível. Verifique o microfone e grave novamente." : "")).trim();
        return sendJson(res, 200, { ok: true, audible, transcript: audible ? transcript : "", warning });
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: err.message || "Falha ao transcrever áudio com Gemini AI." });
      }
    }

    if (pathname === "/api/ai/import-calendar" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      if (!creds.geminiKey) {
        return sendJson(res, 412, { ok: false, error: "GEMINI_NOT_CONFIGURED", message: "Configure sua Gemini API Key uma única vez na Central de Integrações." });
      }
      const body = await readBody(req);
      const mediaParts = Array.isArray(body.media)
        ? body.media.slice(0, 10).map(parseGeminiMediaPart).filter(Boolean)
        : [];
      if (!mediaParts.length) {
        return sendJson(res, 400, { ok: false, error: "Envie ao menos uma imagem ou PDF de calendário para analisar." });
      }
      const isPro = body.mode === "professional";
      const todayIso = String(body.baseDate || new Date().toISOString().slice(0, 10));
      const userHint = String(body.hint || "").trim();
      const parts = [
        {
          text: `Data de referência hoje: ${todayIso}. Modo atual do usuário: ${isPro ? "Profissional" : "Pessoal"}.${userHint ? ` Contexto informado pelo usuário: ${userHint}.` : ""} Analise TODAS as imagens/PDFs anexos (planilha Excel, calendário personalizado, agenda impressa, grade semanal/mensal, cronograma de trabalho/viagem) e extraia TODOS os eventos e datas visíveis com precisão absoluta.`
        },
        ...mediaParts
      ];
      const validTypes = isPro
        ? "Desenvolvimento | Reunião | Viagem | Recebimento | Despesa | Entrega | Marco | Proposta | Outro"
        : "Viagem | Voo | Trem | Ônibus | Navio | Hospedagem | Ingresso | Evento | Passeio | Restaurante | Período | Outro";
      const sysImportCal = `Você é o extrator visual de calendários do aplicativo My Plan.
O usuário enviou 1 ou mais imagens/PDFs contendo um calendário ou cronograma (ex.: planilha Excel, tabela de datas, calendário de parede/mensal, print de agenda, Trello, Notion, roteiro ou cronograma customizado).
Leia CADA linha, célula, coluna ou bloco de data nas imagens e extraia TODOS os eventos encontrados em ordem cronológica.
Regras:
1. Converta todas as datas identificadas para YYYY-MM-DD (se o ano não estiver explícito, infira o ano mais lógico em torno de ${todayIso} e avise em "warnings" se assumiu o ano).
2. Se um evento ocupar vários dias consecutivos (ex.: faixa/bloco em calendário ou início e fim na planilha), preencha start e end corretamente. Se for pontual no mesmo dia, end = start.
3. Use APENAS tipos válidos em "type": ${validTypes}.
4. Se houver horário explícito, preencha startTime / endTime em "HH:MM". Se houver valor monetário explícito, informe "finDirection" ("income" ou "expense") e "amount" numérico.
5. Nunca invente eventos que não existam nas imagens. Se algum trecho estiver ilegível, registre em "warnings".
Retorne EXCLUSIVAMENTE JSON válido:
{
  "suggestedName": "Nome sugerido para este calendário",
  "detectedPeriod": "Período detectado (ex: Março a Abril de 2027)",
  "summary": "Resumo claro do que foi encontrado nas imagens",
  "warnings": [],
  "events": [
    {
      "name": "Nome do evento/atividade",
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "startTime": "",
      "endTime": "",
      "type": "Outro",
      "location": "",
      "client": "",
      "finDirection": "none",
      "amount": 0,
      "notes": ""
    }
  ]
}`;
      try {
        const raw = await callGeminiJSON(creds.geminiKey, parts, sysImportCal);
        const isoRe = /^\d{4}-\d{2}-\d{2}$/;
        const rawEvents = Array.isArray(raw?.events) ? raw.events : [];
        const events = rawEvents
          .filter(ev => ev && (ev.name || ev.start))
          .map(ev => {
            const start = isoRe.test(String(ev.start || "").trim()) ? String(ev.start).trim() : todayIso;
            const endRaw = isoRe.test(String(ev.end || "").trim()) ? String(ev.end).trim() : start;
            const end = endRaw < start ? start : endRaw;
            return {
              name: String(ev.name || "Evento importado").trim().slice(0, 140),
              start,
              end,
              startTime: /^\d{2}:\d{2}/.test(String(ev.startTime || "")) ? String(ev.startTime).slice(0, 5) : "",
              endTime: /^\d{2}:\d{2}/.test(String(ev.endTime || "")) ? String(ev.endTime).slice(0, 5) : "",
              type: String(ev.type || "Outro").trim(),
              location: String(ev.location || "").trim().slice(0, 160),
              client: String(ev.client || "").trim().slice(0, 120),
              finDirection: ["income", "expense", "none"].includes(ev.finDirection) ? ev.finDirection : "none",
              amount: Math.max(0, Number(ev.amount) || 0),
              notes: String(ev.notes || "").trim().slice(0, 500)
            };
          })
          .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
        return sendJson(res, 200, {
          ok: true,
          result: {
            suggestedName: String(raw?.suggestedName || "Calendário Importado").trim().slice(0, 90),
            detectedPeriod: String(raw?.detectedPeriod || "").trim().slice(0, 120),
            summary: String(raw?.summary || `${events.length} evento(s) identificado(s).`).trim().slice(0, 320),
            warnings: Array.isArray(raw?.warnings) ? raw.warnings.map(w => String(w || "").trim()).filter(Boolean).slice(0, 8) : [],
            events
          }
        });
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: err.message || "Falha ao analisar imagens do calendário com IA." });
      }
    }

    if (pathname === "/api/ai/plan-trip" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      if (!creds.geminiKey) {
        return sendJson(res, 412, { ok: false, error: "GEMINI_NOT_CONFIGURED", message: "Configure sua Gemini API Key uma única vez na Central de Integrações." });
      }
      const body = await readBody(req);
      const isPro = body.mode === "professional";
      const todayIso = String(body.baseDate || new Date().toISOString().slice(0, 10));
      const userPrompt = String(body.prompt || "").trim();
      const parts = [{
        text: `Data de referência hoje: ${todayIso}.
Instruções e/ou transcrição fiel do usuário: ${userPrompt || (isPro ? "Analise rigorosamente os áudios e imagens anexos para estruturar o projeto solicitado." : "Analise rigorosamente os áudios e imagens anexos para criar o planejamento solicitado.")}
REGRA CRÍTICA: Siga EXCLUSIVAMENTE o que o usuário pediu no texto e nos áudios/imagens anexos. NUNCA invente destinos, empresas, valores ou datas aleatórias sem base nas entradas fornecidas.`
      }];
      if (Array.isArray(body.media)) {
        body.media.slice(0, 10).forEach(m => {
          const p = parseGeminiMediaPart(m);
          if (p) parts.push(p);
        });
      }
      const sysPrompt = isPro
        ? `Você é o arquiteto executivo de projetos do aplicativo My Plan (Modo Profissional).
Analise TODOS os áudios, imagens (propostas, contratos, notas fiscais, pautas de reunião, passagens corporativas) e textos enviados pelo usuário.
Baseie-se ESTRITAMENTE nas solicitações reais do usuário (sem inventar projetos genéricos ou dados aleatórios não solicitados).
Retorne EXCLUSIVAMENTE um JSON válido com esta estrutura exata:
{
  "tripName": "Nome claro do projeto ou agenda profissional (ex: Lançamento App Mobile Q4)",
  "mode": "professional",
  "params": {
    "revenueTarget": 0,
    "costBudget": 0,
    "taxRatePct": 0
  },
  "activities": [
    {
      "type": "Desenvolvimento | Reunião | Viagem | Recebimento | Despesa | Entrega | Marco | Proposta | Outro",
      "columnId": "backlog | todo | doing | review | done",
      "name": "Título curto e objetivo do cartão",
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "startTime": "HH:MM (opcional)",
      "endTime": "HH:MM (opcional)",
      "priority": "Crítica | Alta | Média | Baixa",
      "progress": 0,
      "client": "Cliente ou stakeholder",
      "assignee": "Responsável",
      "location": "Local, sala ou link de reunião",
      "finDirection": "income | expense | none",
      "amount": 0,
      "finStatus": "Previsto | Liquidado",
      "subtasks": [{ "text": "Subtarefa objetiva", "done": false }],
      "notes": "Escopo, entregáveis e observações relevantes"
    }
  ],
  "checklist": [
    { "cat": "Escopo | Financeiro | Operacional | Entrega | Viagem", "item": "Tarefa importante", "prio": "Alta | Média | Baixa", "notes": "" }
  ]
}
Regras: Converta datas relativas usando ${todayIso} no formato YYYY-MM-DD. Se o item for um recebimento/faturamento use type="Recebimento" e finDirection="income". Se for despesa/pagamento/passagem use finDirection="expense".`
        : `Você é o planejador especialista do aplicativo My Plan.
Analise TODOS os áudios, imagens (passagens aéreas, cruzeiros/navios, ingressos, reservas de hotel, documento CRLV de carro) e textos enviados pelo usuário.
Baseie-se ESTRITAMENTE nas solicitações reais do usuário — NUNCA crie uma viagem aleatória diferente do que o usuário ditou/escreveu ou anexou.
Retorne EXCLUSIVAMENTE um JSON válido com esta estrutura exata:
{
  "tripName": "Nome claro do planejamento/viagem baseado exclusivamente no pedido",
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
      "type": "Viagem | Voo | Trem | Ônibus | Navio | Hospedagem | Ingresso | Evento | Passeio | Restaurante | Período | Outro",
      "name": "Nome curto da atividade",
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "startTime": "HH:MM (se houver horário)",
      "from": "Cidade/Aeroporto/Estação/Porto origem (se Viagem, Voo, Trem, Ônibus ou Navio)",
      "to": "Cidade/Aeroporto/Estação/Porto destino (se Viagem, Voo, Trem, Ônibus ou Navio)",
      "airline": "Companhia aérea / Navio / Empresa + nº voo ou linha se houver",
      "km": 0,
      "drive": 0,
      "toll": 0,
      "extraCost": 0,
      "bookingRef": "Código localizador/cabine/voucher se houver",
      "qrPayload": "Conteúdo exato do QR Code / código de barras / BCBP se legível na imagem, senão vazio",
      "qrFormat": "qr_code | aztec | pdf417 | code_128 | ",
      "notes": "Detalhes úteis (horários, assento, portão, cabine, endereço, dicas)"
    }
  ],
  "checklist": [
    { "cat": "Categoria", "item": "Tarefa importante", "prio": "Alta | Média | Baixa", "notes": "" }
  ]
}
Regras: "drive" é em MINUTOS de direção (somente para type="Viagem"). Converta datas relativas usando ${todayIso} no formato YYYY-MM-DD. Se extrair passagens aéreas, marítimas, ingressos ou hotéis das imagens, identifique o type exato, preencha valores em extraCost, localizadores em bookingRef, qrPayload (se legível) e todas as datas.`;

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
      const todayIso = String(body.baseDate || new Date().toISOString().slice(0, 10));
      const detectedBarcode = (body.detectedBarcode && body.detectedBarcode.rawValue)
        ? {
            rawValue: String(body.detectedBarcode.rawValue).slice(0, 1200),
            format: String(body.detectedBarcode.format || "qr_code").slice(0, 40)
          }
        : null;
      const barcodeHint = detectedBarcode
        ? `\nCódigo de barras/QR detectado no bilhete (${detectedBarcode.format}): ${detectedBarcode.rawValue}`
        : "";
      const isPro = body.mode === "professional";
      const parts = [{ text: `Data de referência hoje: ${todayIso}. Extraia todos os dados completos ${isPro ? "do cartão profissional (tarefa, desenvolvimento, reunião, viagem corporativa, recebimento, despesa, entrega ou marco)" : "de atividade/passagem/bilhete/reserva/viagem"} desta entrada (imagem, áudio, PDF ou texto): ${String(body.prompt || "").trim()}${barcodeHint}` }];
      if (Array.isArray(body.media)) {
        body.media.slice(0, 4).forEach(m => {
          const p = parseGeminiMediaPart(m);
          if (p) parts.push(p);
        });
      }
      try {
        const sysAnalyze = isPro
          ? `Você é especialista em produtividade executiva e extração de dados para o My Plan (Modo Profissional).
Analise áudios, textos, prints de contratos, notas fiscais, convites de reunião e passagens corporativas. Converta datas relativas usando ${todayIso} para YYYY-MM-DD e retorne JSON:
{
  "type": "Desenvolvimento | Reunião | Viagem | Recebimento | Despesa | Entrega | Marco | Proposta | Outro",
  "columnId": "backlog | todo | doing | review | done",
  "name": "Título curto e claro do cartão",
  "start": "YYYY-MM-DD",
  "end": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "priority": "Crítica | Alta | Média | Baixa",
  "progress": 0,
  "client": "Cliente ou empresa",
  "assignee": "Responsável",
  "location": "Local, sala ou link da reunião",
  "finDirection": "income | expense | none",
  "amount": 0,
  "finStatus": "Previsto | Liquidado",
  "subtasks": [{ "text": "Subtarefa", "done": false }],
  "notes": "Detalhes, pauta ou escopo"
}`
          : `Você é especialista em leitura de áudios falados, textos, tickets aéreos, cartões de embarque, reservas de navio/cruzeiro, trem, ônibus, hotéis e ingressos para o My Plan.
Interprete automaticamente o meio de transporte ou tipo da atividade ("Voo" para passagem aérea/embarque, "Navio" para cruzeiro/balsa/barco, "Trem", "Ônibus", "Viagem", "Hospedagem", "Ingresso", "Evento", etc.), converta datas relativas usando ${todayIso} para YYYY-MM-DD, e preencha TODOS os campos identificados em JSON:
{
  "type": "Viagem | Voo | Trem | Ônibus | Navio | Hospedagem | Ingresso | Evento | Passeio | Restaurante | Período | Outro",
  "name": "Título curto e claro (ex: Voo LATAM BSB-GRU ou Cruzeiro MSC Santos-Ilhabela)",
  "start": "YYYY-MM-DD (data da saída / início)",
  "end": "YYYY-MM-DD (data da chegada / fim — igual a start salvo se chegar/terminar em outro dia)",
  "startTime": "HH:MM (horário de saída/embarque se houver)",
  "from": "Aeroporto/Porto/Estação/Cidade de origem (se Viagem, Voo, Trem, Ônibus ou Navio)",
  "to": "Aeroporto/Porto/Estação/Cidade de destino (se Viagem, Voo, Trem, Ônibus ou Navio)",
  "airline": "Companhia aérea + nº do voo, navio/companhia ou viação se houver",
  "km": 0,
  "drive": 0,
  "extraCost": 0,
  "tickets": [{ "label": "Descrição tarifa/ingresso se detalhado", "qty": 1, "unitPrice": 0 }],
  "bookingRef": "Código localizador / PNR / cabine / número do ticket",
  "qrPayload": "Texto completo legível do QR Code / Aztec / PDF417 / código de barras do ticket se houver, senão vazio",
  "qrFormat": "qr_code | aztec | pdf417 | code_128 | ",
  "notes": "Horários, terminal/portão, assento, cabine, franquia de bagagem, endereço ou detalhes importantes"
}`;
        const activity = await callGeminiJSON(creds.geminiKey, parts, sysAnalyze);
        if (detectedBarcode && activity && typeof activity === "object") {
          if (!activity.qrPayload) activity.qrPayload = detectedBarcode.rawValue;
          if (!activity.qrFormat) activity.qrFormat = detectedBarcode.format;
        }
        return sendJson(res, 200, { ok: true, activity });
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: err.message || "Erro ao analisar atividade com IA." });
      }
    }

    /* ---------- IA MULTI-BILHETES DE VIAGEM (EXTRATOR INCREMENTAL DE TRECHOS) ---------- */
    if (pathname === "/api/ai/analyze-tickets" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      if (!creds.geminiKey) {
        return sendJson(res, 412, { ok: false, error: "GEMINI_NOT_CONFIGURED", message: "Configure sua Gemini API Key na Central de Integrações ou Parâmetros." });
      }
      const body = await readBody(req);
      const todayIso = String(body.baseDate || new Date().toISOString().slice(0, 10));
      const mediaList = Array.isArray(body.media) ? body.media.slice(0, 8) : [];
      if (!mediaList.length) {
        return sendJson(res, 400, { ok: false, error: "Envie ao menos 1 bilhete (PDF ou imagem) para leitura por IA." });
      }
      const fileNames = Array.isArray(body.fileNames) ? body.fileNames.slice(0, 8).map(n => String(n || "")) : [];
      const existingCtx = body.existingContext && typeof body.existingContext === "object" ? body.existingContext : {};
      const existingSummary = Array.isArray(existingCtx.segments) && existingCtx.segments.length
        ? `\nCONTEXTO JÁ REGISTRADO NO CARTÃO (NÃO repita estes trechos na saída, extraia APENAS os novos arquivos enviados e use o contexto apenas para diferenciar se o novo arquivo é Ida, Conexão ou Volta):\n${JSON.stringify(existingCtx.segments.slice(0, 12))}`
        : "";
      const eventCtx = (existingCtx.eventStart || existingCtx.eventEnd || existingCtx.location)
        ? `\nDados do evento vinculado: Início=${existingCtx.eventStart || "?"}, Fim=${existingCtx.eventEnd || "?"}, Destino/Local=${existingCtx.location || "?"}.`
        : "";
      const fileIdxHint = fileNames.length
        ? `\nArquivos enviados nesta chamada (use fileIndex 0..${fileNames.length - 1}): ${fileNames.map((n, i) => `[${i}] ${n}`).join(", ")}`
        : "";
      const parts = [{
        text: `Data de referência hoje: ${todayIso}. Analise TODOS os bilhetes/passagens/cartões de embarque anexados nesta chamada.${eventCtx}${fileIdxHint}${existingSummary}`
      }];
      mediaList.forEach(m => {
        const p = parseGeminiMediaPart(m);
        if (p) parts.push(p);
      });

      const sysTickets = `Você é um especialista em leitura de passagens aéreas, rodoviárias, ferroviárias e cartões de embarque (PDFs e imagens) para o My Plan.
Você pode receber 1 ou vários bilhetes simultaneamente (ida, conexões e volta).
Analise CADA arquivo enviado e retorne EXCLUSIVAMENTE um JSON válido neste formato exato:
{
  "transport": "Avião | Ônibus | Carro | Outro",
  "costAmount": 0,
  "notes": "Informações úteis novas (bagagem, portão, terminal, política, companhia)",
  "ticketClassifications": [
    {
      "fileIndex": 0,
      "legType": "ida | conexao_ida | volta | conexao_volta | outro",
      "label": "Resumo curto ex: Ida BSB → GRU"
    }
  ],
  "segments": [
    {
      "fileIndex": 0,
      "legType": "ida | conexao_ida | volta | conexao_volta | outro",
      "transport": "Avião | Ônibus | Carro | Outro",
      "origin": "Código IATA e/ou cidade de origem (ex: BSB - Brasília)",
      "destination": "Código IATA e/ou cidade de destino (ex: GRU - São Paulo)",
      "departAt": "YYYY-MM-DDTHH:MM",
      "arriveAt": "YYYY-MM-DDTHH:MM",
      "carrier": "Nome da companhia (ex: LATAM, GOL, Azul, Viação Cometa)",
      "flightNumber": "Número do voo ou linha (ex: LA3210, G31405)",
      "locator": "Código localizador / PNR (ex: X9K4LP)",
      "seat": "Assento (ex: 12A)",
      "terminal": "Terminal se constar",
      "gate": "Portão se constar",
      "passengerName": "Nome do passageiro se constar",
      "barcodeValue": "Texto completo do QR Code/Aztec/PDF417/código de barras se legível, senão vazio",
      "barcodeType": "QR_CODE | AZTEC | PDF_417 | CODE_128",
      "notes": "Detalhes extras do trecho"
    }
  ]
}
Regras importantes:
- Se um único arquivo PDF contiver múltiplos trechos (ex: ida + conexão, ou ida + volta), retorne todos os trechos encontrados em "segments" em ordem cronológica, classificando cada um corretamente como "ida", "conexao_ida", "volta" ou "conexao_volta".
- Use o destino/datas do evento e o contexto já registrado para classificar com precisão se o bilhete é de IDA ou VOLTA.
- Nunca invente horários ou valores se não constarem no bilhete (deixe string vazia "" ou 0).`;
      try {
        const result = await callGeminiJSON(creds.geminiKey, parts, sysTickets);
        return sendJson(res, 200, { ok: true, result: result || {} });
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: err.message || "Erro ao analisar bilhetes com IA." });
      }
    }

    /* ---------- IA: LER ANEXOS DO CARTÃO E GERAR RESUMO PARA DESCRIÇÃO ---------- */
    if (pathname === "/api/ai/summarize-attachments" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      if (!creds.geminiKey) {
        return sendJson(res, 412, { ok: false, error: "GEMINI_NOT_CONFIGURED", message: "Configure sua Gemini API Key em Parâmetros ou no seu Perfil para ler anexos com IA." });
      }
      const body = await readBody(req);
      const cardTitle = String(body.cardTitle || "").trim();
      const rawAtts = Array.isArray(body.attachments) ? body.attachments.slice(0, 12) : [];
      if (!rawAtts.length) {
        return sendJson(res, 400, { ok: false, error: "Nenhum anexo informado para leitura." });
      }

      const extractOoxmlText = buf => {
        try {
          const texts = [];
          let pos = 0;
          while (pos + 30 < buf.length) {
            const sig = buf.readUInt32LE(pos);
            if (sig !== 0x04034b50) break;
            const method = buf.readUInt16LE(pos + 8);
            const compSize = buf.readUInt32LE(pos + 18);
            const nameLen = buf.readUInt16LE(pos + 26);
            const extraLen = buf.readUInt16LE(pos + 28);
            const nameStart = pos + 30;
            const name = buf.toString("utf8", nameStart, nameStart + nameLen);
            const dataStart = nameStart + nameLen + extraLen;
            const dataEnd = dataStart + compSize;
            if (compSize > 0 && dataEnd <= buf.length && /\.xml$/i.test(name) && /(word\/document|ppt\/slides\/slide|xl\/sharedStrings|xl\/worksheets\/sheet)/i.test(name)) {
              const rawEntry = buf.subarray(dataStart, dataEnd);
              let xmlStr = "";
              if (method === 0) xmlStr = rawEntry.toString("utf8");
              else if (method === 8) xmlStr = zlib.inflateRawSync(rawEntry).toString("utf8");
              if (xmlStr) {
                const cleaned = xmlStr
                  .replace(/<\/(w:p|a:p|row|si|tr)>/gi, "\n")
                  .replace(/<[^>]+>/g, " ")
                  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
                  .replace(/[ \t]+/g, " ")
                  .replace(/\n{3,}/g, "\n\n")
                  .trim();
                if (cleaned) texts.push(cleaned);
              }
            }
            if (compSize === 0 && (buf.readUInt16LE(pos + 6) & 0x08)) break;
            pos = dataEnd;
          }
          return texts.join("\n\n").slice(0, 28000);
        } catch {
          return "";
        }
      };

      const parts = [];
      let totalInlineBytes = 0;
      const MAX_INLINE_BYTES = 14 * 1024 * 1024;
      const uploadsBase = path.resolve(UPLOADS_DIR) + path.sep;
      const readList = [];

      parts.push({
        text: `Cartão: ${cardTitle || "(sem título)"}\nAnalise cuidadosamente todos os anexos fornecidos abaixo e gere um resumo completo, claro, objetivo e bem estruturado em português para ser inserido na Descrição do cartão.`
      });

      for (const item of rawAtts) {
        if (!item || typeof item !== "object") continue;
        const fName = String(item.fileName || item.url || "Anexo").trim();
        if (item.isLink) {
          parts.push({ text: `[Link anexado] ${fName}: ${String(item.url || "")}` });
          readList.push(fName);
          continue;
        }
        let buf = null;
        let mime = String(item.mimeType || "").toLowerCase();
        if (item.id && db.attachments[item.id]) {
          const attMeta = db.attachments[item.id];
          const trip = db.trips[attMeta.tripId];
          const access = getTripAccess(trip, auth.user);
          if (access || isAdminUser(auth.user)) {
            const filePath = path.resolve(UPLOADS_DIR, attMeta.id);
            if (filePath.startsWith(uploadsBase) && fs.existsSync(filePath)) {
              buf = fs.readFileSync(filePath);
              mime = String(attMeta.mimeType || mime || "").toLowerCase();
            }
          }
        } else if (typeof item.dataUrl === "string" && item.dataUrl.includes("base64,")) {
          const m = item.dataUrl.match(/^data:([^;]+);base64,(.*)$/);
          if (m) {
            mime = (m[1] || mime || "").toLowerCase();
            buf = Buffer.from(m[2], "base64");
          }
        }
        if (!buf || !buf.length) {
          parts.push({ text: `[Anexo listado sem conteúdo binário disponível]: ${fName}` });
          continue;
        }
        const ext = (fName.split(".").pop() || "").toLowerCase();
        const isInlineSupported =
          mime.startsWith("image/") ||
          mime === "application/pdf" ||
          mime.startsWith("audio/") ||
          ["pdf", "png", "jpg", "jpeg", "webp", "gif", "mp3", "wav", "ogg", "m4a"].includes(ext);

        if (isInlineSupported) {
          if (!mime || mime === "application/octet-stream") {
            if (ext === "pdf") mime = "application/pdf";
            else if (["jpg", "jpeg"].includes(ext)) mime = "image/jpeg";
            else if (ext === "png") mime = "image/png";
            else if (ext === "webp") mime = "image/webp";
            else if (ext === "gif") mime = "image/gif";
            else mime = "application/pdf";
          }
          if (totalInlineBytes + buf.length <= MAX_INLINE_BYTES) {
            totalInlineBytes += buf.length;
            parts.push({ text: `[Arquivo anexo: ${fName}]` });
            parts.push({ inlineData: { mimeType: mime, data: buf.toString("base64") } });
            readList.push(fName);
          } else {
            parts.push({ text: `[Arquivo anexo excedeu limite de tamanho para leitura direta: ${fName}]` });
          }
        } else if (["docx", "pptx", "xlsx"].includes(ext) || /officedocument/i.test(mime)) {
          const extracted = extractOoxmlText(buf);
          if (extracted) {
            parts.push({ text: `[Conteúdo extraído do documento "${fName}"]:\n${extracted}` });
            readList.push(fName);
          } else {
            parts.push({ text: `[Documento Office anexado "${fName}" (${buf.length} bytes) — sem texto extraível.]` });
          }
        } else if (mime.startsWith("text/") || ["txt", "md", "csv", "json", "xml", "html", "log", "ics", "yml", "yaml"].includes(ext)) {
          const txt = buf.toString("utf8").slice(0, 28000);
          parts.push({ text: `[Conteúdo do arquivo texto "${fName}"]:\n${txt}` });
          readList.push(fName);
        } else {
          parts.push({ text: `[Anexo "${fName}" (${mime || ext || "binário"}, ${buf.length} bytes)]` });
        }
      }

      if (!readList.length) {
        return sendJson(res, 400, { ok: false, error: "Não foi possível ler o conteúdo dos anexos informados (formato não suportado ou arquivo indisponível)." });
      }

      const sysPrompt = `Você é um analista executivo sênior. Leia o conteúdo dos anexos fornecidos e produza um resumo completo, claro e bem estruturado em português do Brasil para a Descrição de um cartão de projeto/tarefa.
Regras:
- Organize com títulos curtos em texto simples e marcadores ("•"), sem usar tags HTML nem blocos markdown excessivos.
- Destaque objetivo/assunto principal, pontos-chave, datas/prazos, valores financeiros, partes envolvidas, localizadores/códigos e ações/pendências relevantes se existirem nos documentos.
- Se houver múltiplos anexos, sintetize de forma integrada ou por documento de maneira limpa e fácil de ler.
Retorne EXCLUSIVAMENTE um JSON válido no formato:
{
  "summary": "Texto estruturado do resumo completo aqui"
}`;
      try {
        const result = await callGeminiJSON(creds.geminiKey, parts, sysPrompt);
        const summary = String(result?.summary || "").trim();
        if (!summary) return sendJson(res, 502, { ok: false, error: "A IA não retornou um resumo válido." });
        return sendJson(res, 200, { ok: true, summary, filesRead: readList });
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: err.message || "Falha ao ler anexos com Gemini." });
      }
    }

    /* ---------- IA: MELHORAR ATA DE REUNIÃO & GERAR APRESENTAÇÃO CLEAN ---------- */
    if (pathname === "/api/ai/improve-minutes" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      if (!creds.geminiKey) {
        return sendJson(res, 412, { ok: false, error: "GEMINI_NOT_CONFIGURED", message: "Configure sua Gemini API Key em Parâmetros ou na Central de Integrações para melhorar textos com IA." });
      }
      const body = await readBody(req);
      const style = ["clarity", "executive", "bullets"].includes(body.style) ? body.style : "executive";
      const htmlIn = String(body.html || "").slice(0, 60000);
      const plainIn = String(body.plainText || "").slice(0, 40000);
      if (!plainIn.trim() && !htmlIn.trim()) {
        return sendJson(res, 400, { ok: false, error: "Escreva algum conteúdo na ata antes de melhorar com IA." });
      }
      const stylePrompt = style === "clarity"
        ? "Melhore clareza, ortografia, fluidez e tom profissional em português, MANTENDO a estrutura, seções, tabelas e todos os fatos originais."
        : (style === "bullets"
          ? "Resuma e organize o conteúdo em tópicos objetivos, curtos e diretos (<ul><li>), destacando decisões, responsáveis e prazos."
          : "Formate como uma Ata Executiva Profissional completa em português, estruturada em seções claras com <h2>: Pauta, Principais Discussões, Decisões / Deliberações e Próximos Passos / Ações (com responsáveis e prazos quando mencionados).");
      const sysPrompt = `Você é um redator executivo sênior. ${stylePrompt}
Retorne EXCLUSIVAMENTE um JSON válido no formato:
{
  "html": "HTML semântico limpo usando apenas <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <u>, <blockquote>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <hr> (NUNCA use <script>, <style> ou classes inventadas).",
  "summary": "Resumo em 1 frase do que foi melhorado."
}`;
      try {
        const result = await callGeminiJSON(creds.geminiKey, [{
          text: `Cartão: ${String(body.cardName || "")}\nTítulo da Ata: ${String(body.title || "")}\n\nConteúdo atual:\n${plainIn || htmlIn}`
        }], sysPrompt);
        return sendJson(res, 200, { ok: true, html: String(result?.html || htmlIn), summary: String(result?.summary || "Texto aprimorado com IA.") });
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: err.message || "Falha ao melhorar ata com IA." });
      }
    }

    if (pathname === "/api/ai/generate-slides" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      const body = await readBody(req);
      const cardName = String(body.cardName || "Apresentação").trim();
      const title = String(body.title || `Ata - ${cardName}`).trim();
      const meetingDate = String(body.meetingDate || "").trim();
      const participants = Array.isArray(body.participants) ? body.participants.filter(Boolean) : [];
      const plainIn = String(body.plainText || "").slice(0, 40000);
      const actions = Array.isArray(body.actions) ? body.actions.slice(0, 20) : [];

      if (!creds.geminiKey) {
        return sendJson(res, 200, { ok: true, usedAi: false, slides: null });
      }
      const sysSlides = `Você é especialista em apresentações executivas ultra clean (fundo branco, texto preto, tópicos claros e fáceis de ler em projetor).
A partir da ata abaixo, gere um JSON válido com slides estruturados seguindo OBRIGATORIAMENTE esta ordem:
1. Slide 1 (kind: "cover"): title = título do cartão ("${cardName}"), subtitle = título da ata, metaLines = [data da reunião, participantes].
2. Slide 2 (kind: "agenda"): title = "Roteiro", bullets = lista curta e clara dos títulos dos slides seguintes.
3. Slides 3..N (kind: "topic"): um slide por grande assunto/tema discutido na ata, com 3 a 5 bullets curtos, explicativos e diretos (sem parágrafos longos).
4. Último slide (kind: "actions", se houver decisões/ações): title = "Decisões e Encaminhamentos", bullets claros com ação + responsável/prazo.
Retorne EXCLUSIVAMENTE JSON:
{
  "slides": [
    { "kind": "cover", "title": "...", "subtitle": "...", "metaLines": ["...", "..."] },
    { "kind": "agenda", "title": "Roteiro", "bullets": ["...", "..."] },
    { "kind": "topic", "title": "...", "bullets": ["...", "..."] },
    { "kind": "actions", "title": "Decisões e Encaminhamentos", "bullets": ["...", "..."] }
  ]
}`;
      try {
        const resAi = await callGeminiJSON(creds.geminiKey, [{
          text: `Cartão: ${cardName}\nAta: ${title}\nData: ${meetingDate}\nParticipantes: ${participants.join(", ")}\nAções já convertidas em checklist/cartões: ${JSON.stringify(actions)}\n\nConteúdo da Ata:\n${plainIn}`
        }], sysSlides);
        const slides = Array.isArray(resAi?.slides) && resAi.slides.length ? resAi.slides : null;
        return sendJson(res, 200, { ok: true, usedAi: Boolean(slides), slides });
      } catch {
        return sendJson(res, 200, { ok: true, usedAi: false, slides: null });
      }
    }

    /* ---------- EXPORTAÇÃO BINÁRIA DE ATAS: WORD (.docx) E POWERPOINT (.pptx) ---------- */
    if (pathname === "/api/minutes/export-docx" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const body = await readBody(req);
      try {
        const { buffer } = buildDocxBuffer(body, buildZipBuffer);
        const safeName = String(body.fileName || body.title || "Ata_Reuniao").replace(/[^\w\-]+/g, "_").slice(0, 80) + ".docx";
        res.writeHead(200, {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${safeName}"`,
          "Content-Length": buffer.length,
          "Cache-Control": "no-store"
        });
        return res.end(buffer);
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message || "Falha ao gerar arquivo Word (.docx)." });
      }
    }

    if (pathname === "/api/minutes/export-pptx" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const body = await readBody(req);
      try {
        const { buffer } = buildPptxBuffer(body, buildZipBuffer);
        const safeName = String(body.fileName || body.title || "Apresentacao_Ata").replace(/[^\w\-]+/g, "_").slice(0, 80) + ".pptx";
        res.writeHead(200, {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${safeName}"`,
          "Content-Length": buffer.length,
          "Cache-Control": "no-store"
        });
        return res.end(buffer);
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message || "Falha ao gerar apresentação PowerPoint (.pptx)." });
      }
    }

    /* ---------- PROXY STATIC ROUTE MAP (EVITA QUEBRA NO RELATÓRIO PDF) ---------- */
    if (pathname === "/api/maps/static-route" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      const body = await readBody(req);
      const key = String(creds.gmapsKey || body.gmapsKey || "").trim();
      const stops = Array.isArray(body.stops) ? body.stops.filter(Boolean).slice(0, 10) : [];
      if (!key || stops.length < 2) {
        return sendJson(res, 200, { ok: true, available: false });
      }
      try {
        const markers = stops.map((p, i) => `markers=color:${i === 0 ? "green" : (i === stops.length - 1 ? "red" : "blue")}|label:${i + 1}|${encodeURIComponent(p + ", Brasil")}`).join("&");
        const pathParam = "path=color:0x0284c7ff|weight:4|" + stops.map(p => encodeURIComponent(p + ", Brasil")).join("|");
        const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=640x250&scale=2&language=pt-BR&region=BR&${markers}&${pathParam}&key=${encodeURIComponent(key)}`;
        const mRes = await fetch(mapUrl);
        const ct = mRes.headers.get("content-type") || "";
        if (!mRes.ok || !ct.startsWith("image/")) {
          return sendJson(res, 200, { ok: true, available: false });
        }
        const buf = Buffer.from(await mRes.arrayBuffer());
        return sendJson(res, 200, {
          ok: true,
          available: true,
          dataUrl: `data:${ct.split(";")[0]};base64,${buf.toString("base64")}`
        });
      } catch {
        return sendJson(res, 200, { ok: true, available: false });
      }
    }

    /* ---------- BANCO ONLINE DE VEÍCULOS (EPA FuelEconomy.gov 1984–2026) ---------- */
    if (pathname === "/api/vehicles/epa" && req.method === "GET") {
      const action = url.searchParams.get("action") || "makes";
      const year = url.searchParams.get("year") || "2024";
      const make = url.searchParams.get("make") || "";
      const model = url.searchParams.get("model") || "";
      const vid = url.searchParams.get("id") || "";
      try {
        const hdrs = { Accept: "application/json" };
        const normArr = x => Array.isArray(x) ? x : (x ? [x] : []);
        if (action === "years") {
          const r = await fetch("https://www.fueleconomy.gov/ws/rest/vehicle/menu/year", { headers: hdrs });
          const j = await r.json();
          return sendJson(res, 200, { ok: true, items: normArr(j.menuItem) });
        }
        if (action === "makes") {
          const r = await fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/make?year=${encodeURIComponent(year)}`, { headers: hdrs });
          const j = await r.json();
          return sendJson(res, 200, { ok: true, items: normArr(j.menuItem) });
        }
        if (action === "models") {
          if (!make) return sendJson(res, 200, { ok: true, items: [] });
          const r = await fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/model?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}`, { headers: hdrs });
          const j = await r.json();
          return sendJson(res, 200, { ok: true, items: normArr(j.menuItem) });
        }
        if (action === "options") {
          if (!make || !model) return sendJson(res, 200, { ok: true, items: [] });
          const r = await fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/options?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`, { headers: hdrs });
          const j = await r.json();
          return sendJson(res, 200, { ok: true, items: normArr(j.menuItem) });
        }
        if (action === "spec" && vid) {
          const r = await fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/${encodeURIComponent(vid)}`, { headers: hdrs });
          const v = await r.json();
          const ft = String(v.fuelType1 || v.fuelType || "").toLowerCase();
          const atv = String(v.atvType || "").toLowerCase();
          const isBev = atv === "ev" || ft.includes("electricity") && !v.fuelType2;
          const isPhev = atv.includes("plug");
          const isHev = atv.includes("hybrid") && !isPhev;
          const mpgHwy = Number(v.highway08 || v.highwayA08 || v.comb08 || 28);
          const kmL = isBev ? 0 : Math.round(mpgHwy * 0.425144 * 10) / 10;
          const evMiles = Number(v.range || v.rangeA || 0);
          const evKm = Math.round(evMiles * 1.60934);
          const cls = String(v.VClass || "").toLowerCase();
          const estTank = isBev ? 0 : (cls.includes("truck") || cls.includes("van") ? 80 : cls.includes("suv") ? 60 : cls.includes("compact") ? 48 : 55);
          return sendJson(res, 200, {
            ok: true,
            vehicle: {
              name: `${v.make} ${v.model} (${v.year}${v.displ ? " " + v.displ + "L" : ""})`,
              powertrain: isBev ? "BEV" : isPhev ? "PHEV" : isHev ? "HEV" : "COMBUSTION",
              hevKmL: kmL,
              evRange: evKm,
              tank: estTank,
              battery: isBev ? 65 : isPhev ? 16 : isHev ? 1.5 : 0,
              kwhPerCharge: isBev ? 52 : isPhev ? 13 : 0,
              bevKwhPer100: Number(v.combE) > 0 ? Math.round(Number(v.combE) * 0.621371 * 10) / 10 : 18
            }
          });
        }
        return sendJson(res, 400, { ok: false, error: "Ação inválida." });
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: "Falha ao consultar catálogo EPA: " + (err.message || err) });
      }
    }

    /* ---------- CARTEIRA DO GOOGLE PASS SIGNER ---------- */
    if (pathname === "/api/wallet/generate-link" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const creds = getEffectiveCredentials(auth.user);
      if (!creds.walletIssuerId || !creds.walletSaJson) {
        return sendJson(res, 200, {
          ok: true,
          configured: false,
          message: "Configure GOOGLE_WALLET_ISSUER_ID e a Service Account (GOOGLE_WALLET_CLIENT_EMAIL / GOOGLE_WALLET_PRIVATE_KEY ou JSON) em Parâmetros ou no .env do servidor."
        });
      }
      const body = await readBody(req);
      if (!body.segment || typeof body.segment !== "object") {
        return sendJson(res, 400, { ok: false, error: "Dados do trecho ausentes." });
      }
      try {
        const originHost = req.headers.origin || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
        const built = buildGoogleWalletSegmentSaveUrl(
          creds.walletIssuerId,
          creds.walletSaJson,
          body.segment,
          body.card || {},
          body.tripName || "My Plan",
          originHost
        );
        return sendJson(res, 200, { ok: true, configured: true, saveUrl: built.saveUrl, objectType: built.objectType });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message || "Falha ao gerar link da Carteira do Google." });
      }
    }

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
        const saveUrl = buildGoogleWalletSaveUrl(creds.walletIssuerId, creds.walletSaJson, body.activity, body.tripName || "My Plan", originHost);
        return sendJson(res, 200, { ok: true, configured: true, saveUrl });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message || "Falha ao assinar passe da Carteira do Google." });
      }
    }

    if (pathname === "/api/wallet/pkpass" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { ok: false, error: "Não autenticado." });
      const body = await readBody(req);
      if (!body.activity) return sendJson(res, 400, { ok: false, error: "Dados da atividade ausentes." });
      try {
        const pkBuf = buildPkpassBuffer(body.activity, body.tripName || "My Plan");
        const { token, filename } = storeWalletPkpass(pkBuf, body.activity.name);
        return sendJson(res, 200, {
          ok: true,
          filename,
          pkpassUrl: `/api/wallet/pkpass/${token}.pkpass`
        });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message || "Falha ao gerar passe .pkpass." });
      }
    }

    const pkpassMatch = pathname.match(/^\/api\/wallet\/pkpass\/([a-f0-9]{16,64})\.pkpass$/i);
    if (pkpassMatch && req.method === "GET") {
      const item = walletPassTokens.get(pkpassMatch[1]);
      if (!item || item.expiresAt <= Date.now()) {
        walletPassTokens.delete(pkpassMatch[1]);
        res.writeHead(404);
        return res.end("Pass expired or not found");
      }
      res.writeHead(200, {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `inline; filename="${item.filename}"`,
        "Content-Length": item.buf.length,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      return res.end(item.buf);
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
        "Content-Disposition": `inline; filename="my_plan_${trip.id}.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      return res.end(ics);
    }

    if (SERVE_STATIC && req.method === "GET") {
      return serveStaticFile(req, res, pathname);
    }

    res.writeHead(404, applySecurityHeaders(res));
    res.end("Not Found");
  } catch (err) {
    console.error("Erro API:", err);
    auditLog("system.error", { ip: getClientIp(req), detail: String(err?.message || err).slice(0, 180) });
    sendJson(res, 500, { ok: false, error: "Erro interno no servidor." });
  }
});

let schedulerTimer = null;
function runSchedulerTick() {
  try {
    const now = Date.now();
    let dirty = false;
    for (const [k, s] of Object.entries(db.sessions || {})) {
      if (!s || s.expiresAt < now) { delete db.sessions[k]; dirty = true; }
    }
    for (const [rk, r] of Object.entries(db.passwordResets || {})) {
      if (!r || r.expiresAt <= now) { delete db.passwordResets[rk]; dirty = true; }
    }
    for (const [tk, v] of walletPassTokens.entries()) {
      if (!v || v.expiresAt <= now) walletPassTokens.delete(tk);
    }
    pruneRateLimits();
    if (dirty) saveDb();

    if (BACKUP_INTERVAL_HOURS > 0 && Object.keys(db.users || {}).length > 0) {
      const existing = listBackups();
      const latestAt = existing[0]?.createdAt || 0;
      if (now - latestAt >= BACKUP_INTERVAL_HOURS * 3600 * 1000) {
        createBackup("scheduled");
      }
    }
  } catch {}
}

schedulerTimer = setInterval(runSchedulerTick, SCHEDULER_TICK_MS);
if (typeof schedulerTimer.unref === "function") schedulerTimer.unref();

const gracefulShutdown = () => {
  if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

server.listen(PORT, HOST, () => {
  const sys = getGlobalConfig();
  console.log(`My Plan Server ativo em http://${HOST}:${PORT}`);
  console.log(`DB: ${DB_FILE} | Google OAuth: ${sys.googleClientId ? "Ativo" : "Não configurado"} | AES-256-GCM: Ativo`);
});
