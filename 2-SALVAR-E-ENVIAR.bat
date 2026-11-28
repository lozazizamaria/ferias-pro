@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   MY PLAN - Salvando e enviando ao GitHub
echo ============================================
echo.
echo [1/3] Verificando o codigo...
call npm run check
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Ha um erro no codigo. Corrija antes de enviar.
    pause
    exit /b 1
)

echo.
echo [2/3] Verificando alteracoes...
git status --short
git status --porcelain | findstr . >nul
if %errorlevel% neq 0 (
    echo.
    echo [OK] Nenhuma alteracao pendente. Tudo ja esta salvo no GitHub!
    echo.
    pause
    exit /b 0
)

echo.
set /p MSG="Resumo rapido da alteracao (ou aperte Enter para automatico): "
if "%MSG%"=="" set MSG=Atualizacao automatica (%COMPUTERNAME%)

echo.
echo [3/3] Enviando para o GitHub...
git add -A
git commit -m "%MSG%"
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo [AVISO] Nao foi possivel enviar. Se o outro PC enviou algo antes, rode 1-BAIXAR-ATUALIZACOES.bat primeiro.
) else (
    echo.
    echo [OK] Tudo salvo na nuvem! Ja pode continuar no outro computador.
)
echo.
pause
