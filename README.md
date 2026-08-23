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

## 🚀 Como Executar

### 1. Executando o Motor Nativo (`engine/`)

```bash
cd engine
pip install -r requirements.txt
python main.py
```
> O servidor iniciará em `http://0.0.0.0:8080`.
> Documentação OpenAPI Swagger disponível em: `http://localhost:8080/docs`.

### 2. Executando a Interface Web (`ui/`)

```bash
cd ui
npm install
npm run dev
```
> Acesse o painel em `http://localhost:3000`.

Para gerar o build estático para empacotar com Tauri ou servir diretamente pela Engine:
```bash
npm run build
```

---

## 📄 Documentação Completa da Arquitetura
Consulte o arquivo de arquitetura aprovado:
- [`hybrid_ip_monitoring_architecture.md`](file:///Users/jotapelessa/.gemini/antigravity/brain/607238d4-cb15-4213-b398-67e884ade917/hybrid_ip_monitoring_architecture.md)
