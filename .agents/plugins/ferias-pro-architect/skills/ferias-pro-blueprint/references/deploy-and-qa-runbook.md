# Runbook de Testes, Browser QA, Git, Docker & Deploy VPS

## 1. Testes Automatizados em Node (Isolamento em `DATA_DIR` Temporário)

Nunca execute testes contra `D:\FÉRIAS\server\data\`. Crie diretório temporário (`os.tmpdir()` / `$env:TEMP`) para `DATA_DIR` e porta dedicada (`PORT=419x`), encerrando o processo filho no `finally`.

### Mocks Offline Disponíveis nos Scripts de Teste
- **`mock_google_preload.js`**: intercepta `fetch` para `oauth2.googleapis.com/tokeninfo` validando login OAuth e checagem de `aud`/`email_verified`.
- **`mock_gemini_preload.js`**: intercepta `generativelanguage.googleapis.com` validando payload e stripping de `;codecs=opus`.
- **`net.createServer()` SMTP Mock**: valida envio real STARTTLS/AUTH LOGIN/MAIL/DATA base64 do reset de senha e teste SMTP do Admin.

### Checklist Pós-Edição Obrigatório
```powershell
npm run check   # ou node --check em server/server.js e app/*.js
```
Rodar toda a suíte em Node cobrindo:
1. ICS feeds (`test_ics.js`), rotas base + anexos + shares (`test_v3_all.js`), Gemini IA + cruzamentos (`test_v17.js`), senha forte + SMTP reset + Google OAuth (`test_v18.js`), Super Admin + delegação + seed demo (`test_v22.js`) e **hardening completo (`test_v24.js`)**: `AES-256-GCM` `.master.key` sem texto claro em `db.json`, hash `SHA-256` em `db.sessions`, revogação de sessões ao trocar senha, rate limit `429`, ETag `304`, headers CSP/Security, acesso restrito Super Admin em `/api/admin/system-settings` & `/api/admin/backups` (bloqueando até admin delegado com `403`), backups `.json.gz` + SHA-256 e trilha `/api/admin/audit`.

## 2. Browser QA (Desktop `1280×800` + Mobile `390×844`)

1. Suba o servidor QA (`HOST=127.0.0.1`, `PORT=4173`, `DATA_DIR=$env:TEMP\...`).
2. Interaja via cliques reais, preenchimento de formulários, `boundingBox()`, logs de console/network e screenshots (**proibido `page.evaluate()`**).
3. Verifique:
   - Assets `?v=NN` carregando `HTTP 200` (e SW sem erros no console);
   - Usuário comum: sem menus/abas Admin (`403` nas APIs admin);
   - Super Admin (`adelphi86@gmail.com`): Admin + Cruzamentos + sub-aba **📜 Auditoria** + sub-aba **🔐 Credenciais & Backups** (`✅ Ativo no .env` preservado para Google OAuth + gerar backup `.json.gz` + salvar campo cifrado sem corromper `••••••••`);
   - Delegado admin: vê Auditoria, mas **NÃO vê** `🔐 Credenciais & Backups` e recebe `403` em `/api/admin/system-settings` e `/api/admin/backups`;
   - Perfil modal: exibe **📱 Sessões conectadas** e funciona **Encerrar outras sessões**;
   - Mobile `390×844`: `0px` de overflow horizontal em toda a página e modais (`#view-admin`, `#adminUserModal`, `#profileModal`), inspecionando screenshots via `read_file`.
4. Encerre o daemon (`manage_task`) e apague a pasta temporária após concluir.

## 3. Auditoria Pré-Commit & GitHub

1. Confirme no `.gitignore`: `.env`, `.env.*`, `!.env.example`, `server/data/`, `backups/`, `.master.key`, `*.master.key`, `*.json.gz`, `app/config.local.js`.
2. Valide o diff staged **antes** de cada commit contra vazamento de segredos:
   ```powershell
   git diff --cached | Select-String -Pattern "GOCSPX-|sk_live_|sk_test_|whsec_|SMTP_PASS|BEGIN PRIVATE KEY"
   ```
3. Após `git push origin main`, confirme sincronização comparando `git rev-parse HEAD` com `git ls-remote origin refs/heads/main`.

## 4. Deploy em Produção (Docker Compose ou systemd + Nginx)

- **Opção 1 — Docker Compose (padrão containerizado)**:
  - Usa `Dockerfile` (`node:20-alpine` leve sem build tools) + `docker-compose.yml` (`127.0.0.1:3080:3080` + volume persistente `ferias_data:/app/data` + `env_file: .env`).
  - Atualização na VPS: `cd /root/ferias-pro && git pull && docker compose up -d --build`.
- **Opção 2 — Node + `systemd` direto + `nginx.conf`**:
  - `nginx.conf` já inclui redirect HTTP->HTTPS, TLS 1.2/1.3, `client_max_body_size 35m;`, cabeçalhos HSTS/`X-Frame-Options`/`nosniff` e `X-Forwarded-Proto $scheme` (necessário para cookie `Secure`).
- **Healthcheck**: `curl -sf http://127.0.0.1:3080/api/health` deve retornar `"ok": true, "encryption": "aes-256-gcm"`.
