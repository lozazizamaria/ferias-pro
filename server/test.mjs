import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import vm from "node:vm";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const pkg = require(path.join(ROOT_DIR, "package.json"));
const sharedUtils = require(path.join(ROOT_DIR, "app", "shared-utils.js"));

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl, child, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Servidor encerrou prematuramente com código ${child.exitCode}`);
    }
    try {
      const resp = await fetch(`${baseUrl}/api/health`);
      if (resp.ok) return await resp.json();
    } catch {}
    await new Promise(r => setTimeout(r, 120));
  }
  throw new Error(`Timeout aguardando ${baseUrl}/api/health`);
}

function extractCookies(resp) {
  const raw = typeof resp.headers.getSetCookie === "function"
    ? resp.headers.getSetCookie()
    : (resp.headers.get("set-cookie") ? [resp.headers.get("set-cookie")] : []);
  return raw.map(c => c.split(";")[0]).filter(Boolean).join("; ");
}

async function apiJson(baseUrl, pathname, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.cookie) headers.Cookie = opts.cookie;
  let body = opts.body;
  if (body && typeof body === "object" && !(body instanceof Buffer)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  const resp = await fetch(`${baseUrl}${pathname}`, {
    method: opts.method || "GET",
    headers,
    body
  });
  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { resp, json, text, setCookie: extractCookies(resp) };
}

function startServerInstance(tmpDir, port, extraEnv = {}) {
  let stderrBuf = "";
  const child = spawn(process.execPath, [path.join(ROOT_DIR, "server", "server.js")], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      SKIP_DOTENV: "1",
      PORT: String(port),
      HOST: "127.0.0.1",
      DATA_DIR: tmpDir,
      MASTER_KEY: "test_master_key_32_chars_minimum_ok!!",
      ...extraEnv
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stderr.on("data", chunk => { stderrBuf += chunk.toString("utf8"); });

  const stop = async () => {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise(resolve => {
        const timer = setTimeout(() => {
          try { child.kill("SIGKILL"); } catch {}
          resolve();
        }, 4000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  };
  return { child, stop, getStderr: () => stderrBuf };
}

test("Unit — Shared Utils (esc, safeCmpIso, sanitizeStyleAttr, sanitizeMinuteHtml) & Zip Bomb Guard", () => {
  assert.equal(sharedUtils.esc(`<script>"a&b"</script>`), `&lt;script&gt;&quot;a&amp;b&quot;&lt;/script&gt;`);
  assert.equal(sharedUtils.safeCmpIso(undefined, "2026-01-01") < 0, true);
  assert.equal(sharedUtils.safeCmpIso(null, null), 0);
  assert.equal(sharedUtils.safeCmpIso("2026-05-02", "2026-05-01") > 0, true);

  const safeCss = sharedUtils.sanitizeStyleAttr("color: #2563eb; background: url(javascript:alert(1)); font-weight: bold; width: expression(alert(1))");
  assert.equal(safeCss, "color: #2563eb; font-weight: bold");

  const dirtyHtml = `<p onclick="alert(1)">Ata</p><script>evil()</script><a href="javascript:alert(2)">x</a>`;
  const cleanHtml = sharedUtils.sanitizeMinuteHtml(dirtyHtml);
  assert.equal(cleanHtml.includes("<script"), false);
  assert.equal(cleanHtml.includes("onclick"), false);
  assert.equal(cleanHtml.includes("javascript:"), false);
  assert.ok(cleanHtml.includes("Ata"));

  // Zip Bomb guard (maxOutputLength: 2 MB)
  const bombCompressed = zlib.deflateRawSync(Buffer.alloc(5 * 1024 * 1024, 0x41));
  assert.throws(
    () => zlib.inflateRawSync(bombCompressed, { maxOutputLength: 2 * 1024 * 1024 }),
    err => err && (err.code === "ERR_BUFFER_TOO_LARGE" || /output length|too large|buffer/i.test(err.message))
  );
});

test("My Plan Backend (SQLite WAL) — Segurança, CSRF, Multi-Usuário, Drive, Anexos RFC 5987, Export & Reinício", async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "myplan-test-sqlite-"));
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let srv = startServerInstance(tmpDir, port);

  t.after(async () => {
    await srv.stop();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  const health = await waitForHealth(baseUrl, srv.child);
  assert.equal(health.ok, true);
  assert.equal(health.version, pkg.version);
  assert.equal(health.encryption, "aes-256-gcm");
  assert.equal(health.storage, "sqlite-wal");

  let user1Cookie = "";
  let user2Cookie = "";
  let personalTripId = "";
  let proTripId = "";
  let attId = "";

  await t.test("Auth rejeita senha fraca e registra usuários com cookie HttpOnly", async () => {
    const weak = await apiJson(baseUrl, "/api/auth/register", {
      method: "POST",
      body: { name: "Teste Fraco", email: "fraco@example.com", password: "123" }
    });
    assert.equal(weak.resp.status, 400);
    assert.equal(weak.json.ok, false);

    const reg1 = await apiJson(baseUrl, "/api/auth/register", {
      method: "POST",
      body: { name: "Usuário Um", email: "user1@example.com", password: "Forte!Password2026" }
    });
    assert.equal(reg1.resp.status, 201);
    assert.equal(reg1.json.ok, true);
    assert.ok(reg1.setCookie.includes("fp_sid="), "Deve retornar cookie de sessão");
    user1Cookie = reg1.setCookie;

    const reg2 = await apiJson(baseUrl, "/api/auth/register", {
      method: "POST",
      body: { name: "Usuário Dois", email: "user2@example.com", password: "Outro!Password2026" }
    });
    assert.equal(reg2.resp.status, 201);
    user2Cookie = reg2.setCookie;
  });

  await t.test("CSRF Origin mismatch retorna 403 e RBAC bloqueia rotas Super Admin", async () => {
    const csrfBlocked = await apiJson(baseUrl, "/api/trips", {
      method: "POST",
      cookie: user1Cookie,
      headers: { Origin: "https://evil.example.com" },
      body: { name: "CSRF", mode: "personal", data: { activities: [] } }
    });
    assert.equal(csrfBlocked.resp.status, 403);

    const unauth = await apiJson(baseUrl, "/api/auth/me");
    assert.equal(unauth.resp.status, 401);

    const sysSettings = await apiJson(baseUrl, "/api/admin/system-settings", { cookie: user1Cookie });
    assert.equal(sysSettings.resp.status, 403);

    const backups = await apiJson(baseUrl, "/api/admin/backups", { cookie: user1Cookie });
    assert.equal(backups.resp.status, 403);
  });

  await t.test("Integrações salvam Drive Profissional e Drive Pessoal separadamente", async () => {
    const upd = await apiJson(baseUrl, "/api/integrations", {
      method: "PUT",
      cookie: user1Cookie,
      body: {
        driveFolderId: "drv_pro_folder_123",
        driveFolderName: "MyPlan Pro",
        personalDriveFolderId: "drv_personal_folder_456",
        personalDriveFolderName: "MyPlan Pessoal",
        geminiKey: "AIzaFakeKeyForValidationTest12345"
      }
    });
    assert.equal(upd.resp.status, 200);
    assert.equal(upd.json.user.integrations.driveFolderId, "drv_pro_folder_123");
    assert.equal(upd.json.user.integrations.personalDriveFolderId, "drv_personal_folder_456");
    assert.equal(upd.json.user.integrations.hasGemini, true);
    assert.equal(upd.json.user.integrations.geminiKey, undefined);
  });

  await t.test("Trip CRUD separa modos e isola acessos entre usuários", async () => {
    const c1 = await apiJson(baseUrl, "/api/trips", {
      method: "POST",
      cookie: user1Cookie,
      headers: { Origin: baseUrl },
      body: {
        name: "Férias Nordeste",
        mode: "personal",
        data: { mode: "personal", activities: [{ id: "act_1", title: "Voo Natal", start: "2026-07-10" }] }
      }
    });
    assert.equal(c1.resp.status, 201);
    assert.equal(c1.json.trip.mode, "personal");
    personalTripId = c1.json.trip.id;

    const c2 = await apiJson(baseUrl, "/api/trips", {
      method: "POST",
      cookie: user1Cookie,
      body: {
        name: "Operação Sul",
        mode: "professional",
        data: { mode: "professional", activities: [{ id: "pro_1", title: "Briefing", start: "2026-08-01" }] }
      }
    });
    assert.equal(c2.resp.status, 201);
    assert.equal(c2.json.trip.mode, "professional");
    proTripId = c2.json.trip.id;

    const forbidden = await apiJson(baseUrl, `/api/trips/${personalTripId}`, { cookie: user2Cookie });
    assert.equal(forbidden.resp.status, 403);

    const upd = await apiJson(baseUrl, `/api/trips/${proTripId}`, {
      method: "PUT",
      cookie: user1Cookie,
      body: {
        name: "Operação Sul Atualizada",
        mode: "professional",
        data: { mode: "professional", activities: [{ id: "pro_1", title: "Briefing Revisado", start: "2026-08-02" }] }
      }
    });
    assert.equal(upd.resp.status, 200);
    assert.equal(upd.json.revision, 2);
  });

  await t.test("Anexos aplicam RFC 5987 Content-Disposition e respeitam permissões", async () => {
    const sampleBytes = Buffer.from("Conteudo de teste UTF-8: Férias & Relatório 2026", "utf8");
    const up = await apiJson(baseUrl, `/api/trips/${personalTripId}/attachments`, {
      method: "POST",
      cookie: user1Cookie,
      body: {
        activityId: "act_1",
        fileName: "Relatório Férias (2026).txt",
        mimeType: "text/plain",
        base64Data: sampleBytes.toString("base64")
      }
    });
    assert.equal(up.resp.status, 201);
    attId = up.json.attachment.id;

    const dlForbidden = await fetch(`${baseUrl}/api/attachments/${attId}`, {
      headers: { Cookie: user2Cookie }
    });
    assert.equal(dlForbidden.status, 403);

    const dl = await fetch(`${baseUrl}/api/attachments/${attId}`, {
      headers: { Cookie: user1Cookie }
    });
    assert.equal(dl.status, 200);
    const cd = dl.headers.get("content-disposition") || "";
    assert.ok(cd.includes("filename*="), `Esperava RFC 5987 filename* em: ${cd}`);
    assert.ok(cd.includes("UTF-8''Relat%C3%B3rio"), `Esperava UTF-8 percent-encoding em: ${cd}`);
    const gotText = await dl.text();
    assert.equal(gotText, sampleBytes.toString("utf8"));

    const rename = await apiJson(baseUrl, `/api/attachments/${attId}`, {
      method: "PATCH",
      cookie: user1Cookie,
      body: { fileName: "Bilhete Renomeado.txt" }
    });
    assert.equal(rename.resp.status, 200);
    assert.equal(rename.json.attachment.fileName, "Bilhete Renomeado.txt");

    const summarizeEmpty = await apiJson(baseUrl, "/api/ai/summarize-attachments", {
      method: "POST",
      cookie: user1Cookie,
      body: { cardTitle: "Teste", attachments: [] }
    });
    assert.equal(summarizeEmpty.resp.status, 400);

    const audioMinEmpty = await apiJson(baseUrl, "/api/ai/audio-to-minutes", {
      method: "POST",
      cookie: user1Cookie,
      body: { cardName: "Reunião", title: "Ata" }
    });
    assert.equal(audioMinEmpty.resp.status, 400);
  });

  await t.test("Exportadores DOCX e PPTX geram ZIP válido (PK\\x03\\x04)", async () => {
    const docx = await fetch(`${baseUrl}/api/minutes/export-docx`, {
      method: "POST",
      headers: { Cookie: user1Cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Ata Teste",
        blocks: [{ type: "heading", text: "Pauta Principal" }, { type: "paragraph", runs: [{ text: "Item 1" }] }]
      })
    });
    assert.equal(docx.status, 200);
    const docxBuf = Buffer.from(await docx.arrayBuffer());
    assert.equal(docxBuf.subarray(0, 4).toString("hex"), "504b0304");

    const pptx = await fetch(`${baseUrl}/api/minutes/export-pptx`, {
      method: "POST",
      headers: { Cookie: user1Cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Apresentação Teste",
        slides: [{ title: "Slide 1", bullets: ["Objetivo A", "Objetivo B"] }]
      })
    });
    assert.equal(pptx.status, 200);
    const pptxBuf = Buffer.from(await pptx.arrayBuffer());
    assert.equal(pptxBuf.subarray(0, 4).toString("hex"), "504b0304");
  });

  await t.test("Persistência SQLite WAL sobrevive integralmente a reinício do servidor", async () => {
    await new Promise(r => setTimeout(r, 150));
    await srv.stop();
    const sqlitePath = path.join(tmpDir, "db.sqlite");
    assert.ok(fs.existsSync(sqlitePath), "db.sqlite deve existir no DATA_DIR");
    assert.equal(srv.getStderr().trim(), "", `Stderr inesperado do servidor: ${srv.getStderr()}`);

    const port2 = await getFreePort();
    const baseUrl2 = `http://127.0.0.1:${port2}`;
    srv = startServerInstance(tmpDir, port2);
    const h2 = await waitForHealth(baseUrl2, srv.child);
    assert.equal(h2.storage, "sqlite-wal");

    const trips = await apiJson(baseUrl2, "/api/trips", { cookie: user1Cookie });
    assert.equal(trips.resp.status, 200);
    const foundPro = (trips.json.ownTrips || []).find(tr => tr.id === proTripId);
    assert.ok(foundPro, "Projeto profissional deve persistir no SQLite após reinício");
    assert.equal(foundPro.name, "Operação Sul Atualizada");

    const attDl = await fetch(`${baseUrl2}/api/attachments/${attId}`, { headers: { Cookie: user1Cookie } });
    assert.equal(attDl.status, 200);
    assert.ok((attDl.headers.get("content-disposition") || "").includes("Bilhete%20Renomeado.txt"));
  });
});

test("Storage Fallback JSON -> Migração Automática SQLite WAL & Rate Limit Anti-Spoofing (TRUST_PROXY=0)", async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "myplan-test-json-mig-"));
  const port1 = await getFreePort();
  const baseUrl1 = `http://127.0.0.1:${port1}`;
  let srv = startServerInstance(tmpDir, port1, { STORAGE_ENGINE: "json", TRUST_PROXY: "0" });

  t.after(async () => {
    await srv.stop();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  const h1 = await waitForHealth(baseUrl1, srv.child);
  assert.equal(h1.storage, "json-atomic");

  const reg = await apiJson(baseUrl1, "/api/auth/register", {
    method: "POST",
    body: { name: "Legado JSON", email: "legacy@example.com", password: "Forte!Password2026" }
  });
  assert.equal(reg.resp.status, 201);
  const cookie = reg.setCookie;

  const tripRes = await apiJson(baseUrl1, "/api/trips", {
    method: "POST",
    cookie,
    body: { name: "Viagem Legada", mode: "personal", data: { activities: [] } }
  });
  assert.equal(tripRes.resp.status, 201);
  const legacyTripId = tripRes.json.trip.id;

  // Rate limit anti-spoofing: X-Forwarded-For falso NÃO deve contornar o limite de login
  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await apiJson(baseUrl1, "/api/auth/login", {
      method: "POST",
      headers: { "X-Forwarded-For": `203.0.113.${i + 1}` },
      body: { email: "legacy@example.com", password: "SenhaErrada!123" }
    });
    if (r.resp.status === 429) {
      got429 = true;
      break;
    }
  }
  assert.equal(got429, true, "Rate limit deve disparar 429 mesmo rotacionando X-Forwarded-For com TRUST_PROXY=0");

  // Verifica db.json compacto gravado em disco
  await new Promise(r => setTimeout(r, 150));
  await srv.stop();
  const dbJsonPath = path.join(tmpDir, "db.json");
  assert.ok(fs.existsSync(dbJsonPath), "db.json deve existir no modo json-atomic");
  assert.equal(fs.readFileSync(dbJsonPath, "utf8").includes("\n  "), false, "db.json deve ser compacto");

  // Reinicia em modo SQLite WAL padrão e valida migração automática de db.json -> db.sqlite
  const port2 = await getFreePort();
  const baseUrl2 = `http://127.0.0.1:${port2}`;
  srv = startServerInstance(tmpDir, port2);
  const h2 = await waitForHealth(baseUrl2, srv.child);
  assert.equal(h2.storage, "sqlite-wal");

  const listAfterMig = await apiJson(baseUrl2, "/api/trips", { cookie });
  assert.equal(listAfterMig.resp.status, 200);
  assert.ok((listAfterMig.json.ownTrips || []).some(tr => tr.id === legacyTripId && tr.name === "Viagem Legada"));
});

test("Unit — Splitwise (Integer Cents, Greedy Min-Cash-Flow, Pix EMV BR Code CRC16 & QR SVG)", async () => {
  const swSrc = fs.readFileSync(path.join(ROOT_DIR, "app", "splitwise.js"), "utf8");
  const sandbox = { window: {}, TextEncoder, Uint8Array, Int8Array, Map, Set, Math, Date, Number, String, Array, Object, Boolean, Infinity, encodeURIComponent };
  vm.createContext(sandbox);
  vm.runInContext(swSrc, sandbox);
  const SW = sandbox.window.MyPlanSplitwise;
  assert.ok(SW, "MyPlanSplitwise deve estar exposto em window");

  // 1. Aritmética segura em centavos (zero erro de ponto flutuante: R$ 100,00 / 3 = 33,34 + 33,33 + 33,33)
  assert.equal(SW.parseMoneyToCents("1.234,56"), 123456);
  assert.equal(SW.parseMoneyToCents("145,50"), 14550);
  const parts = [
    { id: "p1", name: "Ana", pixKey: "ana@example.com", pixName: "ANA SILVA", pixCity: "BRASILIA" },
    { id: "p2", name: "Bruno", pixKey: "" },
    { id: "p3", name: "Carlos", pixKey: "" }
  ];
  const eqSplits = SW.computeExpenseSplits({
    amountCents: 10000,
    splitMode: "equal",
    shares: parts.map(p => ({ participantId: p.id, included: true }))
  }, parts);
  assert.equal(eqSplits.reduce((s, x) => s + x.amountCents, 0), 10000, "Soma exata em centavos para divisão por 3");
  assert.deepEqual(eqSplits.map(x => x.amountCents), [3334, 3333, 3333]);

  // 2. Divisão por cotas (2:1:1 em R$ 400,00 -> 200, 100, 100)
  const shareSplits = SW.computeExpenseSplits({
    amountCents: 40000,
    splitMode: "shares",
    shares: [
      { participantId: "p1", weight: 2 },
      { participantId: "p2", weight: 1 },
      { participantId: "p3", weight: 1 }
    ]
  }, parts);
  assert.deepEqual(shareSplits.map(x => x.amountCents), [20000, 10000, 10000]);

  // 3. Simplificação de dívidas (Greedy Min-Cash-Flow)
  const ledger = SW.computeLedgerAndSettlements({
    participants: parts,
    expenses: [
      { id: "e1", desc: "Hotel", amountCents: 30000, payers: [{ participantId: "p1", amountCents: 30000 }], splitMode: "equal", shares: parts.map(p => ({ participantId: p.id, included: true })) },
      { id: "e2", desc: "Jantar", amountCents: 6000, payers: [{ participantId: "p2", amountCents: 6000 }], splitMode: "equal", shares: parts.map(p => ({ participantId: p.id, included: true })) }
    ],
    settlements: []
  });
  assert.equal(ledger.totalGroupCents, 36000);
  // Ana pagou 300, deve 120 -> +180; Bruno pagou 60, deve 120 -> -60; Carlos pagou 0, deve 120 -> -120
  assert.equal(ledger.transfers.length, 2);
  assert.equal(ledger.transfers.reduce((s, tr) => s + tr.amountCents, 0), 18000);

  // 4. Pix EMV BR Code com CRC16-CCITT válido e QR SVG gerado localmente
  const brCode = SW.buildPixBrCode({ key: "ana@example.com", name: "Ana Silva", city: "Brasília", amountCents: 14550, txid: "MYPLAN01" });
  assert.ok(brCode.startsWith("000201"), "BR Code inicia com 000201");
  assert.ok(brCode.includes("br.gov.bcb.pix"), "BR Code contém GUI oficial do BCB");
  assert.ok(brCode.includes("5406145.50"), "BR Code contém valor exato 145.50");
  assert.equal(brCode.slice(-4), SW.crc16Ccitt(brCode.slice(0, -4)), "CRC16-CCITT confere");
  const svg = SW.renderQrSvg(brCode, 200);
  assert.ok(svg.startsWith("<svg") && svg.includes("<path d=\"M"), "QR Code SVG gerado localmente sem dependências");
});

test("Splitwise Public Invite — Token isolado, lançamento convidado e revogação", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "myplan-swinv-"));
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const srv = startServerInstance(tmpDir, port);

  t.after(async () => {
    await srv.stop();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  await waitForHealth(baseUrl, srv.child);
  const reg = await apiJson(baseUrl, "/api/auth/register", {
    method: "POST",
    body: { name: "Dono Viagem", email: "dono@example.com", password: "Forte!Password2026" }
  });
  assert.equal(reg.resp.status, 201);
  const cookie = reg.setCookie;

  const tripRes = await apiJson(baseUrl, "/api/trips", {
    method: "POST",
    cookie,
    body: {
      name: "Gramado Amigos",
      mode: "personal",
      data: {
        title: "Gramado Amigos",
        activities: [{ id: "priv1", name: "Segredo Privado", start: "2026-12-10", notes: "NAO EXPOR" }],
        splitwise: { participants: [{ id: "p1", name: "Ana", pixKey: "ana@pix.com" }], expenses: [], settlements: [] }
      }
    }
  });
  assert.equal(tripRes.resp.status, 201);
  const tripId = tripRes.json.trip.id;

  // Gerar token de convite
  const invRes = await apiJson(baseUrl, `/api/trips/${tripId}/splitwise-invite`, { method: "POST", cookie, body: {} });
  assert.equal(invRes.resp.status, 200);
  assert.equal(invRes.json.active, true);
  const token = invRes.json.token;
  assert.ok(token.length >= 24);

  // Acesso público SEM cookie: retorna APENAS splitwise (zero vazamento de atividades privadas ou e-mail)
  const pubGet = await apiJson(baseUrl, `/api/public/splitwise/${token}`);
  assert.equal(pubGet.resp.status, 200);
  assert.equal(pubGet.json.tripTitle, "Gramado Amigos");
  assert.equal(pubGet.json.activities, undefined, "Não deve expor atividades privadas");
  assert.equal(JSON.stringify(pubGet.json).includes("Segredo Privado"), false, "Não deve vazar dados privados");

  // Convidado adiciona participante e despesa
  const addP = await apiJson(baseUrl, `/api/public/splitwise/${token}/action`, {
    method: "POST",
    body: { action: "save_participant", participant: { id: "p2", name: "Bruno", pixKey: "" } }
  });
  assert.equal(addP.resp.status, 200);
  assert.equal(addP.json.splitwise.participants.length, 2);

  // Revogar convite -> acesso público imediatamente bloqueado (404)
  const revRes = await apiJson(baseUrl, `/api/trips/${tripId}/splitwise-invite`, { method: "DELETE", cookie });
  assert.equal(revRes.resp.status, 200);
  const afterRev = await apiJson(baseUrl, `/api/public/splitwise/${token}`);
  assert.equal(afterRev.resp.status, 404);
});

test("Appearance Preferences API — Paletas, Ordem de Menus e Sanitização de Logo SVG/PNG", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "myplan-apppref-"));
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const srv = startServerInstance(tmpDir, port);

  t.after(async () => {
    await srv.stop();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  await waitForHealth(baseUrl, srv.child);

  // Sem auth -> 401
  const unauth = await apiJson(baseUrl, "/api/auth/preferences", {
    method: "PUT",
    body: { personal: { paletteId: "emerald" } }
  });
  assert.equal(unauth.resp.status, 401);

  const reg = await apiJson(baseUrl, "/api/auth/register", {
    method: "POST",
    body: { name: "Designer", email: "designer@example.com", password: "Forte!Password2026" }
  });
  assert.equal(reg.resp.status, 201);
  const cookie = reg.setCookie;

  const safeSvg = "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#10b981"/></svg>').toString("base64");
  const evilSvg = "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString("base64");

  const saveRes = await apiJson(baseUrl, "/api/auth/preferences", {
    method: "PUT",
    cookie,
    body: {
      appearance: {
        personal: {
          paletteId: "emerald",
          customPrimary: "#10B981",
          logoDataUrl: safeSvg,
          menuOrder: ["dashboard", "gantt", "finance"]
        },
        professional: {
          paletteId: "custom",
          customPrimary: "#e11d48",
          logoDataUrl: evilSvg,
          menuOrder: ["pro-gantt", "pro-board"]
        }
      }
    }
  });
  assert.equal(saveRes.resp.status, 200);
  const app = saveRes.json.user.appearance;
  assert.equal(app.personal.paletteId, "emerald");
  assert.equal(app.personal.customPrimary, "#10b981");
  assert.equal(app.personal.logoDataUrl, safeSvg);
  assert.deepEqual(app.personal.menuOrder, ["dashboard", "gantt", "finance"]);

  assert.equal(app.professional.paletteId, "custom");
  assert.equal(app.professional.customPrimary, "#e11d48");
  assert.equal(app.professional.logoDataUrl, "", "SVG com <script> deve ser bloqueado");
  assert.deepEqual(app.professional.menuOrder, ["pro-gantt", "pro-board"]);

  // Persiste em /api/auth/me
  const meRes = await apiJson(baseUrl, "/api/auth/me", { cookie });
  assert.equal(meRes.resp.status, 200);
  assert.equal(meRes.json.user.appearance.personal.paletteId, "emerald");
  assert.equal(meRes.json.user.appearance.professional.paletteId, "custom");

  // White-label (appName, density) & Layout (navPos, sidebarCollapsed, autoCollapseHeavy)
  const wlRes = await apiJson(baseUrl, "/api/auth/preferences", {
    method: "PUT",
    cookie,
    body: {
      appearance: {
        personal: { appName: "Minha Agenda", density: "compact" },
        professional: { appName: "FAB Ops", density: "comfortable" },
        layout: { navPos: "right", sidebarCollapsed: true, autoCollapseHeavy: true }
      }
    }
  });
  assert.equal(wlRes.resp.status, 200);
  assert.equal(wlRes.json.user.appearance.personal.appName, "Minha Agenda");
  assert.equal(wlRes.json.user.appearance.personal.density, "compact");
  assert.equal(wlRes.json.user.appearance.professional.appName, "FAB Ops");
  assert.equal(wlRes.json.user.appearance.layout.navPos, "right");
  assert.equal(wlRes.json.user.appearance.layout.sidebarCollapsed, true);
  assert.equal(wlRes.json.user.appearance.layout.autoCollapseHeavy, true);

  // Busca de logo sem chave CSE configurada -> retorna configured: false com fallback claro
  const searchRes = await apiJson(baseUrl, "/api/logo-search?q=minimal+logo", { cookie });
  assert.equal(searchRes.resp.status, 200);
  assert.equal(searchRes.json.ok, true);
  assert.equal(searchRes.json.configured, false);

  // Proteção SSRF em /api/logo-fetch (bloqueia localhost, loopback, link-local e file://)
  for (const blockedUrl of [
    "http://127.0.0.1:80/logo.png",
    "http://localhost:3080/icons/icon.svg",
    "http://169.254.169.254/latest/meta-data/",
    "file:///etc/passwd"
  ]) {
    const ssrf = await apiJson(baseUrl, "/api/logo-fetch", {
      method: "POST",
      cookie,
      body: { url: blockedUrl }
    });
    assert.equal(ssrf.resp.status, 400, `SSRF deveria bloquear ${blockedUrl}`);
  }
});

test("Personal Example Isolation (isExample) & Travel Journey AI Endpoint (v68)", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "myplan-v68-"));
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const srv = startServerInstance(tmpDir, port);

  t.after(async () => {
    await srv.stop();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  await waitForHealth(baseUrl, srv.child);

  const reg = await apiJson(baseUrl, "/api/auth/register", {
    method: "POST",
    body: { name: "Viajante", email: "viajante68@example.com", password: "Forte!Password2027" }
  });
  assert.equal(reg.resp.status, 201);
  const cookie = reg.setCookie;

  // Criar projeto de exemplo isolado + projeto real
  const exTrip = await apiJson(baseUrl, "/api/trips", {
    method: "POST",
    cookie,
    body: {
      name: "Férias Europa 2027 (Exemplo)",
      mode: "personal",
      data: { mode: "personal", isExample: true, title: "Férias Europa 2027 (Exemplo)", activities: [] }
    }
  });
  assert.equal(exTrip.resp.status, 201);

  const realTrip = await apiJson(baseUrl, "/api/trips", {
    method: "POST",
    cookie,
    body: {
      name: "Viagem Real 2027",
      mode: "personal",
      data: { mode: "personal", isExample: false, title: "Viagem Real 2027", activities: [] }
    }
  });
  assert.equal(realTrip.resp.status, 201);

  // GET /api/trips sinaliza isExample corretamente
  const listRes = await apiJson(baseUrl, "/api/trips", { cookie });
  assert.equal(listRes.resp.status, 200);
  const foundEx = listRes.json.ownTrips.find(x => x.id === exTrip.json.trip.id);
  const foundReal = listRes.json.ownTrips.find(x => x.id === realTrip.json.trip.id);
  assert.equal(foundEx.isExample, true);
  assert.equal(foundReal.isExample, false);

  // GET /api/crossings exclui estritamente projetos de exemplo (isExample: true)
  const crossRes = await apiJson(baseUrl, "/api/crossings", { cookie });
  assert.equal(crossRes.resp.status, 200);
  assert.equal(crossRes.json.trips.some(x => x.id === exTrip.json.trip.id), false);
  assert.equal(crossRes.json.trips.some(x => x.id === realTrip.json.trip.id), true);

  // POST /api/ai/travel-journey exige autenticação e responde limpo sem chave Gemini
  const unauthJ = await apiJson(baseUrl, "/api/ai/travel-journey", {
    method: "POST",
    body: { tone: "inspirador", summary: { projectTitle: "Europa 2027" } }
  });
  assert.equal(unauthJ.resp.status, 401);

  const jRes = await apiJson(baseUrl, "/api/ai/travel-journey", {
    method: "POST",
    cookie,
    body: {
      tone: "divertido",
      summary: {
        projectTitle: "Férias Europa 2027",
        totalDays: 24,
        cities: ["São Paulo", "Lisboa", "Porto", "Madrid", "Roma", "Florença", "Veneza", "Milão"],
        countries: ["Brasil", "Portugal", "Espanha", "Itália"],
        continents: ["América do Sul", "Europa"],
        flightsCount: 3,
        roadLegsCount: 5,
        totalKm: 20465
      }
    }
  });
  assert.equal(jRes.resp.status, 200);
  assert.equal(jRes.json.ok, true);
  assert.equal(jRes.json.tone, "divertido");
  assert.equal(jRes.json.usedAi, false);
});
