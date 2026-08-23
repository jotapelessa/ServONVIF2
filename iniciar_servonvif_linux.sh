#!/usr/bin/env bash

# ServONVIF - Inicializador Automático para Linux (Ubuntu, Debian, Fedora, Arch)
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}       🛡️ ServONVIF PRO - Inicializador para Linux              ${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# 1. Verificar Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERRO] Python 3 não encontrado!${NC}"
    echo -e "Instale com: sudo apt update && sudo apt install -y python3 python3-venv python3-pip ffmpeg"
    exit 1
fi

# 2. Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERRO] Node.js não encontrado!${NC}"
    echo -e "Instale via NodeSource (v18 ou v20): curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
fi

# 3. Configurar ambiente virtual Python
echo -e "${YELLOW}[1/3] Configurando ambiente virtual Python (.venv)...${NC}"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r engine/requirements.txt --quiet

# 4. Configurar Frontend UI
echo -e "${YELLOW}[2/3] Verificando dependências da UI (Next.js)...${NC}"
cd ui
if [ ! -d "node_modules" ]; then
    echo "Instalando módulos npm..."
    npm install --quiet
fi
cd ..

# 5. Iniciar Backend e Frontend
echo ""
echo -e "${GREEN}[3/3] 🚀 Iniciando ServONVIF Core Backend e Painel Web...${NC}"
echo -e "${CYAN}================================================================${NC}"
echo -e "  * Backend Core:  http://localhost:8080 (e IP local para Smart TV)"
echo -e "  * Painel Web:    http://localhost:3005"
echo -e "${CYAN}================================================================${NC}"
echo -e "${YELLOW}Pressione Ctrl+C para encerrar todos os serviços.${NC}"
echo ""

# Função para encerrar subprocessos ao sair
cleanup() {
    echo ""
    echo -e "${YELLOW}Encerrando ServONVIF...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Inicia Backend em background
PYTHONPATH=. python3 engine/main.py &

# Inicia Frontend
cd ui
npm run dev -- -p 3005 &
cd ..

# Mantém o script aguardando
wait
