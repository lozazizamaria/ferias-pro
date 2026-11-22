# Férias Pro — Memória de Projeto & Credenciais

## Autenticação Google OAuth
- **Google OAuth Client ID (público / site e login)**: `1075987097030-j9htnv6l02rfdbt4spbjp84btj8bopqq.apps.googleusercontent.com`
- **Google OAuth Client Secret**: armazenado localmente de forma segura no arquivo gitignored `D:\FÉRIAS\.env` na variável `GOOGLE_CLIENT_SECRET` (nunca versionar em arquivos rastreados pelo Git).
- **Lembrete Google Cloud**: certificar-se de que as origens JavaScript autorizadas incluam `https://feriaspro.digitalinpulse.com.br` (e `http://127.0.0.1:4173` / `http://localhost:3080` se testar localmente), e publicar o app na tela de consentimento OAuth (ou listar os usuários de teste permitidos).

## Arquitetura de Segurança, Credenciais & Operação (v24)
- **Cofre Criptografado (`AES-256-GCM`)**: Segredos gravados pelo Super Admin (`db.systemSettings`) ou integrações de usuários (`geminiKeyEnc`, `gmapsKeyEnc`, `walletSaJsonEnc`) são cifrados com `MASTER_KEY` (`.env`, `>= 32` chars) ou `DATA_DIR/.master.key` (modo `0600` fora do `db.json` e dos backups). Credenciais já definidas no `.env` mantêm prioridade máxima.
- **Super Admin vs Admin Delegado**: `adelphi86@gmail.com` é Super Admin permanente. Cofre de Credenciais (`/api/admin/system-settings`), teste SMTP (`/api/admin/test-smtp`), backups compactados `.json.gz` + SHA-256 (`/api/admin/backups*`), delegação e exclusão de usuários são restritos ao Super Admin (`403` até para delegados).
- **Hardening HTTP, Sessões & PWA**: Tokens de sessão armazenados em `SHA-256`, rate limit em login/cadastro/reset, headers CSP/ETag (`Cache-Control: no-cache`), Service Worker `network-first` (`OFFLINE_API` com `X-Offline-Cache: 1`) e sanitização contra formula injection em `.xlsx`.
- **Comandos & Blueprint**: `npm run check`, `npm start`, `npm run dev` (`docker compose up -d --build` em VPS com `nginx.conf`); referência técnica completa no plugin `ferias-pro-architect` (`skills/ferias-pro-blueprint`).
