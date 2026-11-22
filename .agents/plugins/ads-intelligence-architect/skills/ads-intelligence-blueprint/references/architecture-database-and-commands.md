# Arquitetura, Banco de Dados, Comandos, Fila & Infraestrutura

Este manual detalha a infraestrutura técnica, todos os comandos operacionais, o modelo dimensional SQLite WAL e os motores assíncronos do **Ads Intelligence**.

---

## 1. Estrutura Canônica de Pastas

```text
ads-intelligence/
├── .env.example                 # Template seguro de variáveis de ambiente
├── .gitignore                   # Bloqueia data/, *.db*, .master.key, .env*, uploads/, reports/, backups/
├── Dockerfile                   # Node 20 Alpine + python3/make/g++/sqlite para better-sqlite3
├── docker-compose.yml           # Bind loopback 127.0.0.1:4000:4000 + volume ads_data:/app/data
├── nginx.conf                   # HTTP->HTTPS 301, TLS 1.2/1.3, headers de segurança, gzip, proxy_pass
├── package.json                 # "type": "module", engines >=20.10.0, 5 scripts NPM
├── server/
│   ├── index.js                 # Boot: migrate() -> app Express -> workers/queue/scheduler/fx -> graceful shutdown
│   ├── config.js                # ROOT, paths DATA_DIR, loadMasterKey(), SESSION_TTL_HOURS, limites, Stripe/Google
│   ├── db/
│   │   ├── index.js             # better-sqlite3 WAL + all/get/run/tx/insert/update/normalize/jsonField
│   │   ├── schema.sql           # 28 tabelas + índices por escopo e dimensões
│   │   ├── migrate.js           # Criação de schema, ensureColumn(), roles, default settings, grandfathering
│   │   ├── seed.js              # PRNG mulberry32 determinístico (clientes, campanhas, 4 níveis de métricas)
│   │   └── reset.js             # Limpeza segura com confirmação interativa "APAGAR" ou --force / -f
│   ├── middleware/
│   │   └── auth.js              # Bearer + Cookie HttpOnly -> SHA-256 session lookup -> RBAC permissions/roles
│   ├── lib/                     # Regras de negócio, parsers zero-deps, fila, relatórios, PIX, Stripe, OAuth
│   └── routes/                  # 22 routers REST sob /api/* com ApiError + wrap()
└── web/                         # Frontend PWA ES Modules sem build step
    ├── index.html
    ├── manifest.webmanifest
    ├── sw.js
    └── assets/
        ├── css/app.css
        └── js/
            ├── app.js           # Boot, rotas, SW, fallback 401/offline
            ├── core/            # dom, api, store, router, ui, charts, i18n, format
            ├── components/      # layout, filters, kpi, brand, errors, installBanner
            └── pages/           # Uma view modular por domínio
```

---

## 2. Catálogo Completo de Comandos e Infraestrutura

### Comandos NPM & CLI Node (`package.json`)
- **`npm start`** -> `node server/index.js`: aplica `migrate({ silent: true })`, inicia HTTP Express, registra handlers de worker, inicia polling da fila (`queue.js`), agendador (`scheduler.js`) e atualização de câmbio (`fx.js`), configurando `SIGINT`/`SIGTERM` com `server.close()` + `db.close()` + fallback timeout de 8s.
- **`npm run dev`** -> `node --watch server/index.js`: hot reload nativo do Node 20 sem `nodemon`.
- **`npm run migrate`** -> `node server/db/migrate.js`: só executa se chamado diretamente como entrypoint (`import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href`). Seguro e idempotente para rodar em produção antes/durante boot.
- **`npm run seed`** -> `node server/db/seed.js` (`SEED_DAYS=120` configurável): gera dados sintéticos determinísticos com `source = 'csv'` e importação registrada como `carga-demonstracao.csv` (com checksum/procedência rastreável).
- **`npm run reset`** -> `node server/db/reset.js` (aceita `--force` ou `-f` para automação): remove `.db`, `.db-wal`, `.db-shm` e esvazia `uploads/`, `reports/` e `backups/`.

### Containerização (`Dockerfile` + `docker-compose.yml`)
- **`FROM node:20-alpine`** com `RUN apk add --no-cache python3 make g++ sqlite` (necessário para compilar o binding nativo `better-sqlite3` em Alpine).
- `ENV NODE_ENV=production PORT=4000 DATA_DIR=/app/data`, `VOLUME ["/app/data"]`.
- `docker-compose.yml` expõe **`127.0.0.1:4000:4000`** (nunca `0.0.0.0:4000` direto na internet!) e monta volume nomeado `ads_data:/app/data` + `env_file: .env`.
- **Atualização em produção (VPS)**:
  ```bash
  cd /root/ads-intelligence && git pull && docker compose up -d --build
  ```

### Proxy Reverso Nginx (`nginx.conf`)
- Bloco porta `80`: redirect `301 https://$host$request_uri`.
- Bloco porta `443 ssl http2`: TLSv1.2/TLSv1.3, ciphers fortes, `HSTS`, `X-Frame-Options SAMEORIGIN`, `X-Content-Type-Options nosniff`, `X-XSS-Protection`, `Referrer-Policy strict-origin-when-cross-origin`, `gzip on`.
- **Recomendação extra para apps derivados**: configurar `client_max_body_size 85m;` no bloco `server`/`location` do Nginx quando `MAX_UPLOAD_BYTES` for 80 MB (no `ads-intelligence` o padrão Nginx sem essa diretiva limita uploads a 1 MB e quebra envio de ZIP/CSVs grandes!).

### Variáveis de Ambiente (`.env.example`)
- Servidor: `NODE_ENV`, `PORT` (`4000`), `PUBLIC_URL`, `DATA_DIR`.
- Segurança: `MASTER_KEY` (>= 32 chars; sem ela gera `DATA_DIR/.master.key`), `SESSION_TTL_HOURS` (`168` = 7 dias), `BCRYPT_ROUNDS` (`10`), `MAX_UPLOAD_BYTES` (`83886080`), `LOGIN_MAX_ATTEMPTS` (`8`).
- Admin bootstrap: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`.
- OAuth Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_LOGIN_CLIENT_ID`, `GOOGLE_LOGIN_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID`, `GOOGLE_ADS_API_VERSION` (`v17`).
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Billing/Planos Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_{STARTER|PRO|SCALE}{_|_BRL|_USD|_EUR}`.
- Background/Demo: `SCHEDULER_TICK_MS` (`60000`), `BACKUP_INTERVAL_HOURS` (`24`), `BACKUP_RETENTION` (`30`), `DEMO_RESET_INTERVAL_MINUTES` (`30`), `QUEUE_CONCURRENCY` (`2`), `QUEUE_POLL_MS` (`1500`).

---

## 3. Express App & Contrato HTTP (`server/index.js`, `lib/http.js`, `routes/index.js`)

### Ordem Crítica de Middlewares (`server/index.js`)
1. `app.set('trust proxy', 1)` — essencial atrás de Nginx para `req.ip` real (rate limiter e auditoria funcionarem por usuário real).
2. `app.disable('x-powered-by')` + headers globais de segurança (`nosniff`, `SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`).
3. **`express.raw` ANTES de `express.json`** para rotas de webhook assinado:
   ```js
   app.use('/api/plans/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
   app.use(express.json({ limit: '4mb' }));
   app.use(express.urlencoded({ extended: false, limit: '1mb' }));
   ```
4. Montagem de rotas em `routes/index.js`: rotas públicas primeiro (`/auth`, `/integrations` callback, `/signup`, `/plans` catálogo+webhook) -> `api.use(authenticate)` barreira global -> todas as rotas privadas -> `404` JSON via `ApiError.notFound`.
5. **`express.static` sem build caching bug**:
   - `etag: true, lastModified: true, index: false`.
   - Para `\.(js|css|html|webmanifest)$`: `Cache-Control: no-cache` (garante revalidação ETag e impede mistura de ES modules entre deploys). Para imagens/fontes: `max-age=86400`.
   - Fallback `*` devolve `404` para `/api/*` e extensões estáticas ausentes (nunca entrega `index.html` disfarçado de JS/CSS!), e `index.html` apenas para rotas SPA.
6. Error handler global captura `ApiError`, `entity.too.large` (`413`), registra erros 500 em `auditSystem('system.error')` e oculta stack traces em produção (`config.env === 'production'`).

### Padrão de Erro e Paginação (`lib/http.js`)
- Classe `ApiError(status, code, message, details)` com fábricas `badRequest` (400), `unauthorized` (401), `forbidden` (403), `notFound` (404), `conflict` (409), `tooLarge` (413), `rateLimited` (429), `internal` (500), mais `new ApiError(402, 'plan_limit', ...)` em `plans.js`.
- Formato JSON único de erro: `{ error: { code, message, details } }`.
- Wrapper async padrão: `wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)`.
- Paginação padronizada: `parsePagination(query, { pageSize: 25 })` (cap máximo 500) + `paged(rows, total, { page, pageSize })` retornando `{ data, pagination: { page, pageSize, total, totalPages, hasNext, hasPrev } }`.

---

## 4. Banco de Dados SQLite WAL & Modelo Dimensional (`server/db/`)

### Camada DB (`server/db/index.js`)
- Pragmas obrigatórios no startup:
  ```js
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 8000');
  ```
- Helpers síncronos finos: `all(sql, params)`, `get(sql, params)`, `run(sql, params)`, `tx(fn)`, `insert(table, data)`, `update(table, id, data)`.
- `normalize(data)`: converte `undefined -> null`, `boolean -> 1|0` e `object -> JSON.stringify`. **Atenção**: nunca interpolar nomes de colunas vindos de input do usuário em `insert`/`update` — sempre passe chaves fixas em código.
- `newId(prefix)` (`lib/ids.js`): gera IDs **ULID-like** ordenáveis por timestamp (10 chars Crockford Base32) + 80 bits aleatórios (`crypto.randomBytes(10)`). Ex.: `usr_...`, `cli_...`, `met_...`, `job_...`, `pay_...`.

### Esquema Completo (`schema.sql` — 28 Tabelas)
- **Tenancy & Config**: `agencies`, `agency_settings`, `system_settings`.
- **Auth & RBAC**: `roles`, `users`, `sessions`, `signup_requests`.
- **Clientes & Contas**: `clients`, `user_clients`, `google_ads_accounts`.
- **Hierarquia de Entidades**: `campaigns`, `ad_groups`, `ads`, `keywords` (cada um com `UNIQUE(account_id, external_id)` e `ON DELETE CASCADE`).
- **Tabela Fato**: `metrics` (granularidade `level` x entidade x `date` YYYY-MM-DD x `device` x `network` x `location`).
  - **`dedup_key TEXT NOT NULL UNIQUE`**: SHA-1 de `account_id|level|date|campaign_id|ad_group_id|ad_id|keyword_id|device|network|location`. Garante idempotência total via `ON CONFLICT(dedup_key) DO UPDATE` (`entities.js`).
  - Rastreabilidade: `source` (`csv|google_ads_api|manual`), `import_id` (`ON DELETE SET NULL`), `sync_job_id`, `imported_at`, `synced_at`.
  - Índices estratégicos: `idx_metrics_scope (client_id, account_id, level, date)`, `idx_metrics_campaign`, `idx_metrics_adgroup`, `idx_metrics_ad`, `idx_metrics_keyword`, `idx_metrics_date`, `idx_metrics_dims`.
- **Operação & Async**: `imports`, `integration_connections`, `oauth_states`, `sync_jobs`, `jobs`.
- **Alertas & Notificações**: `alert_rules`, `alerts`, `notifications`, `push_subscriptions`.
- **Relatórios Permanentes**: `reports` (`client_id` usa **`ON DELETE RESTRICT`** protegendo histórico permanente!), `report_files`, `email_logs`.
- **Auditoria, Backups, Filtros & Financeiro**: `backups`, `audit_logs`, `saved_filters`, `payments`.

### Regras de Agregação & Escopo (`lib/metrics.js`, `lib/scope.js`)
1. **Regra das Métricas Derivadas**: `metrics` grava apenas os 5 contadores base (`impressions`, `clicks`, `cost`, `conversions`, `conversion_value`). `derive(row)` calcula `ctr`, `cpc`, `cpm`, `conv_rate`, `cpa`, `roas`, `aov` sempre a partir das somas (`SUM(...)`).
2. **Prevenção de Dupla Contagem & Fallback `resolveLevel()`**:
   - Toda consulta em `metrics` filtra exatamente **um `level`**.
   - Se o dashboard solicita `level: 'campaign'` e não há linhas nesse nível, `resolveLevel()` verifica se há linhas de nível `'account'` (comum em CSVs de série temporal sem coluna de campanha) e usa `'account'` automaticamente para KPIs e gráficos — mantendo tabelas de entidade vazias quando não há campanhas reais.
3. **Exclusão de Importações Pausadas**: Tanto `buildScope()` (`metrics.js`) quanto `resolveFilters()` (`scope.js`) filtram:
   `(m.import_id IS NULL OR m.import_id NOT IN (SELECT id FROM imports WHERE status = 'paused'))`.
4. **Auto-ajuste de Período (`resolveFilters`)**: Se o preset padrão `last_30_days` (sem `start`/`end` explícito) não possuir métricas ativas para os clientes do escopo, ou se o preset for `all_recorded`, consulta `MIN(date)` e `MAX(date)` em `metrics` e ajusta `period` automaticamente para a janela real dos dados.
5. **Filtros SQL com `HAVING`**: Faixas de métricas derivadas (`min_roas`, `max_cpa`, `min_ctr`, `min_cost`, etc.) viram cláusulas SQL `HAVING` usando `HAVING_EXPR` (evita carregar mil linhas para filtrar em JS).

---

## 5. Fila Persistente, Scheduler, E-mail & Backup

### Fila Assíncrona (`server/lib/queue.js` + `workers.js`)
- Persiste jobs em `jobs` (`queued | running | retrying | completed | failed`) com `attempts`, `max_attempts` (padrão 3), `progress` (0–100) e `step`.
- **Claim em `claimNext()`**: seleciona candidatos respeitando `run_after <= now`. (Nota para apps com concorrência real ou múltiplos workers: evoluir o `UPDATE` de claim para um `UPDATE jobs SET status='running' WHERE id=@id AND status IN ('queued','retrying') RETURNING *` atômico em vez de UPDATE + SELECT separados).
- **Recuperação pós-crash (`startQueue`)**: no boot, todo job que ficou travado em `status = 'running'` é movido para `retrying` (se `attempts < max_attempts`) ou `failed`.
- **Backoff exponencial**: `Math.min(30 * 60_000, 2 ** attempts * 15_000)`.
- **Tipos registrados**: `csv_import`, `google_sync`, `report_generate`, `email_send`, `backup`, `alerts_eval`.

### Agendador (`server/lib/scheduler.js`)
- Roda a cada `SCHEDULER_TICK_MS` (`60s`) com `timer.unref?.()`:
  1. `dueAccounts()` -> enfileira `google_sync` e atualiza imediatamente `next_sync_at` (evita enfileirar duas vezes no mesmo minuto).
  2. Avaliação diária de regras de alerta na hora configurada (`alerts.evaluation_hour`, controla 1x/dia por `dayKey`).
  3. Backup automático (`backupDue()` checando se já não há job `backup` em aberto).
  4. `retryPendingEmails()` -> reenvia e-mails `pending`/`retrying` com `next_retry_at <= now` (até 5 tentativas, backoff `2**attempts * 60s`).
  5. `maybeResetDemo()` -> reconstrução determinística da agência demo pública (`demo.js`) no intervalo configurado (`30 min`), apagando apenas dados da `demoAgencyId()`.

### Backup & Failover de E-mail (`backup.js`, `mailer.js`)
- **`createBackup()`**: exporta as 25 tabelas configuradas em chunks de `BATCH = 5000` para JSON comprimido com `zlib.gzipSync(..., { level: 8 })` + manifesto de `report_files` + SHA-256 checksum, gravado em `paths.backups`. `pruneBackups()` remove excedentes mantendo no mínimo 3 (sem jamais apagar relatórios).
- **`restoreBackup()`**: exclusivo `ADMIN` + exigência de `{ confirm: 'RESTAURAR' }`. **Cria backup de segurança antes de restaurar**, desativa FKs temporariamente dentro de `db.transaction`, limpa na ordem reversa e restaura na ordem das FKs.
- **`mailer.js`**: usa pool `nodemailer` (`maxConnections: 2`). Sem SMTP configurado, grava cópia `.eml.txt` em `DATA_DIR/logs/mail/` para auditoria e registra status `failed` transparente (nunca finge ter enviado).

---

## 6. Matriz Resumida de Endpoints REST (`/api`)

- **Públicas**: `POST /auth/login`, `GET /auth/google/config|url|callback`, `POST /auth/google/verify`, `GET /integrations/google-ads/callback`, `GET /signup/enabled`, `POST /signup`, `GET /plans`, `POST /plans/webhook` (`express.raw`).
- **Auth & Sessão**: `POST /auth/logout`, `GET|PATCH /auth/me`, `POST /auth/switch-role`, `POST /auth/change-password`, `GET|DELETE /auth/sessions`.
- **Tenants & Entidades**: `/clients` (`GET/POST/PATCH/DELETE` + `/view-options` + `/:id/archive`), `/accounts`, `/campaigns` (`/:id`, `/:id/ad-groups`, `PATCH /:id`, `POST /:id/reallocate`, `DELETE /:id`), `/ads` (`PATCH`, `POST /:id/reallocate`, `DELETE`).
- **Analytics & Exports**: `/analytics` (`/overview`, `/summary`, `/timeseries`, `/breakdown/:dimension`, `/ads/insights`, `/filter-options`, `/compare`), `/exports` (`/pdf`, `/excel`, `/csv/:dimension`).
- **Dados & Integrações**: `/imports` (`/fields`, `POST /preview`, `POST /auto`, `POST /`, `GET /`, `GET /:id`, `POST /:id/reprocess`, `POST /:id/pause`, `POST /:id/resume`, `POST /bulk`, `DELETE /:id`), `/integrations` (`GET /`, `PUT /google-ads/credentials`, `POST /google-ads/connect`, `GET /google-ads/:connectionId/customers`, `POST /google-ads/link`, `DELETE /connections/:id`, `POST /sync/:accountId`, `GET /sync-jobs`).
- **Alertas, Relatórios, Financeiro, Planos & Sistema**: `/alerts`, `/notifications`, `/reports`, `/billing`, `/plans/subscription|checkout|portal`, `/users`, `/backups`, `/audit`, `/settings`, `/jobs`, `/admin/dashboard|emails`.
