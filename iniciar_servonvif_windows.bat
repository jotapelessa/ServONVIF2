@echo off
TITLE ServONVIF - Central de Monitoramento IP Hibrido
color 0B
chcp 65001 >nul

echo ================================================================
echo       🛡️ ServONVIF PRO - Inicializador Windows 10/11
echo ================================================================
echo.

:: 1. Verificar se o Python está instalado
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado no PATH do Windows!
    echo Por favor, instale o Python 3.10 ou superior em python.org
    echo LEMBRE-SE de marcar a opcao "Add Python to PATH" na instalacao.
    pause
    exit /b
)

:: 2. Verificar se o Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado no PATH do Windows!
    echo Por favor, instale o Node.js 18+ em nodejs.org
    pause
    exit /b
)

echo [1/4] Verificando ambiente virtual Python (.venv)...
if not exist ".venv" (
    echo Criando ambiente virtual Python...
    python -m venv .venv
)

echo [2/4] Instalando/Verificando dependencias do Backend...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r engine\requirements.txt

echo.
echo [3/4] Instalando/Verificando dependencias do Frontend UI...
cd ui
if not exist "node_modules" (
    echo Instalando pacotes do painel Web (Next.js)...
    call npm install
)
cd ..

echo.
echo [4/4] 🚀 Iniciando ServONVIF Core Backend e Painel Web...
echo.
echo ================================================================
echo  * Backend Core:  http://localhost:8080 (e IP local para Smart TV)
echo  * Painel Web:    http://localhost:3005
echo ================================================================
echo.

:: Iniciar Backend em nova janela
start "ServONVIF - Backend Core (8080)" cmd /k "chcp 65001 >nul && call .venv\Scripts\activate.bat && set PYTHONPATH=. && python engine\main.py"

:: Iniciar Frontend em nova janela
start "ServONVIF - Frontend UI (3005)" cmd /k "chcp 65001 >nul && cd ui && npm run dev -- -p 3005"

echo ✅ Servicos iniciados em janelas dedicadas!
echo Voce pode fechar esta janela agora.
timeout /t 5 >nul
