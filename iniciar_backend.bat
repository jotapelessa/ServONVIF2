@echo off
TITLE ServONVIF - Backend Core (8080)
color 0A
chcp 65001 >nul

if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

set PYTHONPATH=.
echo 🚀 Iniciando ServONVIF Engine na porta 8080...
python engine\main.py
pause
