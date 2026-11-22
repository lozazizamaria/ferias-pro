---
name: ferias-pro-blueprint
description: >-
  Guia técnico completo de arquitetura, criptografia AES-256-GCM, Cofre de Credenciais,
  sessões SHA-256, auditoria, backups .json.gz, PWA network-first, design system
  responsivo e pipeline Docker/Nginx/QA do aplicativo Férias Pro (enriquecido com os
  padrões de hardening do Ads Intelligence). Use sempre ao evoluir o Férias Pro ou
  criar um novo app web/PWA nesta arquitetura.
---

# Blueprint Completo — Arquitetura & Modo de Fazer do Férias Pro

Este skill consolida toda a engenharia do **Férias Pro** para manter `D:\FÉRIAS` ou replicar sua arquitetura integralmente em novos aplicativos web/PWA (já combinada com o hardening de segurança e resiliência do **Ads Intelligence**).

## Visão Geral da Stack

- **Backend (`server/server.js`)**: HTTP/API em **Node.js (>=18.10) puro**, zero dependências NPM, `loadDotEnv()`, criptografia **`AES-256-GCM`** com `.master.key` externa (`0600`), banco JSON atômico (`db.json` via `.tmp` + `renameSync`), uploads em disco (`DATA_DIR/uploads`), sessões `randomBytes(48)` hasheadas (`SHA-256`) + sliding expiration, rate limits IP/e-mail, `scryptSync` + senha forte, Google OAuth (`aud` + `email_verified`), reset SMTP/Resend com trilha de log, multiusuário (`owner`/`editor`/`viewer`), painel **Super Admin** (`adelphi86@gmail.com`) com delegação, **Cofre de Credenciais**, **Auditoria** e **Backups `.json.gz` (SHA-256)**.
- **Frontend (`app/`)**: PWA SPA sem bundler (`index.html`, `styles.css`, `manifest.webmanifest`, `sw.js` `network-first` + `OFFLINE_API`, `como-usar.html`, `sobre.css`) em módulos `window.Ferias*` (`data.js`, `vehicles.js`, `countries.js`, `maps.js`, `calendar.js`, `report.js`, `api.js`, `app.js`).
- **Infra/Deploy**: `package.json`, `.env.example`, `Dockerfile` (Alpine zero-deps), `docker-compose.yml` (`127.0.0.1:3080:3080`) e `nginx.conf` (`client_max_body_size 35m;`, TLS 1.2/1.3, HSTS e cabeçalhos estritos).

## Documentação Modular (Carregue Conforme Necessário)

1. **Backend, Criptografia, Cofre de Credenciais, Auditoria & Backups**:
   Leia [architecture-and-backend.md](./references/architecture-and-backend.md) ao projetar ou alterar rotas `/api/*`, `.master.key` / `AES-256-GCM`, sessões, rate limits, Google OAuth, Cofre Super Admin, auditoria, backups `.json.gz` ou proxies IA/Maps/Wallet/ICS.
2. **Frontend PWA Network-First, Design System, Gantt, Financeiro & CSS Grid**:
   Leia [frontend-and-modules.md](./references/frontend-and-modules.md) ao construir telas, módulos `window.Ferias*`, SW offline `network-first`, proteção contra formula injection em XLSX/CSV, gestão de sessões, Cofre/Auditoria no Admin, Gantt/cidades/financeiro e regras anti-overflow Desktop + Mobile (`390×844`).
3. **Testes Node, Browser QA, Segurança Pré-Commit & Docker/VPS**:
   Leia [deploy-and-qa-runbook.md](./references/deploy-and-qa-runbook.md) antes de testar em `DATA_DIR` temporário, auditar `git diff --cached`, executar QA em navegador Desktop/Mobile ou subir via Docker Compose / Nginx / systemd.

## Escolha Rápida: Férias Pro vs Ads Intelligence (Novos Projetos)

- Use **Férias Pro (`ferias-pro-blueprint`)** quando quiser zero dependências NPM, setup instantâneo em 1 arquivo servidor, JSON atômico com baixa latência, apps pessoais/colaborativos ou protótipos produtivos de alta estética com PWA offline e IA/Maps.
- Escale para **Ads Intelligence (`ads-intelligence-blueprint`)** quando o domínio exigir dezenas de milhares de registros dimensionais por dia (SQLite WAL + `HAVING` + `dedup_key`), fila persistente multi-worker (`jobs`), faturamento PIX/Stripe ou multi-agência corporativa pesada.
