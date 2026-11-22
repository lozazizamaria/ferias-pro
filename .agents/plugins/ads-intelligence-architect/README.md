# Ads Intelligence Architect (Plugin, Agente & Skill Blueprint)

Este plugin consolida toda a engenharia, comandos operacionais, arquitetura backend/frontend, padrões de segurança e lições de hardening do projeto **Ads Intelligence** (`d:\CLAUDE\ads-intelligence`).

## Conteúdo do Pacote

- **Agente (`agents/ads-intelligence-architect.md`)**: Especialista para construir novos aplicativos SaaS multi-tenant do zero neste padrão, adaptar/elevar projetos existentes com as boas práticas do Ads Intelligence, ou manter/auditar o próprio repositório.
- **Skill (`skills/ads-intelligence-blueprint/SKILL.md` + `references/`)**: Documentação modular profunda cobrindo:
  - `references/architecture-database-and-commands.md`: Comandos NPM/Docker/Nginx, Express, SQLite WAL (28 tabelas), modelo dimensional + tabela fato `metrics` (`dedup_key`), fila persistente (`jobs`) e agendador (`scheduler`).
  - `references/security-rbac-and-hardening.md`: Segurança, RBAC multi-agência (`agency_id` + `user_clients`), `AES-256-GCM`, sessões `HttpOnly` + `SHA-256`, CSP, rate limiters e **guia crítico de hardening** corrigindo vulnerabilidades reais auditadas no projeto original.
  - `references/integrations-engines-and-billing.md`: Motores zero-dependências (`csv.js`, `zip.js`, `xlsx.js`, `pdf.js`, `pix.js`), OAuth Google Ads / GAQL, análise determinística sem alucinação (`analysis.js`), alertas (`alerts.js`) e financeiro/Stripe (`billing.js`, `plans.js`, `fx.js`).
  - `references/frontend-pwa-and-qa.md`: SPA sem build em ES Modules (`dom.js`, `router.js`, `store.js`, `api.js`), Design System Light/Dark + responsividade mobile (`390×844`), gráficos SVG puros (`charts.js`), Service Worker (`network-first`), i18n (`pt-BR`/`en`/`es`) e runbook de QA/deploy.
- **Regras (`rules/AGENTS.md`)**: Invariantes permanentes de arquitetura, segurança, isolamento multi-tenant, UI/PWA e verificação pós-edição.
