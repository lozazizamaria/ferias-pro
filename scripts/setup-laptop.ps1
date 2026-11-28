param(
  [switch]$SkipPrompt,
  [string]$TargetPluginsDir = (Join-Path $env:USERPROFILE ".gemini\config\plugins")
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Write-Host "=== My Plan — Setup Rápido de Ambiente no Laptop ===" -ForegroundColor Cyan
Write-Host "Pasta do projeto: $repoRoot"

# 1. Verificar Git e Node.js (>= 18.10)
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "[ERRO] Git não encontrado. Instale via: winget install Git.Git" -ForegroundColor Red
  exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[ERRO] Node.js não encontrado. Instale Node.js LTS (>= 18.10) via: winget install OpenJS.NodeJS.LTS" -ForegroundColor Red
  exit 1
}

$nodeVerRaw = (& node -v).Trim()
$nodeVerNum = [version]($nodeVerRaw.TrimStart("v") -replace "-.*$", "")
if ($nodeVerNum -lt [version]"18.10.0") {
  Write-Host "[ERRO] Node.js $nodeVerRaw encontrado, mas Férias Pro exige >= v18.10.0." -ForegroundColor Red
  exit 1
}
Write-Host "[OK] Git e Node.js $nodeVerRaw verificados." -ForegroundColor Green

# 2. Instalar/atualizar os plugins locais do Antigravity (~/.gemini/config/plugins)
$srcPluginsDir = Join-Path $repoRoot ".agents\plugins"
if (Test-Path $srcPluginsDir) {
  New-Item -ItemType Directory -Force -Path $TargetPluginsDir | Out-Null
  foreach ($pluginName in @("ferias-pro-architect", "ads-intelligence-architect")) {
    $src = Join-Path $srcPluginsDir $pluginName
    if (Test-Path $src) {
      $dst = Join-Path $TargetPluginsDir $pluginName
      if (Test-Path $dst) {
        Remove-Item -Recurse -Force $dst
      }
      Copy-Item -Recurse -Force $src $dst
      Write-Host "[OK] Plugin '$pluginName' instalado em $dst" -ForegroundColor Green
    }
  }
} else {
  Write-Host "[AVISO] Pasta .agents\plugins não encontrada em $repoRoot." -ForegroundColor Yellow
}

# 3. Preparar arquivo .env local (nunca sobrescreve um .env já existente)
$envPath = Join-Path $repoRoot ".env"
$envExamplePath = Join-Path $repoRoot ".env.example"
if (-not (Test-Path $envPath)) {
  if (Test-Path $envExamplePath) {
    Copy-Item -Path $envExamplePath -Destination $envPath
    Write-Host "[OK] Arquivo .env criado a partir de .env.example." -ForegroundColor Green
  } else {
    New-Item -ItemType File -Path $envPath -Force | Out-Null
  }

  if (-not $SkipPrompt) {
    Write-Host ""
    Write-Host "Opcional: cole segredos locais para testar Google OAuth/IA fora da VPS (pressione Enter para pular):" -ForegroundColor Yellow
    $secret = Read-Host "GOOGLE_CLIENT_SECRET (ou Enter p/ pular)"
    $gemini = Read-Host "GEMINI_API_KEY (ou Enter p/ pular)"

    $lines = Get-Content -Path $envPath -Encoding UTF8
    if ($secret) {
      $lines = $lines | ForEach-Object { if ($_ -match "^GOOGLE_CLIENT_SECRET=") { "GOOGLE_CLIENT_SECRET=$secret" } else { $_ } }
    }
    if ($gemini) {
      $lines = $lines | ForEach-Object { if ($_ -match "^GEMINI_API_KEY=") { "GEMINI_API_KEY=$gemini" } else { $_ } }
    }
    Set-Content -Path $envPath -Value $lines -Encoding UTF8
  }
} else {
  Write-Host "[OK] Arquivo .env já existe — preservado sem alterações." -ForegroundColor Green
}

# 4. Ativar sincronização automática (auto-push no commit + auto-pull silencioso a cada 5 min)
$autoSyncScript = Join-Path $PSScriptRoot "enable-auto-sync.ps1"
if (Test-Path $autoSyncScript) {
  & $autoSyncScript -RepoPath $repoRoot
}

# 5. Rodar verificação de sintaxe do projeto
Push-Location $repoRoot
try {
  & npm run check
  if ($LASTEXITCODE -ne 0) {
    throw "Falha no npm run check (código $LASTEXITCODE)."
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "=== TUDO PRONTO NO LAPTOP! ===" -ForegroundColor Green
Write-Host "1. Abra o Google Antigravity e clique em 'Open Folder' -> $repoRoot"
Write-Host "2. Os agentes, skills, regras (GEMINI.md) e arquitetura ja estarão carregados."
Write-Host "3. Para rodar localmente: npm start (abre em http://127.0.0.1:3080)"
Write-Host "4. Para enviar suas alterações para a VPS depois do push: cd /var/www/MyPlan && git pull origin main && systemctl restart myplan"
