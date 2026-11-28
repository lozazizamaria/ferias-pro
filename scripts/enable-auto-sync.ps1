param(
  [string]$RepoPath = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

Write-Host "=== My Plan — Ativando Sincronização Automática Multi-PC ===" -ForegroundColor Cyan
Write-Host "Pasta monitorada: $RepoPath"

# 1. Instalar Git Hook post-commit (envia para o GitHub automaticamente após cada commit)
$hooksDir = Join-Path $RepoPath ".git\hooks"
if (Test-Path $hooksDir) {
  $postCommitPath = Join-Path $hooksDir "post-commit"
  $hookContent = @"
#!/bin/sh
# Envio automatico para o GitHub apos cada commit (My Plan)
git push origin main >/dev/null 2>&1 || true
"@
  [System.IO.File]::WriteAllText($postCommitPath, $hookContent.Replace("`r`n", "`n"), (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "[OK] Auto-push ativado (.git/hooks/post-commit)." -ForegroundColor Green
} else {
  Write-Host "[AVISO] Pasta .git/hooks não encontrada em $RepoPath." -ForegroundColor Yellow
}

# 2. Registrar Tarefa Agendada silenciosa no Windows (baixa atualizações ao ligar e a cada 5 minutos)
$autoPullScript = Join-Path $RepoPath "scripts\auto-pull.ps1"
$taskName = "MyPlan-AutoPull"

try {
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$autoPullScript`" -RepoPath `"$RepoPath`""
  $triggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $triggerRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -MultipleInstances IgnoreNew
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($triggerLogon, $triggerRepeat) -Settings $settings -Principal $principal -Force | Out-Null
  Write-Host "[OK] Auto-pull silencioso ativado no Windows (ao iniciar + a cada 5 min)." -ForegroundColor Green
} catch {
  Write-Host "[AVISO] Não foi possível registrar tarefa via ScheduledTask: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "Tentando via schtasks.exe..." -ForegroundColor Yellow
  $cmd = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$autoPullScript`" -RepoPath `"$RepoPath`""
  & schtasks.exe /Create /TN $taskName /TR $cmd /SC MINUTE /MO 5 /F | Out-Null
  Write-Host "[OK] Auto-pull silencioso ativado via schtasks (a cada 5 min)." -ForegroundColor Green
}

Write-Host "[OK] Sincronização automática 100% configurada!" -ForegroundColor Green
