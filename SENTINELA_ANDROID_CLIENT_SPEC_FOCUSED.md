# 📺📱 SENTINELA CLIENT PRO — ESPECIFICAÇÃO MESTRA PARA ANDROID TV E SMARTPHONES (VISUALIZAÇÃO & PiP)

---

## 1. ESCOPO E OBJETIVO PRINCIPAL DO APLICATIVO

O **Sentinela Client Pro** é um aplicativo Android nativo unificado, leve e de alta performance, focado **exclusivamente na visualização de vídeo ao vivo em tempo real (< 50ms) e no sistema de sobreposição Picture-in-Picture (PiP) para Smart TVs**.

O aplicativo é projetado para se integrar diretamente ao ecossistema do **Frigate NVR e go2rtc**, operando em dois modos bem definidos e otimizados para o seu tipo de tela:

1. **Modo Android TV / Fire TV (Navegação D-Pad / Controle Remoto):**
   - **Picture-in-Picture (PiP) Flutuante Automático:** Surge no canto da tela da TV sobre qualquer aplicativo (Netflix, YouTube, canais de TV) quando há detecção de pessoas ou veículos pelo Frigate.
   - **Mosaico de Câmeras ao Vivo (Live Grid):** Visualização simultânea em grade (2x2, 3x3) ou tela cheia (Spotlight) com navegação fluida por controle remoto.
2. **Modo Smartphone & Tablet (Interface Tátil Touch):**
   - **Visualização Pura das Câmeras ao Vivo:** Abertura instantânea das câmeras da casa/empresa em mosaico responsivo ou tela cheia individual com suporte a zoom tátil e baixa latência.

> [!NOTE]
> Este aplicativo **NÃO** inclui funções de transmissão de câmera do celular. Ele atua estritamente como um **Receptor e Monitor de Vídeo Profissional de Alta Velocidade**.

---

## 2. ARQUITETURA DO SISTEMA E TOPOLOGIA DE REDE

```
+-----------------------------------------------------------------------------------------------+
|                                  SERVIDOR SENTINELA (UBUNTU LINUX)                            |
|                                                                                               |
|  +-----------------------------------------------------------------------------------------+  |
|  |   FRIGATE NVR + go2rtc                                                                  |  |
|  |   - Ingestão RTSP / Câmeras IP                                                          |  |
|  |   - IA Intel OpenVINO / Rastreamento Nativo de Pessoas e Veículos                       |  |
|  |   - go2rtc: Servidor de Streaming WebRTC (< 50ms) na porta 1984 / 8555                  |  |
|  +-----------------------------------------------------------------------------------------+  |
|               |                                                           |                   |
|       (Eventos MQTT / WS)                                         (Vídeo WebRTC / MSE)        |
|               v                                                           v                   |
|  +-----------------------------------------------------------------------------------------+  |
|  |   SENTINELA BACKEND (FastAPI / WebSocket Hub na porta 8080)                             |  |
|  |   - Despacho de Gatilhos de Alerta e Notificações de PiP                                |  |
|  |   - Gerenciador de Pareamento de Dispositivos (ALLOWED / BLOCKED)                       |  |
|  +-----------------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------------+
                                            |
                         (Rede Local Wi-Fi / Ethernet Gigabit)
                                            |
        +-----------------------------------+-----------------------------------+
        |                                                                       |
        v                                                                       v
+---------------------------------------+               +---------------------------------------+
|        SMART TV (ANDROID TV)          |               |         SMARTPHONE ANDROID            |
|                                       |               |                                       |
|  • PiP Flutuante Automático           |               |  • Mosaico ao Vivo Responsivo         |
|  • Mosaico D-Pad com Borda Ciano      |               |  • Modo Spotlight com Pinch-to-Zoom   |
|  • Expansão Fullscreen no Botão OK    |               |  • Troca Rápida de Câmeras            |
|  • Serviço em Segundo Plano           |               |  • Zero Consumo de Bateria            |
+---------------------------------------+               +---------------------------------------+
```

---

## 3. MÓDULO ANDROID TV: PICTURE-IN-PICTURE (PiP) E CONTROLE REMOTO

### 3.1 Funcionamento do PiP em Segundo Plano
- **Serviço de Alerta em Background (Foreground Service):**
  - O aplicativo roda um serviço de background ultra-leve que escuta o barramento WebSocket / MQTT do servidor Frigate/Sentinela mesmo enquanto a TV está reproduzindo outros aplicativos (Netflix, YouTube, Prime Video, TV aberta).
- **Injeção de Janela Flutuante (Floating Window Overlay):**
  - Ao receber um evento de detecção (ex: `person` no portão ou `car` na garagem), o serviço dispara uma janela flutuante no canto superior direito da tela (dimensões padrão `480x270 px`).
  - O vídeo ao vivo da câmera em questão é aberto instantaneamente via WebRTC com menos de 50ms de atraso.
- **Temporização e Fechamento Inteligente:**
  - O PiP permanece aberto por um período pré-configurado (10s, 15s, 20s ou 30s).
  - Um discreto anel circular animado no canto do PiP mostra a contagem regressiva para o auto-fechamento.
- **Interação com o Controle Remoto:**
  - **Botão Central (OK / Select):** Expande imediatamente a janela flutuante para **Tela Cheia (Spotlight)**.
  - **Botão Voltar (Back):** Fecha o PiP na hora sem precisar esperar o temporizador.
- **Modo Não Perturbe (DND):**
  - Horários programáveis em que o PiP não deve sobrepor a tela da TV (ex: das 23:00 às 06:00).

### 3.2 Mosaico de Câmeras para TV (Leanback Grid)
- **Interface Otimizada para 3 Metros de Distância (10-foot UI):**
  - Grades de visualização organizadas em `1x1` (Câmera Individual), `2x2` (4 Câmeras) ou `3x3` (Até 9 Câmeras simultâneas).
  - Foco visual nítido com bordas iluminadas em ciano neon (`#06B6D4`) e leve escala do card em foco.
- **Atalhos do Controle Remoto:**
  - **Setas Direcionais (D-Pad):** Navega entre as câmeras da grade.
  - **Clique OK:** Abre a câmera selecionada em tela cheia com alta taxa de quadros e resolução máxima.
  - **Teclas Numéricas (1 a 9):** Salta diretamente para o canal da câmera correspondente.

---

## 4. MÓDULO SMARTPHONE: MONITORAMENTO AO VIVO DE ALTA VELOCIDADE

### 4.1 Interface Tátil e Experiência do Usuário
- **Abertura Instantânea:** O aplicativo conecta diretamente aos fluxos WebRTC e exibe o mosaico ao vivo em menos de 1 segundo após o toque no ícone.
- **Visualização em Mosaico Responsivo:**
  - Disposição vertical fluida em smartphones (1 coluna com 2 ou 3 câmeras visíveis) e horizontal em tablets (grades 2x2).
- **Modo Spotlight com Pinch-to-Zoom:**
  - Toque em qualquer câmera abre a visualização individual em alta definição.
  - Suporte a gesto de pinça com os dedos (*Pinch-to-Zoom*) para inspecionar detalhes (rostos, placas, áreas do portão) com interpolação suave.
  - Arraste lateral para a esquerda/direita para navegar entre as câmeras sem voltar ao menu principal.
- **Baixo Consumo de Recursos:**
  - Decodificação de vídeo 100% realizada pela GPU do celular (via `MediaCodec`), garantindo que o aparelho não esquente nem drene a bateria durante a visualização.

---

## 5. REQUISITOS TÉCNICOS E ESPECIFICAÇÃO DE ENGENHARIA

### 5.1 Protocolo de Streaming de Vídeo
- **WebRTC Nativo (go2rtc):** Conexão direta de baixa latência via WebSockets para sinalização SDP e pacotes RTP/SRTP para vídeo H.264/H.265.
- **Fallback Automático para MSE/HLS:** Caso a rede Wi-Fi local apresente bloqueio de portas UDP, o player conmuta automaticamente para streaming fragmentado sem travar o aplicativo.

### 5.2 Descoberta Automática de Servidor (Zero-Configuração)
1. **Auto-Descoberta mDNS:** O aplicativo faz uma busca local por `cameras.local` ou serviço `_sentinela._tcp.local` e conecta ao servidor Ubuntu sem exigir que o usuário digite o endereço IP.
2. **Entrada Manual de Fallback:** Campo nas configurações para inserir o IP manualmente (ex: `192.168.1.252`).

### 5.3 Segurança e Controle de Acesso
- O aplicativo gera um identificador único de dispositivo (`device_id`).
- Respeita as políticas de segurança configuradas no painel web central:
  - `🟢 ALLOWED (Autorizado):` Acesso liberado aos fluxos de vídeo e notificações de PiP.
  - `🔴 BLOCKED (Bloqueado):` Transmissão bloqueada imediatamente.
  - `🟡 PAUSED (Pausado):` Conexão mantida em espera sem tráfego de dados.

---

## 6. ARQUITETURA DE CÓDIGO E BIBLIOTECAS (STACK DO APK)

- **Linguagem Principal:** Kotlin 2.0+ nativo.
- **Interface Gráfica (UI):**
  - **Android TV:** Jetpack Compose for TV (Material 3 for TV).
  - **Smartphones:** Jetpack Compose padrão.
- **Motor de Renderização de Vídeo:**
  - `SurfaceView` com aceleração de hardware nativa.
  - WebRTC Android SDK oficial ou ExoPlayer Media3 com extensão WebRTC/RTSP.
- **Comunicação Assíncrona:**
  - OkHttp WebSocket / Ktor Client para sinalização de eventos e telemetria.
  - Kotlin Coroutines e StateFlow para gerenciamento reativo de estado.
- **Compatibilidade de Sistema Operacional:**
  - `minSdkVersion = 26` (Android 8.0 Oreo — compatível com todas as Smart TVs e Fire TVs modernas).
  - `targetSdkVersion = 34 / 35` (Android 14 e 15).

---

## 7. CHECKLIST DE CONSTRUÇÃO PARA O AGENTE AUTÔNOMO NO GOOGLE ANTIGRAVITY

Ao construir este projeto em uma nova pasta, execute as etapas ordenadas:

1. **Fase 1 — Estrutura do Projeto Android Gradle:**
   - Configurar projeto multi-módulo ou com flavors `tv` e `mobile`.
   - Adicionar permissões no `AndroidManifest.xml`: `INTERNET`, `ACCESS_NETWORK_STATE`, `SYSTEM_ALERT_WINDOW` (para PiP overlay na TV), `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`.

2. **Fase 2 — Camada de Conexão e Sinalização:**
   - Implementar o cliente de Auto-Discovery via mDNS (Network Service Discovery).
   - Implementar o cliente WebSocket para recebimento de eventos do Frigate/Sentinela (`/ws` ou MQTT).

3. **Fase 3 — Player de Vídeo WebRTC / go2rtc:**
   - Criar o componente composable `LiveVideoPlayer` com `SurfaceViewRenderer` configurado para decodificação por hardware.
   - Implementar reconexão automática com backoff exponencial para quedas de sinal Wi-Fi.

4. **Fase 4 — Módulo de PiP e Serviço de Segundo Plano (Android TV):**
   - Criar o `NotificationOverlayService` que exibe a janela de vídeo flutuante sobre outros aplicativos quando o WebSocket sinaliza movimento.
   - Implementar o temporizador regressivo de 15 segundos e a lógica de expansão no botão OK do controle.

5. **Fase 5 — Interface do Usuário:**
   - Desenvolver o mosaico de câmeras para Android TV com navegação por D-Pad e borda em ciano neon.
   - Desenvolver a interface móvel para celulares com toque individual e suporte a zoom tátil.

6. **Fase 6 — Compilação e Geração do APK:**
   - Gerar o pacote final `SentinelaClientPro-Universal.apk` pronto para instalação direta via pendrive ou ADB.
