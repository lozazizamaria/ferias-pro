@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   MY PLAN - Baixando atualizacoes do GitHub
echo ============================================
echo.
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo [AVISO] Ocorreu um problema ao baixar. Veja a mensagem acima.
) else (
    echo.
    echo [OK] Tudo atualizado! Pode comecar a trabalhar.
)
echo.
pause
