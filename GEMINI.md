# My Plan — Memória de Projeto, Credenciais & Operação

## Repositório & Portabilidade (Laptop / Outro PC)
- **Repositório Git**: `https://github.com/lozazizamaria/ferias-pro` (ou `myplan` se renomeado no GitHub)
- **Pasta local recomendada**: `D:\My Plan` (padrão nos dois PCs)
- **Plugins & Regras Portáteis embutidos no projeto**: `.agents/plugins/ferias-pro-architect` e `.agents/plugins/ads-intelligence-architect` (descobertos automaticamente pelo Google Antigravity ao abrir a pasta clonada no laptop).
- **Guia rápido de configuração no laptop (aeroporto/remoto)**: veja [LAPTOP-SETUP.md](./LAPTOP-SETUP.md) e o script automatizado [scripts/setup-laptop.ps1](./scripts/setup-laptop.ps1).

## Sincronização Automática Multi-PC (Regra Obrigatória)
- **Antes de iniciar qualquer análise ou edição na pasta**: execute `git pull --ff-only origin main` automaticamente para garantir que o workspace local esteja na última versão da nuvem (só interrompa e avise o usuário se houver conflito real).
- **Ao concluir qualquer alteração no projeto**: após validar com `npm run check` e conferir que `git status` não inclui segredos (`.env`, `.master.key`, `server/data/`), execute automaticamente `git add -A`, `git commit -m "<resumo claro>"` e `git push origin main` — sem esperar o usuário pedir.
- **Automação em segundo plano no Windows**: executada via `scripts/enable-auto-sync.ps1` (hook `post-commit` com push automático + tarefa agendada silenciosa `MyPlan-AutoPull` a cada 5 minutos e no logon).

## Autenticação Google OAuth
- **Google OAuth Client ID (público / site e login)**: `1075987097030-j9htnv6l02rfdbt4spbjp84btj8bopqq.apps.googleusercontent.com`
- **Google OAuth Client Secret**: armazenado localmente de forma segura no arquivo gitignored `.env` na variável `GOOGLE_CLIENT_SECRET` (nunca versionar em arquivos rastreados pelo Git).
- **Lembrete Google Cloud**: manter nas origens JavaScript autorizadas `https://myplan.digitalinpulse.com.br` (além de `https://feriaspro.digitalinpulse.com.br` durante a transição e `http://127.0.0.1:4173` / `http://localhost:3080` se testar localmente).

## Arquitetura de Segurança, Credenciais & Operação (v35)
- **Cofre Criptografado (`AES-256-GCM`)**: Segredos gravados pelo Super Admin (`db.systemSettings`) ou integrações de usuários (`geminiKeyEnc`, `gmapsKeyEnc`, `walletSaJsonEnc`) são cifrados com `MASTER_KEY` (`.env`, `>= 32` chars) ou `DATA_DIR/.master.key` (modo `0600` fora do `db.json` e dos backups). Credenciais já definidas no `.env` mantêm prioridade máxima.
- **Super Admin vs Admin Delegado**: `adelphi86@gmail.com` é Super Admin permanente. Cofre de Credenciais (`/api/admin/system-settings`), teste SMTP (`/api/admin/test-smtp`), backups compactados `.json.gz` + SHA-256 (`/api/admin/backups*`), delegação e exclusão de usuários são restritos ao Super Admin (`403` até para delegados).
- **Hardening HTTP, Sessões, IA, Carteira & Google Agenda**: Tokens de sessão armazenados em `SHA-256`, rate limit em login/cadastro/reset, headers CSP/ETag (`Cache-Control: no-cache`), Service Worker `network-first` (`v35`), auto-preenchimento instantâneo de atividades por IA Gemini (imagem/ticket, áudio e texto com fallback automático de modelos a partir de `gemini-3.8-flash`), geração automática de passes `.pkpass` / JWT da Carteira do Google com replicação de QR Code, sincronização direta/assinatura Google Agenda isolada do Client ID de Login (sem erro "Acesso bloqueado") e sistema completo de Tags multi-seleção + criação customizada nas atividades e nos filtros de Cronograma/Tabela.
- **Comandos Locais & Deploy VPS**:
  - Local: `npm run check`, `npm start`, `npm run dev`
  - Atualizar VPS (terminal SSH): `cd /var/www/MyPlan && git pull origin main && systemctl restart myplan`
