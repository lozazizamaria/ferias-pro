"use strict";

/* ==========================================================================
   My Plan — Camada de Persistência Zero-Dependências (SQLite WAL + JSON Fallback)
   Usa node:sqlite (DatabaseSync, nativo no Node >= 22.5) em modo WAL com
   migração automática de db.json, ou fallback transparente para db.json atômico.
   ========================================================================== */

const fs = require("node:fs");
const path = require("node:path");

function normalizeLoadedDb(raw, emptyDb) {
  const merged = Object.assign(emptyDb(), raw || {});
  if (!merged.users || typeof merged.users !== "object") merged.users = {};
  if (!merged.sessions || typeof merged.sessions !== "object") merged.sessions = {};
  if (!merged.trips || typeof merged.trips !== "object") merged.trips = {};
  if (!Array.isArray(merged.shares)) merged.shares = [];
  if (!merged.attachments || typeof merged.attachments !== "object") merged.attachments = {};
  if (!merged.passwordResets || typeof merged.passwordResets !== "object") merged.passwordResets = {};
  if (!Array.isArray(merged.admins)) merged.admins = [];
  if (!merged.systemSettings || typeof merged.systemSettings !== "object") merged.systemSettings = {};
  if (!Array.isArray(merged.auditLogs)) merged.auditLogs = [];
  if (!merged.meta || typeof merged.meta !== "object") merged.meta = {};
  return merged;
}

function tryLoadNodeSqlite() {
  try {
    const mod = require("node:sqlite");
    return mod && typeof mod.DatabaseSync === "function" ? mod : null;
  } catch {
    return null;
  }
}

function createJsonStorage({ dbFile, emptyDb }) {
  let tmpSeq = 0;

  function load() {
    try {
      if (fs.existsSync(dbFile)) {
        const parsed = JSON.parse(fs.readFileSync(dbFile, "utf8"));
        return normalizeLoadedDb(parsed, emptyDb);
      }
    } catch {}
    return emptyDb();
  }

  function saveSync(db) {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    const payload = JSON.stringify(db);
    const tmp = `${dbFile}.${process.pid}.${Date.now()}.${++tmpSeq}.tmp`;
    fs.writeFileSync(tmp, payload, "utf8");
    fs.renameSync(tmp, dbFile);
  }

  async function saveAsync(db, isStale) {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    const payload = JSON.stringify(db);
    const tmp = `${dbFile}.${process.pid}.${Date.now()}.${++tmpSeq}.tmp`;
    await fs.promises.writeFile(tmp, payload, "utf8");
    if (typeof isStale === "function" && isStale()) {
      await fs.promises.unlink(tmp).catch(() => {});
      return false;
    }
    await fs.promises.rename(tmp, dbFile);
    return true;
  }

  function close() {}

  return {
    engine: "json-atomic",
    filePath: dbFile,
    load,
    saveSync,
    saveAsync,
    close
  };
}

function createSqliteStorage({ sqliteFile, dbFile, emptyDb, DatabaseSync }) {
  fs.mkdirSync(path.dirname(sqliteFile), { recursive: true });
  const conn = new DatabaseSync(sqliteFile);
  conn.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 8000;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      mode TEXT,
      updated_at INTEGER,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_trips_owner ON trips(owner_id);

    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      trip_id TEXT,
      target_email TEXT,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_shares_trip ON shares(trip_id);

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      trip_id TEXT,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attachments_trip ON attachments(trip_id);

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT,
      expires_at INTEGER,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT,
      expires_at INTEGER,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );
  `);

  const stmtInsUser = conn.prepare("INSERT INTO users (id, email, data_json) VALUES (?, ?, ?)");
  const stmtInsTrip = conn.prepare("INSERT INTO trips (id, owner_id, mode, updated_at, data_json) VALUES (?, ?, ?, ?, ?)");
  const stmtInsShare = conn.prepare("INSERT INTO shares (id, trip_id, target_email, data_json) VALUES (?, ?, ?, ?)");
  const stmtInsAtt = conn.prepare("INSERT INTO attachments (id, trip_id, data_json) VALUES (?, ?, ?)");
  const stmtInsSess = conn.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, data_json) VALUES (?, ?, ?, ?)");
  const stmtInsReset = conn.prepare("INSERT INTO password_resets (token_hash, user_id, expires_at, data_json) VALUES (?, ?, ?, ?)");
  const stmtInsAudit = conn.prepare("INSERT INTO audit_logs (ts, data_json) VALUES (?, ?)");
  const stmtUpsertKv = conn.prepare("INSERT INTO kv_store (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json");

  let closed = false;

  function saveSync(db) {
    if (closed) return;
    conn.exec("BEGIN IMMEDIATE");
    try {
      conn.exec("DELETE FROM users; DELETE FROM trips; DELETE FROM shares; DELETE FROM attachments; DELETE FROM sessions; DELETE FROM password_resets; DELETE FROM audit_logs;");

      for (const [id, u] of Object.entries(db.users || {})) {
        if (!u) continue;
        stmtInsUser.run(id, String(u.email || ""), JSON.stringify(u));
      }
      for (const [id, t] of Object.entries(db.trips || {})) {
        if (!t) continue;
        stmtInsTrip.run(id, String(t.ownerId || ""), String(t.mode || "personal"), Number(t.updatedAt) || 0, JSON.stringify(t));
      }
      let shIdx = 0;
      for (const sh of (db.shares || [])) {
        if (!sh) continue;
        const shId = String(sh.id || `sh_${++shIdx}`);
        stmtInsShare.run(shId, String(sh.tripId || ""), String(sh.targetEmail || ""), JSON.stringify(sh));
      }
      for (const [id, a] of Object.entries(db.attachments || {})) {
        if (!a) continue;
        stmtInsAtt.run(id, String(a.tripId || ""), JSON.stringify(a));
      }
      for (const [tk, s] of Object.entries(db.sessions || {})) {
        if (!s) continue;
        stmtInsSess.run(tk, String(s.userId || ""), Number(s.expiresAt) || 0, JSON.stringify(s));
      }
      for (const [tk, r] of Object.entries(db.passwordResets || {})) {
        if (!r) continue;
        stmtInsReset.run(tk, String(r.userId || ""), Number(r.expiresAt) || 0, JSON.stringify(r));
      }
      const logs = Array.isArray(db.auditLogs) ? db.auditLogs.slice(0, 500) : [];
      for (const entry of logs) {
        if (!entry) continue;
        stmtInsAudit.run(Number(entry.ts) || Date.now(), JSON.stringify(entry));
      }

      stmtUpsertKv.run("admins", JSON.stringify(Array.isArray(db.admins) ? db.admins : []));
      stmtUpsertKv.run("systemSettings", JSON.stringify(db.systemSettings || {}));
      stmtUpsertKv.run("meta", JSON.stringify(db.meta || {}));
      stmtUpsertKv.run("__initialized", "1");

      conn.exec("COMMIT");
    } catch (err) {
      try { conn.exec("ROLLBACK"); } catch {}
      throw err;
    }
  }

  async function saveAsync(db, isStale) {
    if (closed) return false;
    await new Promise(resolve => setImmediate(resolve));
    if (closed || (typeof isStale === "function" && isStale())) return false;
    saveSync(db);
    return true;
  }

  function load() {
    const initRow = conn.prepare("SELECT value_json FROM kv_store WHERE key = ?").get("__initialized");
    if (!initRow) {
      if (dbFile && fs.existsSync(dbFile)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(dbFile, "utf8"));
          const migrated = normalizeLoadedDb(parsed, emptyDb);
          saveSync(migrated);
          return migrated;
        } catch {}
      }
      return emptyDb();
    }

    const out = emptyDb();
    for (const row of conn.prepare("SELECT id, data_json FROM users").all()) {
      try { out.users[row.id] = JSON.parse(row.data_json); } catch {}
    }
    for (const row of conn.prepare("SELECT id, data_json FROM trips").all()) {
      try { out.trips[row.id] = JSON.parse(row.data_json); } catch {}
    }
    for (const row of conn.prepare("SELECT data_json FROM shares").all()) {
      try { out.shares.push(JSON.parse(row.data_json)); } catch {}
    }
    for (const row of conn.prepare("SELECT id, data_json FROM attachments").all()) {
      try { out.attachments[row.id] = JSON.parse(row.data_json); } catch {}
    }
    for (const row of conn.prepare("SELECT token_hash, data_json FROM sessions").all()) {
      try { out.sessions[row.token_hash] = JSON.parse(row.data_json); } catch {}
    }
    for (const row of conn.prepare("SELECT token_hash, data_json FROM password_resets").all()) {
      try { out.passwordResets[row.token_hash] = JSON.parse(row.data_json); } catch {}
    }
    for (const row of conn.prepare("SELECT data_json FROM audit_logs ORDER BY seq ASC").all()) {
      try { out.auditLogs.push(JSON.parse(row.data_json)); } catch {}
    }
    for (const row of conn.prepare("SELECT key, value_json FROM kv_store").all()) {
      if (row.key === "admins") { try { out.admins = JSON.parse(row.value_json); } catch {} }
      else if (row.key === "systemSettings") { try { out.systemSettings = JSON.parse(row.value_json); } catch {} }
      else if (row.key === "meta") { try { out.meta = JSON.parse(row.value_json); } catch {} }
    }
    return normalizeLoadedDb(out, emptyDb);
  }

  function close() {
    if (closed) return;
    closed = true;
    try { conn.exec("PRAGMA wal_checkpoint(TRUNCATE);"); } catch {}
    try { conn.close(); } catch {}
  }

  return {
    engine: "sqlite-wal",
    filePath: sqliteFile,
    load,
    saveSync,
    saveAsync,
    close
  };
}

function createStorage({ dataDir, dbFile, sqliteFile, emptyDb, preferredEngine = "" }) {
  const pref = String(preferredEngine || "").trim().toLowerCase();
  const targetSqlite = sqliteFile || path.join(dataDir, "db.sqlite");
  if (pref !== "json") {
    const sqlite = tryLoadNodeSqlite();
    if (sqlite) {
      return createSqliteStorage({ sqliteFile: targetSqlite, dbFile, emptyDb, DatabaseSync: sqlite.DatabaseSync });
    }
  }
  return createJsonStorage({ dbFile, emptyDb });
}

module.exports = { createStorage };
