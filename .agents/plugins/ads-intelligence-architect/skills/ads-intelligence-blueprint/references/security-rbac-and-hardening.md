# Segurança, RBAC Multi-Tenant & Guia Obrigatório de Hardening

Este manual documenta os mecanismos de segurança do **Ads Intelligence** e **todos os achados críticos de auditoria** do código atual — para que novos apps nasçam 100% blindados e apps existentes sejam corrigidos sem repetir falhas.

---

## 1. Modelo de Multi-Tenancy, Papéis & Escopo

### Hierarquia Multi-Agência (`schema.sql` + `lib/scope.js`)
1. **`agencies` (Tenants)**: Cada agência (`agy_...`) tem plano próprio (`plan_id`, `plan_status`, `stripe_customer_id`, etc.), configurações isoladas em `agency_settings` (chave PIX, instruções manuais, tokens Gateway/Stripe por agência) e seus próprios usuários `ADMIN`/`MANAGER` (`users.agency_id`).
2. **`clients` (Contas Gerenciadas)**: Cada cliente final pertence a exatamente uma agência (`clients.agency_id`).
3. **`users` (`CLIENT` vs `ADMIN`/`MANAGER`)**:
   - `ADMIN`: acessa todos os `clients` onde `clients.agency_id = user.agency_id`.
   - `MANAGER`: acessa somente `clients` presentes em `user_clients` **e** pertencentes à sua `agency_id` (defesa em profundidade contra vínculos vazados).
   - `CLIENT`: `users.agency_id` é `NULL`; seu acesso deriva exclusivamente de `user_clients`, permitindo que um cliente final visualize campanhas de agências distintas simultaneamente sem misturá-las entre as agências.

### Matriz de Permissões (`server/db/migrate.js`)
| Role | Permissões |
|---|---|
| **`ADMIN`** | `users.manage`, `clients.manage`, `accounts.manage`, `integrations.manage`, `imports.manage`, `alerts.manage`, `reports.manage`, `reports.view`, `exports.create`, `backups.manage`, `audit.view`, `settings.manage`, `dashboard.view`, `campaigns.view`, `campaigns.manage`, `notifications.view`, `jobs.view`, `admin.view` |
| **`MANAGER`** | Tudo acima **EXCETO** `users.manage`, `backups.manage`, `audit.view`, `settings.manage`, `admin.view` |
| **`CLIENT`** | `dashboard.view`, `campaigns.view`, `reports.view`, `exports.create`, `notifications.view` |

> **Nota sobre evolução histórica no repo**: em `server/routes/campaigns.js` e `server/routes/ads.js`, ações destrutivas (`PATCH`, `POST /:id/reallocate`, `DELETE`) aceitaram `requirePermission('campaigns.manage', 'campaigns.view')` para contornar sessões antes da inclusão de `campaigns.manage` no `MANAGER`. Em **novos apps** ou após rodar `migrate.js`, restrinja edição/realocação/exclusão **estritamente** a `requirePermission('campaigns.manage')` para que usuários `CLIENT` (`campaigns.view`) nunca editem ou excluam campanhas!

### Visão Personalizada Filtrada no Servidor (`lib/viewConfig.js`)
- `clients.view_config` guarda `{ metrics, blocks, chartMetrics }` escolhidos pelo gestor.
- Para usuários `CLIENT`, `applyViewConfig(..., { enforce: req.user.role_id === 'CLIENT' })` remove métricas e blocos ocultos do payload JSON no backend (`routes/analytics.js`) — nunca confie só em esconder elementos no CSS!
- `reports.js` herda a mesma fonte de verdade (`mirrorView = req.body?.mirrorView ?? viewConfig.isCustomized`), gerando PDFs que espelham exatamente o que o cliente pode ver.

---

## 2. Autenticação, Sessões, Criptografia & Proteções HTTP

### Senhas & Sessões (`lib/security.js`, `middleware/auth.js`, `routes/auth.js`)
- **Hash de senha**: `bcrypt.hashSync(plain, config.security.bcryptRounds)` (`bcryptjs`, padrão 10 rounds; exigir `>= 8` caracteres, idealmente senha forte com maiúscula/minúscula/número/símbolo como no Férias Pro).
- **Tokens opacos + armazenamento por hash**:
  - `createSession()` gera 48 bytes aleatórios em `base64url` (`crypto.randomBytes(48)`).
  - Apenas `SHA-256(token)` (`token_hash`) é gravado na tabela `sessions`.
  - Aceita `Authorization: Bearer <token>` (preferido na SPA) ou cookie `ads_intel_session` com flags `httpOnly: true`, `sameSite: 'lax'`, `secure: config.publicUrl.startsWith('https://')` (para downloads diretos sem expor o token no JS).
  - **Sliding Expiration**: cada chamada autenticada renova `sessions.expires_at`.
  - **Revogação completa**: `/logout` marca `revoked_at`; `/change-password` revoga todas as demais sessões do usuário (`AND id != @keep`).

### Criptografia em Repouso (`AES-256-GCM` em `lib/security.js` + `config.js`)
- **Chave mestra externa ao banco**: `config.masterKey` vem de `SHA-256(MASTER_KEY)` (>= 32 chars) ou é gerada em `DATA_DIR/.master.key` com permissão restrita `0o600` (assim um vazamento/dump do SQLite ou backup `.json.gz` **não descriptografa** tokens OAuth).
- **Formato autenticado**: `v1.<iv_12b_b64url>.<authTag_b64url>.<ciphertext_b64url>`. Usado em `integration_connections.credentials_enc`.
- **Mascaramento de saída (`routes/settings.js`)**: segredos salvos retornam apenas `'••••••••'` + `hasValue: true`; ao receber `'••••••••'` no `PUT /settings`, o servidor ignora para não sobrescrever o segredo real.

### Proteções de Borda, Rate Limit & Uploads
- **CSP e Headers (`server/index.js`)**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`, `Content-Security-Policy`, `app.disable('x-powered-by')`.
- **Throttle em Memória**:
  - `/api/auth/login`: limite por `${req.ip}:${rawEmail}` (`8` tentativas em `15 min`). Nota: `login` aceita username sem `@` anexando `@cliente.com`.
  - `/api/signup`: limite por `req.ip` (`5` cadastros / hora). Em `auth.js` e `signup.js`, `Maps` em memória precisam de limpeza periódica (`cleanup`) em apps de longa duração para evitar crescimento ilimitado de RAM sob ataques distribuídos.
- **Upload seguro (`lib/multipart.js`, `routes/imports.js`)**:
  - Whitelist de extensões (`.csv`, `.tsv`, `.txt`, `.zip`), limite `80 MB` (`express.raw`), rejeição de arquivos vazios e rejeição de NUL bytes (`0x00`) nos primeiros 512 bytes de arquivos não-ZIP.
  - Nome original do cliente **jamais** entra no caminho em disco: grava sempre como `upl_<ULID><ext>` dentro de `paths.uploads`.
- **Prevenção de Vazamento na Demo (`routes/clients.js`, `lib/demo.js`)**:
  - Proíbe vincular e-mails de demonstração (`isDemoEmail`) a agências reais (`!isDemoAgency`), impedindo que visitantes públicos usando a senha demo enxerguem dados privados de clientes pagantes.
  - Limpa `ai.filters` do `localStorage` no frontend (`store.loadClients()`) se o cliente selecionado pertencer a outra conta que usou o mesmo navegador (evitando loops de HTTP 403).

---

## 3. AUDITORIA CRÍTICA: Achados no `ads-intelligence` para Corrigir e Nunca Replicar

Ao criar um novo app ou blindar outro projeto usando este blueprint, **NÃO copie cegamente** estes pontos encontrados na auditoria do código atual de `d:\CLAUDE\ads-intelligence` — aplique as contramedidas listadas abaixo:

### Achado 1 — Credenciais Literais Versionadas (`server/config.js` e `server/db/migrate.js`)
- **O que existe hoje**: No commit `df29f8e`, `clientId`, `clientSecret` (`GOCSPX-...`) e `developerToken` reais foram colocados como fallback em `server/config.js` (linhas 74–76) e em `DEFAULT_SETTINGS` (`server/db/migrate.js`, linhas 45–47).
- **Risco**: Exposição permanente de segredo no histórico Git e risco de uso não autorizado de cota/OAuth.
- **Boa prática obrigatória**:
  - Nunca colocar strings `GOCSPX-*`, tokens de desenvolvedor ou API keys em código versionado. Deixe fallbacks vazios (`''`) em `config.js` e `migrate.js`, lendo exclusivamente de `.env` ou do formulário administrativo gravado de forma cifrada no banco.
  - Criptografar `integrations.google_client_secret`, `integrations.google_developer_token` e `SECRET_KEYS` de `agency_settings` (`billing.mercadopago_access_token`, `billing.stripe_secret_key`) com `encryptSecret()` antes de salvar em `system_settings`/`agency_settings`!

### Achado 2 — Escalamento de Privilégios Global via Auto-Cadastro `ADMIN` + `/auth/switch-role`
- **O que existe hoje**:
  1. Em `routes/signup.js`, qualquer visitante pode criar uma conta escolhendo `role: 'ADMIN'` e ganhar uma agência própria + permissão `ADMIN` (`admin.view`, `backups.manage`, `audit.view`, `settings.manage`).
  2. Em `routes/auth.js` (`POST /api/auth/switch-role`), comentários explicam restrições de vínculo, mas os commits `9ebb4a5`/`afc1f75` removeram as checagens e hoje qualquer usuário logado (incluindo `CLIENT`) troca para `ADMIN` e cria uma agência.
  3. **Problema grave de isolamento**: As rotas globais **não filtram por agência nem diferenciam Admin de Plataforma vs Admin de Agência**:
     - `routes/admin.js` (`GET /api/admin/dashboard` & `/emails`): lista e soma **TODOS** os clientes, métricas, usuários, alertas, relatórios e logs de e-mail do servidor inteiro!
     - `routes/backups.js`: permite a qualquer `ADMIN` criar e **baixar o dump `.json.gz` do banco inteiro** (contendo hashes de senha e clientes de todas as agências!) e até executar `restoreBackup()` global!
     - `routes/audit.js` (`GET /api/audit`): expõe logs de auditoria de todas as agências.
     - `routes/integrations.js` (`GET /api/integrations` linha 41 & `GET /google-ads/:connectionId/customers` linha 100 & `DELETE /connections/:id` linha 151): consulta `integration_connections` sem filtrar por `agency_id` / `client_id` / `created_by`!
- **Boa prática obrigatória para novos apps & correção**:
  - **Separar claramente dois níveis**: `PLATFORM_ADMIN` (operador dono do SaaS, definido por env/flag `is_platform_admin` ou e-mail super-admin, único com acesso a `/admin`, `/backups`, `/audit` global e `system_settings`) vs `ADMIN` / `AGENCY_OWNER` (dono de uma agência, restrito estritamente ao próprio `agency_id`).
  - Se houver `switch-role`, exigir validação (ou restringir à demo/administração) e **jamais** dar poderes de plataforma ao role `ADMIN` de auto-cadastro!
  - Filtrar `integration_connections` e `audit_logs` por `agency_id` do solicitante em ambientes multi-agência.

### Achado 3 — Permissões Excessivas de `CLIENT` em Rotas Específicas
- **O que existe hoje**:
  - `server/routes/campaigns.js` e `server/routes/ads.js` usam `requirePermission('campaigns.manage', 'campaigns.view')` em `PATCH`, `POST /:id/reallocate` e `DELETE` — permitindo que um usuário `CLIENT` (`campaigns.view`) modifique ou delete campanhas/anúncios dos clientes aos quais tem acesso!
- **Boa prática obrigatória**: Exigir estritamente `requirePermission('campaigns.manage')` nas rotas mutáveis (`PATCH`/`POST`/`DELETE`) e `campaigns.view` apenas nas rotas `GET`.

### Achado 4 — Validação Incompleta de Google ID Token (`/api/auth/google/verify`)
- **O que existe hoje** (`server/routes/auth.js` linhas 277–286): Chama `oauth2.googleapis.com/tokeninfo?id_token=...` e usa `googleProfile.email` diretamente, sem verificar se `googleProfile.aud === config.googleLogin.clientId` nem `email_verified === true` / `'true'`.
- **Risco**: Um token JWT Google válido emitido para *outro* aplicativo OAuth na web poderia ser aceito para autenticar neste app!
- **Boa prática obrigatória**: Sempre validar `tokenInfo.aud === expectedClientId` **e** `(tokenInfo.email_verified === true || tokenInfo.email_verified === 'true')`.

### Achado 5 — Senhas Iniciais Fixas + Uploads/Exports Menores
- **Senhas fixas `'12345678'`** em `routes/clients.js` (linha 186) e `lib/autoImport.js` (linha 214) quando cria cliente sem `linkEmail`: em novos apps ou refatorações, gere senha aleatória forte (`randomToken(12)`) + link de primeiro acesso/definição de senha por e-mail (ou obrigue troca imediata no 1º login via coluna `must_change_password`).
- **Path traversal check robusto** em `routes/imports.js` linha 120: substitua `startsWith(paths.uploads...)` por `const resolved = path.resolve(filePath); const base = path.resolve(paths.uploads) + path.sep; if (!resolved.startsWith(base)) throw ApiError.forbidden(...)`.
- **CSV Formula Injection (`routes/exports.js`)**: Ao exportar strings que comecem com `=`, `+`, `-`, `@`, `\t` ou `\r`, prefixe com apóstrofo (`'`) antes de colocar aspas para evitar execução de fórmulas ao abrir no Excel.
- **XSS em tooltips (`web/assets/js/core/charts.js`)**: escape strings dinâmicas (`serie.name`, `point.label`) antes de interpolar em `tooltipNode.innerHTML = ...` (ou monte nós DOM com `h()`).
