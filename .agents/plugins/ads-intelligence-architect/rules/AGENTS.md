# Regras Permanentes — Arquitetura & Boas Práticas Ads Intelligence

Estas regras aplicam-se ao evoluir o **Ads Intelligence**, criar novos SaaS do zero neste blueprint ou adaptar/blindar outro aplicativo com suas boas práticas:

1. **Stack Backend & Banco de Dados (Express + SQLite WAL):**
   - Node.js `>=20.10.0` em ESM (`"type": "module"`), Express + `better-sqlite3` com pragmas obrigatórios: `journal_mode = WAL`, `synchronous = NORMAL`, `foreign_keys = ON`, `busy_timeout = 8000`.
   - Todo SQL deve ser **exclusivamente parametrizado** (`@param`). Paginação (`LIMIT`/`OFFSET`), busca, ordenação, filtros de escopo e filtros de faixa (`HAVING`) ocorrem sempre no banco — **nunca em memória**.
   - Em tabelas fato/séries (`metrics`), manter `dedup_key` SHA-1 único + `ON CONFLICT(dedup_key) DO UPDATE` + rastreabilidade (`source`, `import_id`, `sync_job_id`). **Nunca armazene métricas derivadas** (CTR, CPC, CPM, CPA, ROAS, AOV); calcule-as na agregação a partir das somas base (`derive()`).
   - Operações pesadas (importação CSV/ZIP, sync API externa, geração PDF/XLSX, envio de e-mail, backup, avaliação de alertas) rodam sempre em **fila persistente em banco** (`jobs`) com backoff exponencial — jamais bloqueando o ciclo HTTP.
   - Em webhooks com assinatura HMAC (ex.: Stripe `/api/plans/webhook`), monte `express.raw({ type: 'application/json' })` **antes** de `express.json()`.

2. **Frontend PWA Zero-Build (ES Modules Nativos):**
   - HTML + CSS Design Tokens (`light`/`dark` `#0d1117`/`#161b23` + `--elevation-1/2`) + Vanilla JS modular (`core/dom.js` `h()`, `core/router.js`, `core/store.js`, `core/api.js`, `core/ui.js`, `core/charts.js`, `core/i18n.js`).
   - Service Worker (`sw.js`) usa **`network-first` para shell e leituras essenciais** (evita mistura de módulos ES de versões diferentes após deploy) com header `X-Offline-Cache: 1` e **nunca** cacheia `POST`/`PATCH`/`DELETE` nem downloads (`/files/`, `/download`). Assets JS/CSS/HTML servidos pelo Express usam `etag: true` e `Cache-Control: no-cache`.
   - Todo texto de interface passa por `t('chave')`. Toda construção de DOM usa `h()` / `textContent` (escape obrigatório se usar HTML em tooltips). Em `badge(label, variant)`, `variant` **nunca** pode conter espaços ou parênteses (quebra `DOMTokenList.add`).
   - Layout responsivo Mobile (`<=720px`): `.table--responsive` converte linhas em grid `repeat(2, minmax(0, 1fr))` com `min-width: 0`; topbar recolhe ações em menu overflow; `.tabbar` inferior filtra destinos por permissão e oculta em paisagem baixa (`max-height: 480px`).

3. **Segurança & Isolamento Multi-Tenant (Inviolável + Lições de Hardening):**
   - **Zero Segredos no Código:** Nunca gravar `clientSecret` (`GOCSPX-*`), `developerToken`, chaves SMTP/Stripe/PIX ou `MASTER_KEY` como fallback em `config.js`, `migrate.js` ou `web/`. Credenciais de usuário/integração vivem em `.env` (gitignored) ou cifradas em **AES-256-GCM** (`encryptSecret`, chave em `DATA_DIR/.master.key` modo `0600` ou `MASTER_KEY >= 32` chars). Checar `git diff --cached` antes de todo commit.
   - **Isolamento por Tenant (`agency_id` + `scope.js`):** Toda consulta lê escopo no servidor (`accessibleClientIds`, `assertClientAccess`, `resolveFilters`). Endpoints globais (`/admin`, `/audit`, `/backups`, `/integrations`) **não devem expor dados cross-agency** para admins de um tenant comum — separe claramente *Platform Super Admin* de *Agency Admin*, e **não permita auto-promoção** de `CLIENT` para `ADMIN` sem regra explícita ou criação de agência isolada sem privilégios globais.
   - **Auth, OAuth & Uploads:** Senhas com `bcryptjs`, sessões com `randomBytes(48)` hasheadas (`SHA-256`) na tabela `sessions` (revogar demais sessões ao trocar senha), rate limit por IP/e-mail no login e cadastro, `oauth_states` de uso único + validação estrita de `aud` e `email_verified` no Google ID Token, e **nunca gerar senhas fracas fixas** (ex.: `"12345678"`). Uploads validam extensão, limite de bytes, conteúdo binário (não-ZIP), nome gerado no servidor (`upl_<id><ext>`) e checagem com `path.resolve(...)` contra traversal; exportações CSV neutralizam formula injection (`=`, `+`, `-`, `@`).

4. **Verificação Obrigatória Pós-Edição:**
   - Rodar `node --check` nos arquivos server e `web/` alterados, verificar `schema.sql` / idempotência do `migrate.js`, testar fluxos críticos em `DATA_DIR` temporário isolado e validar UI Desktop + Mobile (`390×844` / `375×812`) sem erros de console nem overflow horizontal.
