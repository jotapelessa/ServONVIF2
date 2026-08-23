@echo off
TITLE ServONVIF - Frontend UI (3005)
color 0B
chcp 65001 >nul

cd ui
if not exist "node_modules" (
    echo Instalando dependencias do painel Web...
    call npm install
)

echo 🚀 Iniciando Painel Web na porta 3005...
npm run dev -- -p 3005
pause
