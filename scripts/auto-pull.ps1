param(
  [string]$RepoPath = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "SilentlyContinue"

if (-not (Test-Path (Join-Path $RepoPath ".git"))) {
  exit 0
}

Push-Location $RepoPath
try {
  # Só faz pull automático se não houver edições locais pendentes (nunca sobrescreve trabalho em andamento)
  $status = & git status --porcelain 2>$null
  if (-not $status) {
    & git pull --ff-only --quiet origin main 2>$null
  }
} finally {
  Pop-Location
}
