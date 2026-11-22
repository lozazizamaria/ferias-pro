# Motores Zero-Dependências, Integrações Google Ads, Análise, Alertas & Billing

Este manual cobre os motores de ingestão (CSV/ZIP), geração de documentos (PDF/XLSX/PIX), integração Google Ads OAuth/GAQL, análise determinística sem alucinação e faturamento recorrente/por cobrança.

---

## 1. Parsers & Importação Tolerante (CSV / TSV / ZIP)

### Decodificação & Limpeza (`server/lib/csv.js` + `zip.js`)
- **`bufferToText(input)`**: Detecta e decodifica automaticamente:
  1. `UTF-16LE` com BOM (`0xFF 0xFE`) — formato padrão dos exportadores TSV/CSV do Google Ads.
  2. `UTF-16BE` com BOM (`0xFE 0xFF`) — inverte pares de bytes.
  3. `UTF-8` com BOM (`0xEF 0xBB 0xBF`).
  4. `UTF-16LE` **sem BOM** — heurística verificando bytes nulos em posições ímpares nos primeiros 512 bytes.
  5. `UTF-8` / fallback `Latin1` (`ISO-8859-1`).
  > **Atenção**: Em `routes/imports.js` (`/preview`) e `lib/importer.js`, garanta o uso de `bufferToText(fs.readFileSync(filePath))` (atualmente apenas `autoImport.js` chama `bufferToText`, enquanto `/preview` e `importer.js` usam `'utf8'`).
- **`detectDelimiter()`**: Testa `\t`, `,`, `;`, `|` nas primeiras 50 linhas não vazias e elege o delimitador com maior média de colunas `> 1`.
- **Preâmbulo & Linha de Totais**: `parseCsv()` ignora títulos de relatório (procura a primeira linha nas 35 iniciais com `>= 2` colunas preenchidas) e descarta rodapés `Total:`, `Total geral`, `Total da conta`, `Grand total`.
- **Dicionário PT/EN/ES (`ALIASES` + `autoMap`)**: Normaliza acentos via NFD, ignora sufixos entre parênteses/moeda (`Custo (BRL)`), e mapeia 28 campos internos. Apenas `date` é obrigatório no `validateMapping()` (`impressions/clicks/cost` assumem `DEFAULT 0`).
- **Milhar vs Decimal (`parseNumber`)**: Prioriza agrupamento exato de 3 dígitos (`^\d{1,3}(\.\d{3})+$` -> milhar `2.606` vira `2606`, não `2.606`), suporta `R$ 1.234,56`, `1,234.56`, `12,5%`, negativos `(123)` e `--`.
- **Datas (`parseDate` + `extractDateFromTextOrFilename`)**: Aceita intervalos (`01/07/2023 - 31/07/2023`), `YYYYMMDD`, `YYYY-MM-DD`, `DD/MM/YYYY`, `DD/MM/YY`, `"15 de jul. de 2026"` e mês/ano; planilhas de resumo sem coluna de data extraem fallback do preâmbulo/nome do arquivo.

### Leitor/Escritor ZIP Nativo (`server/lib/zip.js`)
- **Escrita (`createZip`)**: Gera ZIP padrão (`stored = 0` ou `deflateRaw = 8` via `node:zlib` + `crc32` em `Int32Array`). Usado para produzir arquivos `.xlsx` (OOXML) sem bibliotecas externas.
- **Leitura (`readZip` + `isZipBuffer`)**:
  - Ignora lixo de SO via `isIgnoredZipEntry()` (`__MACOSX/`, `._*`, `.DS_Store`, `thumbs.db`).
  - Estratégia 1: localiza `EOCD` (`0x06054b50`) nos últimos 65KB e lê o Central Directory (`0x02014b50`).
  - Fallback resiliente: `readZipFromLocalHeaders()` varre diretamente assinaturas locais (`0x04034b50`) caso o EOCD esteja ausente/corrompido e tenta `inflateRawSync -> inflateSync -> unzipSync`.

### Importação Automática vs Wizard (`autoImport.js` & `importer.js`)
- **Modo Direto (`POST /api/imports/auto`)**: Expande `.csv`/`.zip` (`expandUploads`), usa `forcedClientId` / `fallbackClientId` selecionados pelo usuário (ou detecta `Conta: Nome (123-456-7890)` no preâmbulo/colunas entre arquivos do mesmo lote), cria conta principal (`ensureAccountForClient`), grava arquivo em `paths.uploads`, registra `imports` e processa dentro de uma **transação única SQLite** (`db.transaction`).
- **Respeito ao Plano (`PlanLimitSkip`)**: Se o plano da agência limitar campanhas/anúncios por cliente, entidades *já existentes* continuam sendo atualizadas e excedentes são contabilizados separadamente como aviso `kind: 'plan_limit'` em vez de abortar a importação inteira.
- **Gestão do Histórico (`routes/imports.js`)**: Permite pausar (`status = 'paused'`, ocultando instantaneamente dos dashboards sem apagar), reativar (`resume`), reprocessar (`reprocess` na fila), excluir (`DELETE` transacional removendo métricas de `import_id` + arquivo no disco) e executar ações em massa (`/bulk`).

---

## 2. Exportadores Próprios de PDF 1.4 & XLSX OOXML (`pdf.js`, `xlsx.js`, `reports.js`)

### Escritor PDF 1.4 Nativo (`server/lib/pdf.js`)
- Classe `PdfDocument`: A4 (`595.28 × 841.89 pt`), fontes Base-14 (`Helvetica`, `Helvetica-Bold`) com tabela de largura exata por caractere ASCII `32..126` para quebra/truncamento preciso (`textWidth`, `truncateToWidth`), conversão `toWinAnsi` e escape de parênteses/barras.
- Primitivas gráficas: retângulos arredondados, linhas tracejadas, cartões de KPI, tabelas paginadas com cabeçalho repetido e zebra, gráficos de barras e linha SVG-like em operadores PDF (`m`, `l`, `c`, `S`, `f`), e QR Code desenhado como matriz vetorial de retângulos (`qrMatrix`).

### Escritor OOXML `.xlsx` (`server/lib/xlsx.js`)
- Monta os XMLs mínimos válidos do Excel (`[Content_Types].xml`, `_rels/.rels`, `docProps/`, `xl/workbook.xml`, `xl/styles.xml`, `xl/worksheets/sheetN.xml`) empacotados via `createZip`.
- Recursos inclusos: múltiplas abas (nome sanitizado `<= 31 chars`), títulos/notas, 10 estilos pré-definidos (cabeçalho azul `#3B6CF6` texto branco negrito, moeda `#,##0.00`, inteiro `#,##0`, percentual `0.00"%"`, razão `0.00`, data), **`pane state="frozen"`** travando linha do cabeçalho e **`<autoFilter>`** nativo.

### Relatórios Permanentes (`reports.js` & `routes/reports.js`)
- 5 templates configuráveis (`executive`, `complete`, `campaigns`, `performance`, `custom`).
- **Snapshot congelado (`buildSnapshot`)**: grava o JSON completo dos dados + idioma + opções em `reports.snapshot` para que reimprimir/regenerar anos depois reproduza os mesmos números.
- Sequencial anual protegido contra colisão (`REL-YYYY-NNNNNN`).
- Arquivos gravados em `DATA_DIR/reports/<id>/` com checksum **SHA-256** (`report_files`). FKs `ON DELETE RESTRICT` impedem apagar clientes com relatórios sem confirmação explícita de administrador (`?force=true`).
- Exportações instantâneas (`/api/exports/pdf|excel|csv/:dimension`) usam os mesmos renderizadores, respeitam todos os filtros da tela e não poluem o histórico `reports`.

---

## 3. Integração Google Ads API (OAuth + GAQL `searchStream`) (`googleAds.js`)

### Separação de Fluxos OAuth
- **Google Login (`routes/auth.js`)**: Escopo `openid email profile`, redirect `/api/auth/google/callback`, CSRF `pendingGoogleStates` em memória.
- **Google Ads API (`lib/googleAds.js` + `routes/integrations.js`)**: Escopo `https://www.googleapis.com/auth/adwords`, `access_type=offline`, `prompt=consent`, `include_granted_scopes=true`, redirect `/api/integrations/google-ads/callback`.
- **Proteção CSRF OAuth persistente**: `oauth_states` no SQLite com `expires_at` de 15 min, consumido após a troca de tokens.
- **Armazenamento seguro**: `refresh_token`, `access_token` e `expiry` criptografados com `encryptJson()` em `integration_connections.credentials_enc`.
- **Auto-refresh**: `ensureAccessToken()` verifica `expiry > now + 60s` e renova silenciosamente via `grant_type=refresh_token`.
- **Consultas GAQL (`searchStream`)**: Headers obrigatórios `Authorization: Bearer ...`, `developer-token`, e opcional `login-customer-id` (MCC). Sincroniza 4 níveis (`campaign`, `ad_group`, `ad`, `keyword`), convertendo `cost_micros / 1_000_000` e aplicando os mesmos tetos de plano (`PlanLimitSkip`).
- **Nota operacional Google Cloud Consent Screen**: Enquanto o app OAuth no Google Cloud estiver *"Em teste"*, retorna `Erro 403: access_denied` se o e-mail não estiver listado em *Público-alvo -> Usuários de teste* ou se o app não estiver *Publicado em Produção*. Em agências com MCC, conectar a MCC única lista todas as contas filhas via `customers:listAccessibleCustomers`.

---

## 4. Análise Determinística (`analysis.js`) & Alertas Inteligentes (`alerts.js`)

### Motor de Análise sem Alucinação (`server/lib/analysis.js`)
- **Regra inegociável**: 100% do texto gerado (`narrative`, `highlights`, `attention`, `changes`, `opportunities`, `recommendations`) é composto a partir de números reais consultados no período e templates i18n (`i18nServer.js`), nunca por geração probabilística ou estimativas.
- Detecta automaticamente: campanhas escaláveis (`conversions >= 3 && roas > avgRoas * 1.2 && cost < totals.cost * 0.35`), desperdício (`cost > 0 && conversions === 0`), CPA elevado (`> 1.5 * avgCpa`) e criativos de CTR baixo (`impressions > 1000 && ctr < 1`).
- Classificação (`classify`) em `EXCELENTE | BOM | ATENCAO | CRITICO` usando limiares configuráveis em `system_settings` (`keywords.thresholds`).

### Motor de Alertas (`server/lib/alerts.js`)
- 6 condições: `increase_pct`, `decrease_pct`, `change_pct`, `greater_than`, `less_than`, `zero_value`.
- Avalia janela `lookback_days` vs `compare_days` anteriores em escopo `account` ou `campaign`.
- **`cooldown_hours`**: impede disparo repetido consultando alertas recentes da mesma regra/campanha.
- Ao criar cliente novo, provisiona 5 regras padrão (`createDefaultRules`: CPA +20%, ROAS -15%, Custo +30%, Conversões -20%, Campanha sem conversões).
- Multi-canal: `in_app` / `push` (cria `notifications` para usuários com acesso ao cliente) + `email` (`queueEmail`).

---

## 5. Financeiro, PIX Offline EMV-MPM, FX & Planos SaaS (`billing.js`, `pix.js`, `fx.js`, `plans.js`)

### Financeiro & Conciliação (`billing.js`)
- **Fórmula**: `Total apurado = Ad Spend (métrica real) + Management Fee`.
  - Modelo `fixed`: rateado proporcionalmente pelos dias da janela (`(fee / daysInMonth) * days`) quando o período for menor que o mês.
  - Modelo `percent_of_spend`: `(adSpend * fee) / 100`.
- **Separação rigorosa das 4 grandezas**: `accrued` (custo medido no período), `billed` (total já lançado em `payments`), `toBill` (parcela do período ainda não cobrada) e `outstanding` (saldo em aberto de cobranças anteriores + período ainda não faturado até hoje/`periodEnd`).
- **Proteção anti-duplicidade (`HTTP 409`)**: `overlappingCharges()` detecta colisões de datas em cobranças não canceladas, recusa novo lançamento sem `force: true` e sugere o intervalo `unbilled` exato.
- **Baixa parcial acumulativa**: `markPaid()` soma pagamentos parciais (`status: 'partial'`), mudando para `'paid'` somente quando `accumulated + 0.005 >= total` (aceita `replace: true` para correções).

### Gerador PIX Local (`pix.js`) & Multi-Moeda FX (`fx.js`)
- **`buildPixPayload()`**: implementa o padrão **EMV-MPM / BR Code** do Banco Central offline (`0001` formato, `26` Merchant Account GUI `br.gov.bcb.pix` + chave + descrição sanitizada NFD, `53` moeda `986`, `54` valor `.toFixed(2)`, `58` `BR`, `59` nome, `60` cidade, `62` TXID, `6304` + **`crc16()`** polinômio `0x1021`). Combinado com `qrcode.create()` gerando matriz booleana desenhada em SVG na UI e retângulos no PDF!
- **`fx.js`**: Atualiza cotações `USD`/`EUR -> BRL` em background a cada 6h via `frankfurter.app`, cacheia em `system_settings` e cai no `FALLBACK_RATES` em offline — caminhos síncronos (`clientBilling`) jamais esperam chamada HTTP externa.

### Planos SaaS & Stripe Webhook (`plans.js`, `routes/plans.js`, `migrate.js`)
- 4 tiers (`free`, `starter`, `pro`, `scale`), onde `null` significa **ilimitado** (nunca confundir com `0`!). Preços por moeda (`BRL`, `USD`, `EUR`) definidos pelo Price ID no Stripe — sem conversão cambial enganosa no checkout.
- **Trial único por agência**: `subscription_data` só aplica `trial_period_days` se `!agency.stripe_subscription_id` (evita loop infinito de cancela-e-assina).
- **Downgrade não-destrutivo**: cancelamento rebaixa para `free` preservando todos os dados; apenas bloqueia expansão (`HTTP 402 plan_limit` ou `PlanLimitSkip` na ingestão).
- **Grandfathering (`migrate.js`)**: agências pré-existentes que já excedem o limite do plano gratuito são promovidas automaticamente ao menor plano compatível (`nextPlanFor`).
- **Fonte única de verdade**: o plano da agência só é alterado no **webhook assinado do Stripe** (`stripe().webhooks.constructEvent(req.body, ...)`), nunca pelo parâmetro de redirect do navegador!
