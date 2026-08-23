#!/usr/bin/env bash
set -e

echo "=========================================="
echo "   Iniciando ServONVIF IP Monitor System  "
echo "=========================================="

# Ensure data directory
mkdir -p data/media

# Check for .env file
if [ ! -f .env ]; then
    echo "[AVISO] Arquivo .env não encontrado. Copiando do .env.example..."
    cp .env.example .env
fi

# Start Python Engine
echo "[1/2] Iniciando Motor Nativo na porta 8080..."
python3 engine/main.py &
ENGINE_PID=$!

echo "[2/2] Motor iniciado com PID: $ENGINE_PID"
echo "Acesse a documentação da API em: http://localhost:8080/docs"

wait $ENGINE_PID
