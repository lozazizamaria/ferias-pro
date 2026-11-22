# Regras Permanentes — Arquitetura Férias Pro (Hardened)

Estas regras valem ao trabalhar no **Férias Pro** ou ao criar novos apps baseados neste blueprint (incorporando as práticas de segurança do *Ads Intelligence*):

1. **Stack Zero-Dependências, PWA Network-First & Empacotamento:**
   - Backend em Node.js (`>=18.10`) puro usando módulos nativos (`node:http`, `node:fs`, `node:net`, `node:tls`, `node:zlib`, `node:path`, `node:crypto`, `node:child_process`) + escrita atômica de `db.json` (`.tmp` + `renameSync`).
   - Assets estáticos servidos com `ETag` (`304 Not Modified`), `Cache-Control: no-cache` em `.js/.css/.html/.webmanifest` e Service Worker (`sw.js`) **network-first** para shell e leituras `OFFLINE_API` essenciais (`X-Offline-Cache: 1` quando offline — **nunca** cacheando mutações `POST`/`PUT`/`DELETE` nem anexos/downloads). Incrementar `?v=NN` em `index.html`, `como-usar.html` e `sw.js` após qualquer edição JS/CSS.
   - Manter `package.json`, `.env.example`, `Dockerfile`, `docker-compose.yml` (`127.0.0.1:3080:3080`) e `nginx.conf` (`client_max_body_size 35m;`) alinhados com `.gitignore` protegendo `.env`, `server/data/`, `backups/`, `.master.key` e `*.json.gz`.

2. **Segurança, Criptografia & Credenciais (Crítico):**
   - **Zero Segredos no Código:** Nunca gravar nem commitar `GOOGLE_CLIENT_SECRET` (`GOCSPX-...`), senhas SMTP, `MASTER_KEY`, chaves Gemini/Maps/Wallet ou `.env` em arquivos versionados. Sempre checar `git diff --cached` antes de commitar. Preservar sempre as credenciais já colocadas em `.env`.
   - **Criptografia em Repouso (`AES-256-GCM`):** Toda credencial salva no banco (`users[].integrations` e `db.systemSettings`) deve ser cifrada (`encryptSecret`, formato `v1.<iv>.<tag>.<ciphertext>`) usando `MASTER_KEY` (>= 32 chars) ou `DATA_DIR/.master.key` (modo `0600`), externa ao banco e excluída dos backups. APIs mascaram saídas (`••••••••`) e ignoram placeholders no `PUT`.
   - **Sessões, Auth & Rate Limit:** Tokens `randomBytes(48)` armazenados apenas como hash **`SHA-256`** em `db.sessions`, cookie `HttpOnly; SameSite=Lax`, sliding expiration, revogação automática das demais sessões ao trocar/redefinir senha, política de senha forte (`>= 8` chars, `A-Z`, `a-z`, `0-9`, especial), validação estrita de `aud` + `email_verified` no Google OAuth e rate limiting por IP/e-mail com limpeza periódica (`429`).
   - **RBAC Estrito & Auditoria:** `adelphi86@gmail.com` é Super Admin permanente. Rotas `/api/admin/*` exigem `isAdminUser` (`403` para comuns); delegação, exclusão de usuários, Cofre de Credenciais (`/api/admin/system-settings`, `/api/admin/test-smtp`) e Backups (`.json.gz`, `/api/admin/backups*`) são **exclusivos do Super Admin** (`isSuperAdminEmail`).
   - **Proteção HTTP & Arquivos:** Enviar headers (`nosniff`, `SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, `CSP`), validar traversal com `path.resolve(...) + path.sep` e neutralizar formula injection (`=`, `+`, `-`, `@`) em planilhas `.xlsx`/CSV.

3. **Qualidade de UI & Layout CSS Grid (Desktop + Mobile):**
   - Em containers `display: grid` com tabelas largas ou timelines roláveis (`overflow-x: auto`), definir obrigatoriamente `grid-template-columns: minmax(0, 1fr)` e `min-width: 0` nos filhos.
   - Nunca passar espaços/parênteses em nomes de classes/variantes de badges. Validar Mobile (`390×844`) sem overflow horizontal nem cortes em KPIs/abas (`flex-wrap`, `font-size: 16px` em inputs).

4. **Verificação Obrigatória Pós-Edição:**
   - Após a última edição, rodar `node --check`, suíte de testes backend em `DATA_DIR` temporário isolado e QA visual no navegador Desktop (`1280×800`) + Mobile (`390×844`) sem `page.evaluate()`, reportando apenas resultados e mocks realmente observados.
