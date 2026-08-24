#!/usr/bin/env bash

# ServONVIF - Inicializador Automático para macOS (Apple Silicon / Intel)
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}       🛡️ ServONVIF PRO - Inicializador macOS                   ${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# 1. Verificar Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERRO] Python 3 não encontrado!${NC}"
    echo -e "Instale via Homebrew: brew install python@3.11"
    exit 1
fi

# 2. Verificar Node.js & npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERRO] Node.js não encontrado!${NC}"
    echo -e "Instale via Homebrew: brew install node"
    exit 1
fi

# 3. Verificar Tesseract OCR e FFmpeg (Homebrew)
if ! command -v tesseract &> /dev/null; then
    echo -e "${YELLOW}[AVISO] Tesseract OCR não detectado.${NC}"
    echo -e "Para leitura de placas (LPR), execute: brew install tesseract"
    echo ""
fi

if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}[AVISO] FFmpeg não detectado.${NC}"
    echo -e "Para codificação ultra-rápida de vídeos MP4, execute: brew install ffmpeg"
    echo ""
fi

# 4. Configurar ambiente virtual Python (.venv)
echo -e "${YELLOW}[1/3] Verificando ambiente virtual Python (.venv)...${NC}"
if [ ! -d ".venv" ]; then
    echo "Criando ambiente virtual Python..."
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip --quiet
echo "Instalando/atualizando dependências do Python..."
pip install -r engine/requirements.txt --quiet

# 5. Configurar Frontend UI (Next.js)
echo -e "${YELLOW}[2/3] Verificando dependências do Painel Web (Next.js)...${NC}"
cd ui
if [ ! -d "node_modules" ]; then
    echo "Instalando módulos npm do Next.js..."
    npm install --quiet
fi
cd ..

# 6. Iniciar Servidores
echo ""
echo -e "${GREEN}[3/3] 🚀 Iniciando ServONVIF Core Backend e Painel Web...${NC}"
echo -e "${CYAN}================================================================${NC}"
echo -e "  * Backend Core:  http://localhost:8080 (e IP local para Smart TV)"
echo -e "  * Painel Web:    http://localhost:3005"
echo -e "${CYAN}================================================================${NC}"
echo -e "${YELLOW}Pressione Ctrl+C para encerrar todos os serviços.${NC}"
echo ""

cleanup() {
    echo ""
    echo -e "${YELLOW}Encerrando ServONVIF com segurança...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Iniciar Backend com prevenção de suspensão de sistema (caffeinate)
caffeinate -s -i -m env PYTHONPATH=. python3 engine/main.py &

# Iniciar Frontend
cd ui
npm run dev -- -p 3005 &
cd ..

wait
