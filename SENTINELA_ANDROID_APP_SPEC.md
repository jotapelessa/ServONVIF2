# 📱 SENTINELA CLIENT APK — ESPECIFICAÇÃO MESTRA PARA ANDROID TV, TABLETS E SMARTPHONES

---

## 1. VISÃO GERAL DO PROJETO E ARQUITETURA DUAL-TARGET

### 1.1 Objetivo do Aplicativo
O **Sentinela Client APK** é um aplicativo Android nativo unificado desenvolvido para operar perfeitamente em dois perfis distintos de hardware dentro do ecossistema do **Frigate NVR / Sentinela**:

1. **Perfil Android TV / Fire TV (Navegação D-Pad / 10-foot UI):** Aplicativo de vigilância de sala de estar e segurança com foco em exibição em mosaico de câmeras, janelas flutuantes Picture-in-Picture (PiP) automáticas sobre outros apps (Netflix, YouTube, canais ao vivo) e alertas em tempo real.
2. **Perfil Smartphone e Tablet de Parede (Touch UI / Kiosk Mode):** Aplicativo de controle tátil, monitoramento ao vivo em alta definição, painel de status de veículos (LPR Mercosul) e transmissor de câmera (transforma smartphones antigos em câmeras IP de segurança integradas ao Frigate).

---

## 2. MATRIZ DE RECURSOS, FERRAMENTAS E CONFIGURAÇÕES POR PERFIL

### 2.1 Tabela de Recursos Homologados

| Recurso / Ferramenta | Android TV / Fire TV | Tablet Kiosk (Parede) | Smartphone Android |
| :--- | :---: | :---: | :---: |
| **Picture-in-Picture (PiP) Flutuante** | ✅ Automático / D-Pad | ✅ Nativo Android | ✅ Nativo Android |
| **Mosaico ao Vivo WebRTC (< 50ms)** | ✅ Grid 2x2 / 3x3 | ✅ Grid Tátil | ✅ Grid Responsivo |
| **Alertas de Placas Mercosul (LPR)** | ✅ Banner Heads-Up | ✅ Modal Detalhado | ✅ Push Notification |
| **Transmissor Câmera IP (RTSP/HTTP)** | ❌ | ✅ Câmera Frontal | ✅ Câmeras Traseira/Frontal |
| **Acendimento de Tela (Wake-on-Motion)** | ❌ (Sempre ligada) | ✅ Sensor/Evento | ❌ |
| **Navegação 100% por Controle Remoto** | ✅ D-Pad + Teclas Rápidas | ❌ (Touch) | ❌ (Touch) |
| **Pareamento por QR Code / PIN** | ✅ Exibição na TV | ✅ Leitor / Entrada | ✅ Leitor / Entrada |

---

## 3. ESPECIFICAÇÃO DETALHADA DOS MÓDULOS DO APLICATIVO

```
+-----------------------------------------------------------------------------------------------+
|                                    SENTINELA ANDROID CLIENT APK                               |
|                                                                                               |
|  +---------------------------+       +---------------------------+       +-----------------+  |
|  |     RECEPTOR DE VÍDEO     |       |    MOTOR DE PiP FLUTUANTE |       |  PAREAMENTO E   |  |
|  |  - WebRTC nativo (go2rtc) | <---> |  - Janela sobreposta (TV) | <---> |  IDENTIDADE     |  |
|  |  - Hardware Decoder QSV   |       |  - Temporizador auto-close|       |  - UUID único   |  |
|  |  - Latência < 50ms        |       |  - Expansão para Fullscreen|      |  - Auto-mDNS    |  |
|  +---------------------------+       +---------------------------+       +-----------------+  |
|               ^                                   ^                               ^           |
|               |                                   |                               |           |
|               v                                   v                               v           |
|  +---------------------------+       +---------------------------+       +-----------------+  |
|  |   TRANSMISSOR DE CÂMERA   |       |   GATEWAY DE EVENTOS MQTT |       |  PAINEL KIOSK   |  |
|  |  - Servidor RTSP/MJPEG    |       |   - Alertas LPR Mercosul  |       |  - Wake-screen  |  |
|  |  - Captura Frontal/Traseira|      |   - Notificações de Pessoas|      |  - Relógio/AOD  |  |
|  +---------------------------+       +---------------------------+       +-----------------+  |
+-----------------------------------------------------------------------------------------------+
```

---

## 4. MÓDULO 1: MOTOR DE PICTURE-IN-PICTURE (PiP) PARA SMART TVS

### 4.1 Comportamento do PiP em Segundo Plano
- **Serviço em Background (Android Foreground Service):** O app mantém um serviço leve escutando o barramento WebSocket / MQTT do servidor Sentinela mesmo com a TV em outros aplicativos.
- **Disparo Automático de Janela Flutuante:** Quando o Frigate detecta um evento prioritário (ex: pessoa no portão ou veículo na garagem), o serviço sobrepõe imediatamente uma janela PiP de vídeo WebRTC no canto superior direito da tela.
- **Temporização e Fechamento Automático:**
  - O PiP permanece aberto por uma duração configurável (padrão de 15 segundos, ajustável para 10s, 20s, 30s ou até o fim do movimento).
  - Um indicador circular sutil exibe a contagem regressiva para o fechamento.
- **Interação com o Controle Remoto (D-Pad):**
  - **Botão OK / Centro:** Expande o PiP instantaneamente para tela cheia (Spotlight Mode).
  - **Botão Voltar:** Fecha o PiP imediatamente e retorna ao app em primeiro plano.
- **Modo Não Perturbe na TV:** Agendamento de horários em que o PiP não deve sobrepor a tela (ex: das 23:00 às 06:00).

---

## 5. MÓDULO 2: PLAYER DE VÍDEO WEBRTC DE BAIXÍSSIMA LATÊNCIA

### 5.1 Pipeline de Decodificação por Hardware
- **Integração com go2rtc:** O player consome diretamente os fluxos WebRTC (`ws://192.168.1.252:1984/api/ws?src={camera_name}`) e MSE H.264 acelerados.
- **Aceleração por MediaCodec:** Decodificação de vídeo feita diretamente na GPU do processador da TV/celular com zero consumo de CPU e zero aquecimento.
- **Modo Mosaico Inteligente (Multi-View Grid):**
  - Grades de visualização adaptáveis: `1x1` (Destaque), `2x2` (4 Câmeras) e `3x3` (Até 9 Câmeras simultâneas).
  - Troca rápida de canais com as setas do controle remoto (Esquerda/Direita).
  - Borda de foco em ciano neon (`#06B6D4`) com alto contraste para indicar a câmera selecionada no controle.

---

## 6. MÓDULO 3: ALERTAS DE PLACAS MERCOSUL E EVENTOS DE SEGURANÇA

### 6.1 Exibição Visual de Alertas (Heads-Up Display)
- **Banner Superior Flutuante:** Ao identificar um veículo, o app exibe uma faixa visual contendo:
  - Miniatura recortada do veículo e da placa.
  - Texto nítido da placa identificada (ex: `BRA2E19`).
  - Badge de status de acesso:
    - `🟢 AUTORIZADO (Morador / Família)`
    - `🟡 VISITANTE (Acesso Temporário)`
    - `🔴 ALERTA / NÃO AUTORIZADO (Veículo Suspeito ou Bloqueado)`
- **Sons e Notificações Sonoras:**
  - Opção de toque sutil estilo campainha (Chime) para moradores autorizados.
  - Alerta sonoro duplo para veículos bloqueados ou pessoas em horários de alerta.

---

## 7. MÓDULO 4: TRANSMISSOR DE CÂMERA IP (SMARTPHONE COMO CÂMERA DO FRIGATE)

### 7.1 Transformação do Celular em Câmera de CFTV
- **Servidor RTSP / HTTP MJPEG Embutido no APK:**
  - O aplicativo inicia um servidor local de streaming no próprio aparelho nas portas padrão (`8081` para HTTP MJPEG `/video` ou `8554` para RTSP nativo H.264).
- **Seleção de Lentes e Qualidade:**
  - Alternância entre câmera traseira (ultra-wide/principal) e câmera frontal.
  - Ajuste dinâmico de resolução (`1920x1080` a 25 FPS, `1280x720` a 30 FPS ou `640x480` para economia de bateria).
- **Modo Standby com Tela Apagada (Black Screen Saver):**
  - O celular continua transmitindo o fluxo de vídeo para o Frigate mesmo com o display completamente escurecido, economizando bateria e evitando queima de tela (Burn-in).
- **Auto-Descoberta:** O scanner do servidor identifica o smartphone automaticamente através do mDNS e da porta 8081.

---

## 8. MÓDULO 5: MODO KIOSK PARA TABLET DE PAREDE (PAINEL RESIDENCIAL)

### 8.1 Recursos de Display Sempre Ativo (AOD)
- **Wake-on-Motion:** Integração com os sensores de presença do Frigate para acender a tela do tablet automaticamente quando alguém se aproximar da entrada.
- **Protetor de Tela com Relógio e Telemetria:** Quando não há movimento recente, o tablet exibe um descanso de tela minimalista em preto absoluto com relógio digital, previsão do tempo e status das câmeras online.
- **Acesso Tátil Rápido:** Toque duplo em qualquer câmera expande o fluxo em tela cheia instantaneamente.

---

## 9. MÓDULO 6: PAREAMENTO, SEGURANÇA E AUTO-DESCOBERTA

### 9.1 Fluxo de Conexão Sem Configuração (Zero-Config)
1. **Auto-Descoberta mDNS:** O aplicativo faz a busca na rede local por `cameras.local` ou `_sentinela._tcp.local` e localiza o servidor Ubuntu automaticamente sem exigir digitação de IP.
2. **Entrada Manual de Fallback:** Campo para digitação de IP direto (ex: `192.168.1.252`) e porta da API.
3. **Pareamento de Segurança:**
   - O aplicativo gera um `device_id` único baseado no hardware.
   - Na primeira conexão, exibe um código PIN de 4 dígitos ou QR Code para autorização no painel web do administrador.
   - Respeita os estados `ALLOWED`, `BLOCKED` e `PAUSED` definidos no servidor central.

---

## 10. ARQUITETURA DE IMPLEMENTAÇÃO DO APK NO GOOGLE ANTIGRAVITY

### 10.1 Stack Tecnológico Homologado
- **Linguagem:** Kotlin 2.0+ nativo.
- **Interface Gráfica:** Jetpack Compose + Jetpack Compose for TV (Material 3).
- **Motor de Vídeo:** WebRTC Native SDK for Android + ExoPlayer (Media3) com suporte a decodificação por hardware (`SurfaceView` com `setSecure(false)` para performance máxima).
- **Comunicação em Tempo Real:** Ktor Client / OkHttp WebSocket + Paho MQTT Client.
- **Injeção de Dependências:** Kotlin Coroutines + StateFlow / ViewModel Architecture.

---

## 11. CHECKLIST DE CONSTRUÇÃO PASSO A PASSO PARA O AGENTE AUTÔNOMO

1. **Fase 1 — Estrutura do Projeto:** Criar projeto Android Gradle modular com targets `minSdk = 26` (Android 8.0 Oreo) e `targetSdk = 34/35`, configurando manifests separados para `LEANBACK` (Android TV) e `TOUCH` (Smartphones/Tablets).
2. **Fase 2 — Camada de Rede e Descoberta:** Implementar cliente mDNS NSD (Network Service Discovery), conexão WebSocket persistente e gerenciador de reconexão assíncrona.
3. **Fase 3 — Player de Vídeo WebRTC:** Integrar `SurfaceViewRenderer` com suporte a fluxos go2rtc e decodificação por hardware.
4. **Fase 4 — Motor de PiP e Serviço em Background:** Configurar `ForegroundService` com `android:foregroundServiceType="mediaPlayback|camera"` e chamadas nativas de `PictureInPictureParams`.
5. **Fase 5 — UI para Android TV:** Desenvolver a tela inicial em mosaico D-Pad com foco em ciano neon, controles de seleção e visualizador de alertas de placas.
6. **Fase 6 — Módulo de Transmissão de Câmera:** Implementar CameraX com encoder H.264 e servidor de streaming embutido para smartphones.
7. **Fase 7 — Compilação e Build:** Gerar o APK final `Sentinela-v3.0-Universal.apk` pronto para instalação via pendrive ou ADB nas TVs e celulares.
