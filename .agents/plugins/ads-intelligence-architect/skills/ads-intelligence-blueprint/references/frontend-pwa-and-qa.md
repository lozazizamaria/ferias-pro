# Frontend PWA (ES Modules sem Build), Design System, QA & Deploy

Este manual documenta a arquitetura frontend zero-build, padrões de UI/SVG/i18n, estratégia PWA offline segura e o runbook obrigatório de verificação e deploy.

---

## 1. Arquitetura Frontend Zero-Build (`web/`)

### Princípio Central: ES Modules Nativos + ETag / Network-First
- **Sem bundler/transpilador (`vite`/`webpack`)**: cada arquivo é um módulo ES padrão importado a partir de `<script type="module" src="/assets/js/app.js"></script>`.
- Para evitar incompatibilidade entre módulos cacheados de versões diferentes após deploys:
  1. O servidor (`server/index.js`) serve `.js/.css/.html/.webmanifest` com **`Cache-Control: no-cache`** e `etag: true` (respostas `304 Not Modified` instantâneas).
  2. O Service Worker (`web/sw.js`) usa **`network-first` (`shellStrategy`) também para o shell** — vai à rede primeiro quando online e só recorre ao `SHELL_CACHE` offline. *(Lição explícita documentada em `sw.js`: `cache-first` no shell misturava módulos antigos e novos no primeiro reload pós-deploy!)*

### Núcleo Reativo & Helpers (`web/assets/js/core/`)
- **`dom.js` (`h()`, `mount()`, `clear()`, `icon()`, `debounce()`, `escapeHtml()`)**:
  - DSL minimalista `h('div.card.mb-16', { onclick }, [children])` criando nós nativos (`document.createElement` / `document.createElementNS` automático para tags SVG).
  - Strings filhas passam por `document.createTextNode()` (**proteção nativa contra XSS**).
  - `icon(name, size)` desenha ícones SVG inline stroke 24×24 (sem dependência de pacote de ícones nem fonte externa).
- **`router.js`**:
  - Roteamento por hash (`#/campaigns/:id?tab=1`) compatível com carregamento offline direto.
  - Suporta retorno de função de *cleanup* pelos handlers de página (`currentCleanup()` executada antes da próxima rota) e captura erros de carregamento renderizando fallback amigável via `components/errors.js`.
- **`store.js`**:
  - Estado global com padrão Pub/Sub (`subscribe(key, fn)` e wildcard `'*'`).
  - Persiste filtros globais (`clientId`, `accountId`, `preset`, `start`, `end`, `compare`, `granularity`) em `localStorage` (`ai.filters`).
  - **Proteção anti-403 pós-troca de usuário (`loadClients`)**: se o `clientId` salvo no `localStorage` não existir na lista retornada pela API do usuário atual, limpa automaticamente os filtros para visão consolidada.
  - Aplica tema (`light | dark | system`) reagindo a `prefers-color-scheme` e customiza `--primary` somente se a empresa definiu cor diferente da padrão (`#3b6cf6`).
- **`api.js` (Cliente HTTP + Cache Offline LRU Read-Only)**:
  - Anexa `Authorization: Bearer <token>` + `credentials: 'same-origin'`.
  - Mantém índice LRU em `localStorage` (`MAX_CACHE_ENTRIES = 40`) apenas para regex em `OFFLINE_CACHEABLE` (`/auth/me`, `/clients`, `/accounts`, `/analytics/*`, `/reports`, `/alerts`, `/notifications`, `/settings`).
  - **Regra de ouro**: só serve do cache em falha de rede para requisições `GET`, injetando `__offline: true` e `__cachedAt` no objeto retornado; **`POST`/`PATCH`/`DELETE`/`PUT` jamais são cacheados**.
  - `api.upload(path, formData)` envia `FormData` sem setar `Content-Type` manualmente.
  - `api.download(path, params, filename)` baixa via `fetch` com Bearer token, lê `Content-Disposition` e dispara clique em `Blob URL` com limpeza após 10s.
  - Expõe `del()` **e** alias `delete()` (evitar bug histórico `api.delete is not a function`).
- **`i18n.js` (`pt-BR`, `en`, `es`)**:
  - Todo texto visível passa por `t('chave', vars)`. Na tela de login, o usuário troca o idioma antes mesmo de autenticar.
- **`format.js`**: `Intl.NumberFormat` sensível a moeda e locale (`currency`, `currency_precise`, `currency_compact`, `percent`, `ratio`, `compact`), `formatDelta`, `timeAgo`, `whatsappLink`.

### Service Worker (`web/sw.js`) & PWA (`manifest.webmanifest`, `installBanner.js`)
- `OFFLINE_API`: lista de endpoints `GET` elegíveis para `networkFirst`, retornando cabeçalho extra `X-Offline-Cache: 1` ao servir do cache, ou `503 JSON` offline amigável se não houver cache.
- **Ignora** método diferente de `GET`, origens externas e caminhos de download (`/files/`, `/download`).
- Listeners `push` e `notificationclick` prontos (aguardando chaves VAPID caso Web Push remoto seja ativado).
- `installBanner.js`: exibe banner discreto somente em mobile não-standalone e não dispensado, tratando `beforeinstallprompt` (Android/Chrome) e instrução manual (iOS Safari).

---

## 2. Design System, Gráficos SVG & UI Responsiva

### Tokens & Estética (`web/assets/css/app.css`)
- **Tema Claro (`:root`)**: `--bg: #f5f6f8`, `--surface: #ffffff`, `--border: #e3e6ec`, `--text: #101828`, `--primary: #3b6cf6`, `--positive: #0a8a5f`, `--negative: #d64550`, `--warning: #b7791f`.
- **Tema Escuro (`:root[data-theme="dark"]`)**: cinzas profundos estilo GitHub Dark (`--bg: #0d1117`, `--surface: #161b23`, `--surface-2: #1b212b`), jamais preto `#000000`. Como sombras desaparecem no escuro, usa **`--elevation-1` / `--elevation-2` com `inset 0 1px 0 rgba(255,255,255,.035)`** dando relevo sutil.
- **Tipografia & Dados**: `font-variant-numeric: tabular-nums` em `.num`, KPIs e tabelas financeiras.
- **Badges & Armadilha `DOMTokenList`**: `badge(label, variant)` cria `span.badge.badge--${variant}`. **Nunca** passe strings com espaços ou acentos/parênteses em `variant` (ex.: `'PAUSADA (Oculta)'` lança exceção no `classList.add`); use tokens CSS válidos (`positive`, `negative`, `warning`, `info`, `ENABLED`, `PAUSED`, etc.).
- **Color Mixing Adaptativo (`billing.js`)**: Cartões coloridos usam `color-mix(in srgb, ${accent} 6%, var(--surface))` para fundo e `color-mix(in srgb, ${accent} 76%, var(--text))` para números, garantindo legibilidade tanto no tema claro quanto no escuro.

### Gráficos SVG Puros (`web/assets/js/core/charts.js`)
- Sem bibliotecas externas pesadas (Chart.js/ApexCharts):
  - **`lineChart()`**: Eixo Y esquerdo + direito automáticos (`assignAxes()` separa moeda, taxa `%` e contagens para escalas distintas não achatarem uma à outra), suavização **Catmull-Rom -> Bézier cúbica**, áreas em `linearGradient`, série tracejada de comparação, rótulos espaçados automaticamente por largura e tooltip interativo com linha vertical. *(Importante em novos apps: escapar texto antes de montar HTML no tooltip).*
  - **`barList()`**, **`donutChart()`**, **`sparkline()`** usados nos dashboards, análises cruzadas e KPIs.

### Componentes & Padrões Responsivos (`layout.js`, `filters.js`, `ui.js`, `app.css`)
- **Sidebar / Drawer Gestual (`<= 1024px`)**: `sidebar` fixa vira gaveta deslizante com suporte a toque (`touchstart`/`touchmove`/`touchend` fecha ao arrastar > 1/4 da largura), tecla `Esc`, backdrop com blur e trava de scroll no body (`body.has-drawer-open`).
- **Topbar Responsiva (`<= 720px`)**: cabeçalho reduz para 1 linha (`56px` + `env(safe-area-inset-top)`), oculta breadcrumb/subtítulo e move ações não fixadas (tudo sem `.topbar__action--pin`) para botão **"⋯" (`overflowMenuButton`)** dentro de popover.
- **Filterbar Sticky + Fade**: no celular vira faixa horizontal rolável com `mask-image` na borda direita que desaparece ao chegar ao fim (`trackScrollEnd`).
- **Tabbar Inferior Mobile**: fixa no rodapé (até 5 atalhos filtrados pelas permissões do usuário em `TAB_BAR_PATHS`), com `body.has-tabbar` reservando espaçamento inferior e oculta automaticamente em paisagem baixa (`@media (max-width: 926px) and (max-height: 480px)`).
- **Tabelas em Cartões (`table--responsive`)**: abaixo de `720px`, `<thead>` some e cada `<tr>` vira **grid de 2 colunas `grid-template-columns: repeat(2, minmax(0, 1fr))`**, com a primeira célula ocupando `grid-column: 1 / -1` e os rótulos vindos de `td::before { content: attr(data-label); }` com `min-width: 0` anti-estouro.
- **Popovers Inteligentes (`ui.js`)**: `popover()` mede altura/largura real invisível e inverte automaticamente para abrir acima (`openUp`) quando não há espaço inferior na viewport (ex.: menu do usuário no rodapé da sidebar).
- **Campos Especializados (`ui.js`)**: `passwordInput` com botão olho que re-oculta no `blur`, `phoneInput` com DDI `+55` e máscara dinâmica BR (10 ou 11 dígitos), `progressBar` animada com `transform: scaleX()` na camada de composição (sem reflow).

---

## 3. Runbook de Testes, Auditoria Pré-Commit & Deploy VPS

### 1. Verificação Estática Pós-Edição
```powershell
# Validar sintaxe ESM em todo servidor e frontend (Windows PowerShell)
Get-ChildItem -Path server, web\assets\js -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
node --check web\sw.js
```

### 2. Testes Integrados em Ambiente Isolado (Nunca Sujar `data/`)
- Suba processos de teste usando `DATA_DIR` em diretório temporário (`os.tmpdir()`) e porta dedicada (ex.: `PORT=4199`):
  - Defina `MASTER_KEY` de teste e deixe `STRIPE_SECRET_KEY`/`GOOGLE_CLIENT_ID` vazios (ou crie preload/mock de `fetch` para testar OAuth/Stripe/Frankfurter offline).
  - Execute `migrate({ silent: true })` -> `seed` ou fixtures -> teste:
    1. Isolamento cross-agency (`ADMIN` da Agência A tentando acessar `clients`, `campaigns`, `reports`, `billing`, `imports` da Agência B -> exigir `403`/`404`).
    2. Isolamento de `CLIENT` (`viewConfig` ocultando métrica no payload JSON, `campaigns.manage` bloqueado para `CLIENT`).
    3. Idempotência de CSV/ZIP (`import` -> `reimport` -> `0 inserted`, `N updated`, pausa ocultando do dashboard e `resolveFilters` ajustando datas).
    4. Financeiro (`409 overlapping_period`, `markPaid` parcial -> pago, cálculo PIX CRC-16).
    5. Backup & restore roundtrip em diretório temp + limpeza final da pasta temporária.

### 3. Browser QA Desktop (`1280×800`) + Mobile (`390×844` / `375×812`)
- Quando validar via navegador ou subagente `browser`:
  - Interagir via cliques reais e preenchimento de formulários (sem `page.evaluate()`).
  - Conferir `0` erros de console e `0` respostas HTTP inesperadas `>= 400`.
  - Inspecionar visualmente login, seletor de idioma, dashboard (KPIs + gráfico SVG duplo eixo), tabela responsiva em cards no mobile, menu overflow da topbar, modal largo, drawer da sidebar, modo escuro/claro e `document.documentElement.scrollWidth <= window.innerWidth`.

### 4. Auditoria Pré-Commit & Deploy Docker/VPS
1. Conferir `.gitignore` e inspecionar diff staged contra segredos:
   ```powershell
   git diff --cached | Select-String -Pattern "GOCSPX-|sk_live_|sk_test_|whsec_|SMTP_PASS|BEGIN PRIVATE KEY"
   ```
2. Build local / VPS:
   ```bash
   cd /root/ads-intelligence
   git pull origin main
   docker compose up -d --build
   docker compose logs --tail=60 -f
   ```
3. Verificar saúde após subir: `curl -sf http://127.0.0.1:4000/health` (esperado: `status: "ok"`, `database: "connected"`).
