# Abrir e Editar o My Plan no Laptop (Guia Rápido)

Todo o código, o arquivo `GEMINI.md`, as regras e os plugins completos de arquitetura (`ferias-pro-architect` e `ads-intelligence-architect`) agora moram **dentro do próprio repositório Git** (em `.agents/plugins/`). Você não precisa copiar pastas do outro computador para editar no aeroporto!

---

## 1. No laptop, clone o projeto e rode o setup automático

Abra o **PowerShell** no laptop e cole estes comandos:

```powershell
git clone https://github.com/lozazizamaria/ferias-pro.git C:\Projetos\MyPlan
cd C:\Projetos\MyPlan
powershell -ExecutionPolicy Bypass -File .\scripts\setup-laptop.ps1
```

*(Se ainda não tiver Git ou Node.js instalados no laptop, rode antes no PowerShell: `winget install Git.Git OpenJS.NodeJS.LTS` e reabra o PowerShell.)*

O script `setup-laptop.ps1`:
- Instala os plugins `ferias-pro-architect` e `ads-intelligence-architect` na pasta global do Antigravity do laptop (`%USERPROFILE%\.gemini\config\plugins\`), além de já ficarem disponíveis em `.agents\plugins\`;
- Cria seu `.env` local (se não existir) e valida tudo com `npm run check`.

---

## 2. Abrir no Google Antigravity

1. Abra o **Google Antigravity** no laptop e faça login com a mesma conta Google.
2. Clique em **Open Folder** e selecione `C:\Projetos\MyPlan`.
3. Pronto: o Antigravity já reconhece automaticamente `GEMINI.md`, as regras permanentes e os agentes `ferias-pro-architect` e `ads-intelligence-architect`.

---

## 3. Opcional: trazer seu `.env` local (se for testar login Google/IA localmente no laptop)

O arquivo `.env` não vai para o GitHub por segurança. Na VPS ele já continua salvo normalmente; caso queira testar login Google ou IA Gemini direto em `localhost` no laptop, você tem 3 caminhos fáceis:

1. Responder às perguntas opcionais do próprio script `.\scripts\setup-laptop.ps1`;
2. Copiar o seu arquivo `.env` deste computador (pendrive / gerenciador de senhas) para `C:\Projetos\MyPlan\.env`;
3. Ou puxar por `scp` da VPS (substituindo `IP_DA_VPS`):

```powershell
scp root@IP_DA_VPS:/var/www/MyPlan/.env C:\Projetos\MyPlan\.env
```
*(Obs.: se suas credenciais estiverem em `/etc/myplan.env`, ajuste o caminho de origem ou configure tudo direto no painel **Admin ➔ 🔐 Credenciais & Backups** no site.)*

---

## 4. Após fazer alterações no laptop, atualizar a VPS

No terminal do Antigravity (após `git push origin main`), conecte na VPS e rode o comando de sempre:

```bash
cd /var/www/MyPlan && git pull origin main && systemctl restart myplan
```
