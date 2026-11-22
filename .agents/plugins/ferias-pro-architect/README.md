# Férias Pro Architect (Plugin & Agente Especialista)

Este plugin encapsula toda a arquitetura, convenções de código, padrões visuais, hardening de segurança inspirado no **Ads Intelligence**, fluxos de autenticação/Super Admin, Cofre de Credenciais (`AES-256-GCM`), auditoria, backups compactados e metodologia de testes/QA do projeto **Férias Pro**.

## Conteúdo do pacote
- **Agente (`agents/ferias-pro-architect.md`)**: Especialista para evoluir o Férias Pro (`D:\FÉRIAS`) ou construir novos aplicativos nesta arquitetura — integrando também boas práticas do `ads-intelligence-architect` (e indicando quando escalar para SQLite WAL + fila `jobs`).
- **Skill (`skills/ferias-pro-blueprint/SKILL.md` + `references/`)**: Manuais modulares completos de backend, criptografia, Cofre de Credenciais, auditoria/backups, frontend PWA `network-first`/CSS responsivo e runbook de testes + Docker/Nginx/VPS.
- **Regras (`rules/AGENTS.md`)**: Invariantes permanentes de stack zero-deps, proteção de credenciais/`.env`/`GOCSPX-*`, RBAC estrito (Super Admin vs Delegado vs Usuário), CSS Grid responsivo e verificação pós-edição.
