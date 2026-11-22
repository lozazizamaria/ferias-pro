# Arquitetura Backend Zero-Dependências & Hardening (`server/server.js`)

## 1. Princípios, `.env` & Criptografia `AES-256-GCM`

- **Node.js puro (`>=18.10`)**: utiliza exclusivamente módulos nativos (`node:http`, `node:fs`, `node:net`, `node:tls`, `node:zlib`, `node:path`, `node:crypto`, `node:child_process`) + `fetch` nativo.
- **`loadDotEnv()`**: lê `../.env` e `./.env` sem sobrescrever variáveis já definidas no ambiente (`SKIP_DOTENV=1` desativa em testes isolados). **Regra:** nunca sobrescrever nem apagar credenciais já configuradas pelo usuário em `.env`.
- **Chave Mestra Externa & `AES-256-GCM` (`loadMasterKey()`, `encryptSecret()`, `decryptSecret()`)**:
  - Usa `SHA-256(MASTER_KEY)` quando `MASTER_KEY >= 32` chars, ou gera/lê `DATA_DIR/.master.key` com permissão `0o600`. Como a chave fica fora do `db.json` e fora dos backups `.json.gz`, um vazamento do banco não descriptografa segredos!
  - Formato autenticado: `v1.<iv_12b_b64url>.<authTag_b64url>.<ciphertext_b64url>`.
  - `decryptSecret()` lê transparentemente campos `*Enc` e eventuais valores legados em texto claro. `isMaskedSecret()` ignora placeholders `'••••••••'` no `PUT` para jamais corromper chaves salvas.

### Precedência de Credenciais (`getGlobalConfig()` & `getEffectiveCredentials(user)`)
1. **Integrações pessoais do usuário** (`users[].integrations.*Enc`, p/ Gemini, Maps, Wallet) →
2. **Variáveis de ambiente / `.env`** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_LOGIN_CLIENT_ID`, `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `WALLET_*`, `SMTP_*`, `RESEND_API_KEY`, `APP_BASE_URL`) →
3. **Cofre Global criptografado (`db.systemSettings`)** gerenciado pelo Super Admin na UI (`ADMIN ➔ 🔐 Credenciais & Backups`) →
4. Fallback público de `DEFAULT_GOOGLE_CLIENT_ID` (desativável via `DISABLE_DEFAULT_GOOGLE_CLIENT_ID=1`).

## 2. Banco JSON Atômico, Scheduler & Backups `.json.gz`

- `emptyDb()` cria `{ users: {}, sessions: {}, trips: {}, shares: [], attachments: {}, passwordResets: {}, admins: [], systemSettings: {}, auditLogs: [], meta: {} }`.
- **`saveDb()` atômico**: escreve em `${DB_FILE}.${process.pid}.${Date.now()}.tmp` + `fs.renameSync(tmp, DB_FILE)`.
- **Backups compactados (`createBackup`, `listBackups`, `pruneBackups`, `resolveBackupFileSafe`)**:
  - Grava em `DATA_DIR/backups/ferias-pro-backup-<timestamp>.json.gz` (via `zlib.gzipSync` nível 8) + manifesto `.meta.json` com hash **SHA-256**, tamanho e contagens, **omitindo `sessions`, `passwordResets` e `.master.key`**. Mantém retenção configurável (`BACKUP_RETENTION=15`, mín. 3).
- **Scheduler (`SCHEDULER_TICK_MS=60000`, `.unref()`) + Graceful Shutdown (`SIGINT`/`SIGTERM`)**:
  - Limpa periodicamente sessões expiradas, resets expirados, buckets de rate limit e tokens `.pkpass` temporários; gera backup automático no intervalo configurado (`BACKUP_INTERVAL_HOURS=24`, se houver usuários).

## 3. Segurança HTTP, Sessões `SHA-256`, Rate Limit & Auth

- **Headers globais (`applySecurityHeaders`)**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self), microphone=(self), camera=()`, e `Content-Security-Policy` (`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`). Respostas 500 ocultam stack traces.
- **Arquivos Estáticos (`serveStaticFile`)**: `ETag` + `304 Not Modified`, `Cache-Control: no-cache` para código/HTML/CSS/manifesto e guarda estrita `path.resolve(STATIC_DIR) + path.sep`.
- **Anexos (`DATA_DIR/uploads/<attId>`)**: limite `10 MB`, `MAX_BODY_BYTES = 32 MB`, verificação estrita `path.resolve(UPLOADS_DIR) + path.sep` e `X-Content-Type-Options: nosniff`.
- **Sessões (`createSession`, `getAuthUser`, `revokeUserSessions`)**:
  - Gera token de **48 bytes** `base64url` (`randomBytes(48)`); grava **apenas `SHA-256(token)`** em `db.sessions` (mantendo fallback compatível p/ tokens legados) com `{ userId, createdAt, lastSeenAt, expiresAt, ip, userAgent }`.
  - Cookie `fp_sid` (`HttpOnly; SameSite=Lax; Path=/` + `Secure` em HTTPS/`X-Forwarded-Proto=https`).
  - **Sliding Expiration** (renova validade a cada 5 min de atividade) e endpoints `/api/auth/sessions`, `/api/auth/sessions/revoke-others`, `DELETE /api/auth/sessions/:id`.
  - Troca de senha (`POST /api/auth/password`) revoga demais sessões automaticamente (`revokeUserSessions(u.id, auth.sidKey)`).
- **Rate Limiting (`checkRateLimit`, `pruneRateLimits`)**: `LOGIN_MAX_ATTEMPTS=8` em `15 min` por `ip:email` (`429` em brute force; zerado no sucesso), `SIGNUP_MAX_ATTEMPTS=20` em `1 h` por `ip`, e `5` em `15 min` no `/api/auth/forgot-password`.
- **Google OAuth (`verifyGoogleIdToken`)**: valida estritamente `info.aud` (aceitando `googleClientId` ou `googleLoginClientId`) e `info.email_verified === true | "true"`.
- **Auditoria de E-mail & Sistema (`auditLog`, `writeMailAuditFile`)**: ring buffer dos últimos 1000 eventos críticos em `db.auditLogs` + trilha mascarada diária em `DATA_DIR/logs/mail/mail-YYYY-MM-DD.log`.

## 4. RBAC: Usuário vs Admin Delegado vs Super Admin

- **`SUPER_ADMIN_EMAILS`**: inclui permanentemente `adelphi86@gmail.com`. `db.admins` guarda e-mails delegados.
- **Separação estrita**:
  - `isAdminUser` (`403` para comuns): `/api/admin/overview`, `/api/admin/users/:id`, `/api/admin/seed-demo`, `/api/admin/audit`, leitura em `/api/attachments/:id`.
  - **`isSuperAdminEmail` obrigatório (`403` até para admins delegados!)**: `DELETE /api/admin/users/:id`, `POST /api/admin/delegates`, `GET/PUT /api/admin/system-settings`, `POST /api/admin/test-smtp`, `GET/POST /api/admin/backups`, `GET /api/admin/backups/:name/download`.
- **Seed Demo (`ensureAdminSeedDemoData`)**: cria `rodrigo.simulado@feriaspro.demo` + `"Roteiro Sul & Litoral — Rodrigo"` + compartilhamento `viewer` aceito para demonstrar overlaps ao Super Admin.

## 5. Proxies Externos (Gemini, Maps, EPA, Wallet, ICS)

- **Gemini AI (`/api/ai/*`)**: `parseGeminiMediaPart()` remove prefixo `data:*;base64,` e parâmetros `;codecs=opus` de MIME (`audio/webm;codecs=opus` -> `audio/webm`) prevenindo erros 400 na API Google AI.
- **Maps Static (`/api/maps/static-route`)**, **EPA (`/api/vehicles/epa`)**, **Google Wallet JWT (`/api/wallet/sign`)**, **Apple `.pkpass` (`/api/wallet/pkpass*`)** e **ICS ao vivo (`/api/calendar/:token.ics`)**.
