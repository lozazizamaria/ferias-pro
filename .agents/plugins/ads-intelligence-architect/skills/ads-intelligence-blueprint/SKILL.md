---
name: ads-intelligence-blueprint
description: >-
  Blueprint técnico completo do Ads Intelligence (D:\CLAUDE\ads-intelligence):
  arquitetura Express + SQLite WAL, todos os comandos NPM/Docker/Nginx, modelo
  dimensional com deduplicação SHA-1, RBAC multi-agência, criptografia AES-256-GCM,
  hardening de segurança, fila assíncrona, geradores zero-dependências
  (CSV/ZIP/XLSX/PDF/PIX EMV), planos Stripe e PWA SPA em ES Modules nativos.
  Use ao construir um novo SaaS neste padrão, adaptar/blindar outro aplicativo
  ou evoluir o Ads Intelligence.
---

# Blueprint Técnico — Arquitetura & Boas Práticas Ads Intelligence

Este skill reúne a engenharia integral do **Ads Intelligence** para três usos práticos:
1. **Criar um novo SaaS multi-tenant do zero** usando a mesma stack enxuta, rápida e resiliente.
2. **Ajustar, refatorar ou blindar outro aplicativo** aplicando suas práticas de banco, fila, segurança e PWA.
3. **Manter e evoluir `d:\CLAUDE\ads-intelligence`** sem quebrar contratos nem introduzir regressões.

---

## Visão Geral da Stack

| Camada | Tecnologia & Decisão Arquitetural |
|---|---|
| **Runtime & Servidor** | Node.js `>=20.10.0` (`"type": "module"`), Express `4.x`, `dotenv`, sem ORM. |
| **Banco de Dados** | `better-sqlite3` em **modo WAL** (`synchronous = NORMAL`, `foreign_keys = ON`, `busy_timeout = 8000`) com **28 tabelas**, índices por escopo/dimensão e acesso isolado em `server/db/index.js` + SQL estritamente parametrizado (`@param`). |
| **Segurança & Auth** | `bcryptjs`, sessões `randomBytes(48)` hasheadas (`SHA-256`) em `sessions` + cookie `HttpOnly; SameSite=Lax`, Google OAuth 2.0 (login separado de Ads API), `AES-256-GCM` com chave mestra externa (`DATA_DIR/.master.key`), CSP + rate limits + auditoria (`audit_logs`). |
| **Processamento Async** | Fila persistente na tabela `jobs` (`queue.js` / `workers.js`) com claim otimista, recuperação de jobs após restart e retry exponencial + agendador (`scheduler.js`) com tick de 60s. |
| **Motores Próprios (Zero-Deps)** | Leitores/escritores internos para **CSV/TSV** (UTF-16LE/BE/BOM/Latin1, PT/EN/ES), **ZIP** (EOCD + scan local), **XLSX** (OOXML multi-aba com freeze/autofiltro), **PDF 1.4** (gráficos vetoriais, tabelas, WinAnsi), **PIX BR Code EMV-MPM** (CRC-16/CCITT + `qrcode`). |
| **Monetização & Financeiro** | Multi-moeda (`BRL`/`USD`/`EUR`) com FX cacheado (`fx.js` via Frankfurter API), rateio diário de honorários, cobrança anti-duplicidade HTTP 409, Stripe Checkout/Portal/Webhook (`express.raw`) e grandfathering automático de planos. |
| **Frontend PWA** | HTML + CSS Design System (`light`/`dark` `#0d1117`/`#161b23`) + Vanilla JS **ES Modules nativos sem build step**, hyperscript `h()`, gráficos SVG puros eixo duplo, i18n (`pt-BR`/`en`/`es`), cache LRU offline read-only e Service Worker `network-first`. |
| **Empacotamento & VPS** | `Dockerfile` (`node:20-alpine` + toolchain SQLite + volume `/app/data`), `docker-compose.yml` (`127.0.0.1:4000:4000`) e proxy reverso Nginx com TLS 1.2/1.3 e cabeçalhos estritos. |

---

## Catálogo Rápido de Comandos

| Comando / Operação | Efeito & Observação |
|---|---|
| `npm install` / `npm ci --only=production` | Instala as 7 dependências de produção (`express`, `better-sqlite3`, `bcryptjs`, `dotenv`, `nodemailer`, `qrcode`, `stripe`). |
| `npm run migrate` (`node server/db/migrate.js`) | Aplica `schema.sql`, executa migrações aditivas idempotentes (`ensureColumn`), faz seed de roles/settings/admin inicial, vincula órfãos à agência padrão e aplica grandfathering de planos. |
| `npm run seed` (`node server/db/seed.js`) | Gera base demonstrativa determinística (`mulberry32`, 3 clientes, ~94.320 linhas em 120 dias por padrão via `SEED_DAYS`). |
| `npm run reset` (`node server/db/reset.js [--force]`) | Operação destrutiva (exige digitar `APAGAR` ou passar `--force`/`-f`): remove SQLite + `-wal`/`-shm` e limpa `uploads/`, `reports/` e `backups/`. |
| `npm start` / `npm run dev` | Sobe API, SPA estática, workers, fila (`QUEUE_POLL_MS=1500`) e scheduler (`SCHEDULER_TICK_MS=60000`). `dev` usa `node --watch`. |
| `docker compose up -d --build` | Constrói imagem Alpine e sobe container `ads-intelligence` persistindo `ads_data:/app/data`. |
| `cd /root/ads-intelligence && git pull && docker compose up -d --build` | Atualização completa em produção no VPS Ubuntu + Docker. |

---

## Documentação Modular (`references/` — Carregue Sob Demanda)

1. **Arquitetura, Banco Dimensional, Comandos, Fila & Infra**:
   Leia [architecture-database-and-commands.md](./references/architecture-database-and-commands.md) ao estruturar diretórios, configurar `.env`/Docker/Nginx, modelar tabelas fato com `dedup_key`, implementar `queue.js`/`scheduler.js`/`backup.js` ou construir APIs `/api/*` padronizadas.
2. **Segurança, RBAC Multi-Tenant & Guia de Hardening**:
   Leia [security-rbac-and-hardening.md](./references/security-rbac-and-hardening.md) ao projetar autenticação, isolamento por agência/cliente (`scope.js`), criptografia `AES-256-GCM`, CSP/uploads e **aplicar obrigatoriamente as correções das vulnerabilidades auditadas** no repositório base.
3. **Parsers Zero-Deps, Google Ads API, Análise, Alertas & Billing**:
   Leia [integrations-engines-and-billing.md](./references/integrations-engines-and-billing.md) ao implementar importadores CSV/ZIP, exportadores PDF/XLSX, OAuth + GAQL Google Ads, resumo analítico sem alucinação, motor de alertas ou cobrança PIX/Stripe.
4. **Frontend PWA ES Modules, Design System SVG, Testes & Deploy**:
   Leia [frontend-pwa-and-qa.md](./references/frontend-pwa-and-qa.md) ao desenvolver telas com `h()`, `store.js`, `api.js` offline, `charts.js` SVG, `sw.js` `network-first`, responsividade Mobile/Desktop e validar o checklist pré-deploy.

---

## Fluxo Resumido — Novo App vs Ajuste de Outro App

### A. Construindo um Novo App do Zero neste Padrão
1. Estruture `package.json` (`type: "module"`), `.gitignore`, `.env.example`, `server/config.js` e `server/index.js` (ordem de middlewares: `trust proxy` -> CSP/headers -> `express.raw` p/ webhooks -> `express.json` -> `/api` -> `/health` -> `express.static(..., no-cache)` -> SPA fallback).
2. Crie `server/db/index.js`, `schema.sql` (IDs ULID-like `newId()`, datas ISO UTC + metric dates `YYYY-MM-DD`, FKs estritas) e `migrate.js` idempotente.
3. Garanta isolamento multi-tenant (`scope.js`) + criptografia de segredos externos (`security.js`) + **Platform Super Admin separado de Agency Admin** (hardening obrigatório!).
4. Coloque importações/exports/e-mails/backups na fila `jobs` desde o começo e construa o frontend SPA em ES Modules com `h()`, `store.js`, `sw.js` `network-first` e CSS tokens `light`/`dark`.
5. Valide sintaxe (`node --check`), rode smoke test em `DATA_DIR` temporário e inspecione visualmente Desktop + Mobile.

### B. Ajustando Outro App com as Boas Práticas do Ads Intelligence
1. **Banco & Performance**: Troque paginações/agregações em RAM por SQL parametrizado + `HAVING` + `dedup_key` SHA-1 em dados temporais; ative SQLite WAL se aplicável.
2. **Resiliência HTTP**: Tire geração de relatórios, envio SMTP e syncs do request HTTP e mova para uma tabela `jobs` + polling.
3. **Blindagem Multi-Tenant & Segredos**: Centralize escopo no servidor (`scope.js`), mova segredos de código/.db para `.env` + `AES-256-GCM`, gere tokens de sessão `SHA-256` em tabela revogável e sanitize uploads/CSVs.
4. **PWA Coerente**: Adote `Cache-Control: no-cache` + ETag e `sw.js` `network-first` para nunca servir bundle híbrido antigo/novo em atualizações sem build.
