# Frontend PWA Network-First, Módulos & Padrões de UI (`app/`)

## 1. Arquitetura Modular sem Bundler (`window.Ferias*`)

Módulos IIFE organizados em `app/`, servidos com `ETag` + `Cache-Control: no-cache` e versionados com `?v=NN`:
- `data.js`: catálogo uniforme `ACTIVITY_TYPES` (11 tipos: `Viagem`, `Voo`, `Trem`, `Ônibus`, `Hospedagem`, `Ingresso`, `Evento`, `Passeio`, `Restaurante`, `Período`, `Outro`), `DEFAULT_DATA` e `createBlankTripData()`.
- `vehicles.js` (`window.FeriasVehicles`), `countries.js` (`window.FeriasCountries` — DDI, DDD BR+9, resumo WhatsApp), `maps.js` (`window.FeriasMaps`), `calendar.js` (`window.FeriasCalendar`), `report.js` (`window.FeriasReport` — PDF A4 horizontal com rota estática e `.png`), `api.js` (`window.FeriasApi` — cliente HTTP, polling, detecção de cache offline e todas rotas Admin/Auth/Sessões) e `app.js` (motor reativo).

## 2. Service Worker `network-first` & Cache Offline Read-Only (`app/sw.js`)

Seguindo o padrão do **Ads Intelligence** para evitar módulos quebrados após deploy:
1. **`CACHE = "ferias-pro-vNN"`** (shell estático em `network-first`: tenta rede sempre que online para manter HTML/CSS/JS coerentes e recorre ao cache apenas offline).
2. **`DATA_CACHE = "ferias-pro-data-vNN"`** com lista **`OFFLINE_API`** (`/api/auth/me`, `/api/auth/config`, `/api/trips`, `/api/crossings`):
   - Em falha de rede, responde do cache injetando cabeçalho **`X-Offline-Cache: 1`** (capturado por `api.js` para mudar o status para `offline` `"Sem rede"`), ou devolve `503 JSON` amigável se não houver cache.
   - **Nunca** cacheia `POST`/`PUT`/`DELETE` nem anexos, `.pkpass`, `.ics` ou backups/rotas `/api/admin/*`.

## 3. Segurança Client-Side & Recursos de Conta

- **Prevenção XSS & CSS Tokens**: interpolações HTML passam por `esc()`. Tokens passados a classes/badges jamais devem conter espaços/parênteses (evita exceção `DOMTokenList.add`).
- **Prevenção Formula Injection em Planilhas (`sanitizeSpreadsheetCell` em `exportXlsx`)**: strings começando com `=`, `+`, `-`, `@`, `\t` ou `\r` recebem prefixo `'` antes de ir ao `.xlsx`/CSV.
- **Gestão de Sessões Conectadas no Perfil (`#profSessionsDetails`)**: lista sessões ativas (IP, navegador, último acesso), permite encerrar sessões individuais ou **"🚪 Encerrar outras sessões"**.
- **Limpeza anti-403 pós-troca de conta (`refreshTripsAndLoad`)**: filtra IDs salvos em `localStorage` (`SELECTED_TRIPS_KEY`) contra os IDs acessíveis da conta atual e garante criação de viagem inicial mesmo se o usuário já possuir `sharedTrips` pré-semeadas.

## 4. UI do Super Admin, Gantt, Financeiro & Armadilhas Responsivas

- **Painel Admin (`#view-admin`)**:
  - KPIs globais, delegação de administradores (`#adminDelegateForm`), sub-abas `#adminSubTabs` (`👥 Usuários`, `🗺️ Todas as Viagens`, `🔀 Sobreposições Globais`, `🔗 Compartilhamentos`, `📜 Auditoria`) + sub-aba **`🔐 Credenciais & Backups`** (`#admTabBtnVault`, visível **somente** para `isSuperAdmin === true`).
  - **Cofre de Credenciais (`#adminTab-vault`)**: exibe selos de origem (`✅ Ativo no .env`, `🔒 Cifrado AES-256-GCM`, `🌐 ID Público Padrão`, `⚠️ Não configurado`), mascara segredos com `••••••••`, permite testar envio SMTP/Resend e gerar/baixar backups `.json.gz` (com SHA-256).
- **Gantt + Fita de Cidades**: cores estáveis (`colorForCityStable`) e abreviação estrita de **3 letras em TitleCase sem ponto** (`Pir`, `São`, `Cur`) em dias estreitos.
- **Cruzamentos / Overlaps (`buildOverlapVisualPairHTML`)**: barras comparativas alinhadas por data destacando coincidências em verde `#10b981`.
- **Armadilhas CSS Grid em Modais & Mobile (`390×844`)**:
  - Todo container `display: grid` contendo tabelas (`.admin-mini-table-wrap`) ou tracks horizontais (`.overlap-track-wrap`) **deve** declarar `grid-template-columns: minmax(0, 1fr); min-width: 0;` e `> * { min-width: 0; }`.
  - No Mobile (`@media (max-width: 720px)`): `#adminSubTabs` usa `flex-wrap: wrap` (grid 2×2), `.admin-vault-grid` reduz para `minmax(0, 1fr)`, `.kpi .lbl` reduz fonte/espaçamento para não cortar palavras longas (`COMPARTILHAMENTOS`), e inputs usam `font-size: 16px`.
- **Cache Busting**: após qualquer edição JS/CSS, atualizar `?v=NN` em `app/index.html`, `app/como-usar.html` e `app/sw.js`.
