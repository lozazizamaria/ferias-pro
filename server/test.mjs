import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

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

test("My Plan Backend — Segurança, Multi-Usuário, Drive Personal/Pro, Anexos RFC 5987, Export & Flush", async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "myplan-test-"));
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let stderrBuf = "";

  const child = spawn(process.execPath, [path.join(ROOT_DIR, "server", "server.js")], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      SKIP_DOTENV: "1",
      PORT: String(port),
      HOST: "127.0.0.1",
      DATA_DIR: tmpDir,
      MASTER_KEY: "test_master_key_32_chars_minimum_ok!!"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stderr.on("data", chunk => { stderrBuf += chunk.toString("utf8"); });

  const stopServer = async () => {
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

  t.after(async () => {
    await stopServer();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  const health = await waitForHealth(baseUrl, child);
  assert.equal(health.ok, true);
  assert.equal(health.encryption, "aes-256-gcm");

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

  await t.test("RBAC bloqueia rotas do Super Admin para usuários comuns", async () => {
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

  await t.test("Coalescência de saveDb grava db.json compacto e íntegro no encerramento", async () => {
    await new Promise(r => setTimeout(r, 150));
    await stopServer();
    const dbPath = path.join(tmpDir, "db.json");
    assert.ok(fs.existsSync(dbPath), "db.json deve existir após coalescência");
    const raw = fs.readFileSync(dbPath, "utf8");
    assert.equal(raw.includes("\n  "), false, "db.json deve ser serializado em JSON compacto");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.trips[proTripId].name, "Operação Sul Atualizada");
    assert.equal(parsed.attachments[attId].fileName, "Bilhete Renomeado.txt");
    assert.equal(stderrBuf.trim(), "", `Stderr inesperado do servidor: ${stderrBuf}`);
  });
});
