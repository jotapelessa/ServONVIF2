# ServONVIF - Sistema de Monitoramento IP Híbrido

Sistema completo de segurança e monitoramento residencial/empresarial com foco em **eficiência de processamento**, **baixa latência (< 500ms)** e **interface moderna**.

---

## 🏛️ Arquitetura do Sistema

O projeto é estruturado em 3 pilares:

1. **`engine/` (Motor Nativo):** Desenvolvido em Python 3.11+ assíncrono com FastAPI, OpenCV (MOG2 / GPU), PyAV/FFmpeg e SQLite.
   - Descoberta automática de câmeras via ONVIF WS-Discovery.
   - Buffer circular em memória RAM de 10 segundos para pré-gravação do evento.
   - Detecção de movimento em resolução 640x360 com máscaras poligonais (ROI).
   - Gravação de clipes MP4 Full HD sem re-encode (cópia direta de stream).
   - Envio de fotos e vídeos para o Telegram via Bot.
   - Broadcaster MJPEG de baixa latência e WebSocket Hub (`/ws/events`).

2. **`ui/` (Interface Web & Desktop):** Desenvolvido em Next.js 14+ (App Router) com Tailwind CSS e Zustand.
   - Exportação estática (`output: 'export'`) pronta para empacotamento com **Tauri**.
   - Grade de câmeras responsiva (1x1, 2x2, 3x3) com pulso visual de alarme.
   - Editor visual interativo de zonas de detecção de movimento (Canvas ROI Drawer).
   - Alertas sonoros sintetizados via Web Audio API.

3. **`android/` (Cliente Móvel & TV com PiP):**
   - Foreground Service com conexão WebSocket persistente e reconexão com backoff exponencial.
   - Ativação instantânea de janela flutuante **Picture-in-Picture (PiP)** sobreposta a outros aplicativos ao receber o alerta de movimento.

---

## 🚀 Como Executar (Inicialização em 1 Clique)

### 🪟 Windows 10/11
Dê um duplo-clique no arquivo ou execute no Prompt/PowerShell:
```bat
iniciar_servonvif_windows.bat
```

### 🍎 macOS (Apple Silicon M1/M2/M3/M4 & Intel)
No Terminal:
```bash
./iniciar_servonvif_mac.sh
```

### 🐧 Linux (Ubuntu, Debian, Fedora, Arch)
No Terminal:
```bash
./iniciar_servonvif_linux.sh
```

### 🐳 Docker / Docker Compose
```bash
docker-compose up -d --build
```

---

## 🌐 Portas & Endereços Padrão
* **Painel Web:** [http://localhost:3005](http://localhost:3005)
* **Backend API & Swagger:** [http://localhost:8080/docs](http://localhost:8080/docs)
* **WebSocket de Eventos (TV/Tablets):** `ws://IP_LOCAL:8080/ws/events`
* **Mosaico ao Vivo:** [http://localhost:3005/cameras/](http://localhost:3005/cameras/)
* **Controle de Backup & Standby:** [http://localhost:3005/settings/backup](http://localhost:3005/settings/backup)

---

## 📄 Documentação Completa da Arquitetura
Consulte o arquivo de arquitetura:
- `hybrid_ip_monitoring_architecture.md`
