# 🛡️ SENTINELA FRIGATE PRO — ESPECIFICAÇÃO TÉCNICA E ARQUITETURA MESTRA (MASTER BLUEPRINT)

---

## 1. VISÃO GERAL, ESCOPO E PRINCÍPIOS FUNDAMENTAIS

### 1.1 Objetivo do Sistema
O **Sentinela Frigate Pro** é uma plataforma de videomonitoramento inteligente, gravação contínua (NVR), reconhecimento veicular e segurança de alta performance projetada para operar em hardware dedicado de baixo consumo de energia (Mini PCs com processadores Intel). 

O sistema substitui pipelines legados baseados em loops manuais de leitura de vídeo por uma arquitetura moderna e escalável baseada em:
- **Frigate NVR + go2rtc:** Responsáveis exclusivos por ingestão de vídeo, aceleração gráfica por hardware (GPU Intel), rastreamento espacial de movimento, gravação em disco e streaming WebRTC com latência sub-segundo (< 50ms).
- **Sentinela Orchestrator Core (FastAPI / Python 3.12+ Assíncrono):** Daemon central que consome eventos do Frigate via barramento MQTT, executa OCR de placas brasileiras (LPR Mercosul), gerencia notificações para o Telegram Cloud Vault, administra o scanner de rede universal e controla a segurança dos dispositivos pareados.
- **Sentinela UI (Next.js 14 / TypeScript / Tailwind CSS / Glassmorphism):** Aplicação web progressiva para controle, visualização em mosaico WebRTC, auditoria de placas e telemetria de hardware em tempo real.
- **Android TV / Tablet PiP Bridge:** Serviço de injeção automática de janelas flutuantes Picture-in-Picture em Smart TVs e tablets Android durante eventos críticos.

---

## 2. INFRAESTRUTURA DE HARDWARE E DIRETRIZES DE PERFORMANCE

### 2.1 Hardware Alvo Homologado
- **Processador (CPU):** Intel Celeron Jasper Lake N5105 (Quad-Core, 4 Threads, 2.0 GHz base, 2.9 GHz Turbo, 10W TDP).
- **Unidade de Processamento Gráfico (iGPU):** Intel UHD Graphics Gen11 (24 Unidades de Execução) mapeada em `/dev/dri/renderD128` com suporte completo a **Intel QuickSync Video (QSV)** e **VAAPI (Driver iHD)**.
- **Memória RAM:** 14 GB a 16 GB DDR4 Dual-Channel.
- **Armazenamento Primário:** 500 GB NVMe PCIe SSD (taxas de leitura/gravação > 2000 MB/s).
- **Rede:** Interface Gigabit Ethernet (`enp1s0`) cabeada para evitar perda de pacotes de vídeo.
- **Sistema Operacional:** Ubuntu Server 24.04 / 26.04 LTS (Kernel Linux x86_64 otimizado).

### 2.2 Metas de Desempenho (SLAs de Performance)
- **Consumo de CPU em Standby (4 Câmeras ativas em vigilância):** Abaixo de **8% a 12%** de CPU total.
- **Temperatura da CPU em Operação Contínua:** Entre **28°C e 48°C** com refrigeração padrão.
- **Latência de Vídeo ao Vivo (Glass-to-Glass):** Inferior a **50 milissegundos** via WebRTC nativo.
- **Tempo de Disparo de Alertas (Telegram e PiP da TV):** Menor que **1.2 segundos** após a entrada do objeto na zona de detecção.
- **Uso de Memória RAM Global:** Abaixo de **2.5 GB** com todos os serviços em execução simultânea.

---

## 3. TOPOLOGIA E MAPA DE PORTAS DO ECOSSISTEMA

```
+---------------------------------------------------------------------------------------------------+
|                                       SERVIDOR SENTINELA (UBUNTU)                                 |
|                                                                                                   |
|  +---------------------------+       +---------------------------+       +---------------------+  |
|  |     FRIGATE NVR (Docker)  | <---> |   MOSQUITTO MQTT (Docker) | <---> |  SENTINELA BACKEND  |  |
|  |  - go2rtc (WebRTC/RTSP)   |       |   - Porta: 1883           |       |  - FastAPI Assínc.  |  |
|  |  - Intel VAAPI / OpenVINO |       |   - Barramento de Eventos |       |  - LPR Mercosul OCR |  |
|  |  - Gravação Contínua SSD  |       +---------------------------+       |  - Telegram Vault   |  |
|  +---------------------------+                                           |  - Scanner de Rede  |  |
|               |                                                          +---------------------+  |
|               |                                                                     |             |
|               v                                                                     v             |
|  +---------------------------+                                           +---------------------+  |
|  |   NGINX REVERSE PROXY     | <=======================================> |  SENTINELA WEB UI   |  |
|  |  - HTTP: 80 / HTTPS: 443  |                                           |  - Next.js 14 SSG   |  |
|  |  - Roteamento Inteligente |                                           |  - Glassmorphism UI |  |
|  +---------------------------+                                           +---------------------+  |
+---------------------------------------------------------------------------------------------------+
             ^                                                                 ^
             |                                                                 |
     [Câmeras IP / ONVIF]                                        [Smart TVs / Tablets / Celulares]
```

### 3.1 Mapeamento de Portas e Comunicação
- **Porta 80 (TCP):** Ponto de entrada padrão Nginx (`cameras.local` / `tcu.local`).
- **Porta 5000 (TCP):** API REST e interface nativa do Frigate NVR.
- **Porta 1984 (TCP):** Painel de controle e API WebRTC/MSE do **go2rtc**.
- **Porta 8554 (TCP):** Servidor RTSP local de retransmissão ultrarrápida do Frigate/go2rtc.
- **Porta 8555 (TCP/UDP):** Canal de sinalização e dados WebRTC ICE/STUN do go2rtc.
- **Porta 1883 (TCP):** Barramento de mensagens MQTT (Eclipse Mosquitto).
- **Porta 8080 (TCP):** API do Sentinela Orchestrator Backend (FastAPI).
- **Porta 3702 (UDP):** Descoberta automática de câmeras ONVIF (WS-Discovery).

---

## 4. ESPECIFICAÇÃO DETALHADA DO FRIGATE NVR E GO2RTC

### 4.1 Estratégia de Fluxo Duplo (Dual-Stream Architecture)
Para maximizar a eficiência e economizar 90% da CPU durante a inferência de IA:
1. **Detect Stream (Sub-stream):** Resolução reduzida (ex: `640x360` ou `896x512` a 5-7 FPS). Utilizado exclusivamente pelo Frigate para análise de movimento e inferência de objetos pela GPU.
2. **Record Stream (Main-stream):** Resolução nativa máxima da câmera (ex: `1920x1080` ou `2560x1440` a 20-25 FPS). Utilizado para gravação contínua no NVMe SSD, recortes de alta definição para OCR de placas e streaming em tela cheia.

### 4.2 Aceleração de Hardware Intel Jasper Lake (VAAPI / QSV)
- O Frigate deve rodar com parâmetros de aceleração gráfica explícitos:
  - Hardware Acceleration: `preset-vaapi` ou `preset-intel-qsv`.
  - Dispositivo de Renderização: Mapeamento direto de `/dev/dri/renderD128`.
  - Decodificação em GPU de formatos H.264 (AVC) e H.265 (HEVC).
- **Inferência de IA (Detector):** Configuração do detector OpenVINO direcionado para a GPU Intel integrada (`GPU`) ou CPU com instruções AVX2 otimizadas (`CPU`), garantindo tempos de inferência abaixo de 15ms por quadro.

### 4.3 Configuração de Retenção e Gravação em Disco
- **Gravação de Eventos:** Retenção configurável (padrão de 7 a 30 dias) com pré-buffer de 10 segundos antes do início do movimento e pós-buffer de 15 segundos.
- **Limpeza Automática (Retention Worker):** Eliminação de arquivos antigos quando o espaço livre no SSD for inferior a 15 GB, priorizando a manutenção de eventos críticos com detecção de pessoas e placas.

---

## 5. MÓDULO 1: MOTOR DE LEITURA E AUDITORIA DE PLACAS BRASILEIRAS (LPR MERCOSUL)

### 5.1 Pipeline de Inferência sob Demanda
O motor de LPR não opera continuamente para evitar sobrecarga. Ele é estruturado como um pipeline orientado a eventos:
1. **Recepção de Evento MQTT:** O backend escuta o tópico `frigate/events`. Quando um evento do tipo `new` ou `update` possui o label em `["car", "motorcycle", "bus", "truck"]` e se encontra dentro da zona configurada, o pipeline é disparado.
2. **Obtenção do Quadro de Alta Resolução:** O backend solicita instantaneamente o frame bruto não comprimido do stream principal (`/api/cameras/{cam_name}/latest.jpg`).
3. **Localização e Recorte do Veículo:** Com base no bounding box fornecido pelo Frigate, é feito o recorte da região do veículo com margem de segurança de 10%.
4. **Detecção e Pré-processamento da Placa:**
   - Conversão de cores para escala de cinza e equalização adaptativa de histograma (CLAHE).
   - Filtro bilateral para redução de ruído mantendo as bordas dos caracteres nítidas.
   - Correção de perspectiva caso a câmera esteja instalada em ângulo diagonal.
5. **Reconhecimento Óptico de Caracteres (OCR):**
   - Extração dos caracteres alfanuméricos com motor OCR leve (Tesseract/PaddleOCR/Fast-LPR).
   - Validação com Expressões Regulares:
     - **Padrão Mercosul Carro/Moto:** `^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$` (ex: `BRA2E19`, `ABC1234`).
     - **Padrão Tradicional Cinza:** `^[A-Z]{3}-[0-9]{4}$`.
6. **Auditoria de Lista de Acesso:**
   - **Autorizado (Whitelist):** Veículo registrado pertencente a moradores/funcionários.
   - **Visitante:** Veículo com autorização temporária.
   - **Bloqueado (Blacklist) / Suspeito:** Veículo não autorizado ou marcado para alerta de segurança.
7. **Deduplicação e Cooldown:** Janela de cooldown de 30 segundos por placa para evitar que um veículo estacionado ou em manobra gere dezenas de alertas duplicados.

---

## 6. MÓDULO 2: GATEWAY DE PICTURE-IN-PICTURE (PiP) PARA SMART TVS E TABLETS

### 6.1 Arquitetura de Notificação e Exibição em Tempo Real
O gateway mantém canais de comunicação ativos com as telas da residência/empresa através de conexões WebSocket persistentes e mensagens MQTT.

### 6.2 Modos de Operação do PiP
1. **Modo Notificação Flutuante na Android TV / Fire TV:**
   - Disparo de comando para aplicativos homologados de TV (ex: *PiP-Up* ou *Notifications for Android TV*).
   - A TV abre instantaneamente uma sobreposição de vídeo (WebRTC ou Snapshot animado) no canto superior direito (tamanho 480x270 px) sobre qualquer aplicativo ativo (Netflix, YouTube, TV aberta).
   - O vídeo permanece aberto por 15 a 30 segundos (configurável) e encerra automaticamente.
2. **Modo Painel de Parede (Tablets Android / iPads):**
   - Tablets executando a interface web ou navegadores dedicados (Fully Kiosk Browser) recebem o evento via WebSocket.
   - A tela do tablet acende automaticamente (wake screen), exibe a câmera em destaque com a foto da placa identificada e retorna ao modo descanso após o evento.
3. **Filtros e Regras de Disparo:**
   - Possibilidade de configurar quais câmeras abrem PiP em quais TVs (ex: apenas Câmera do Portão na TV da Sala).
   - Modo Não Perturbe (horários configuráveis, ex: após as 23h).

---

## 7. MÓDULO 3: COFRE EM NUVEM TELEGRAM (TELEGRAM CLOUD VAULT)

### 7.1 Funcionalidades do Robô Telegram
1. **Alerta Instantâneo com Foto e Marca d'Água:**
   - Foto em alta resolução enviada em menos de 1.5s após o evento.
   - Marca d'água elegante contendo: Nome da Câmera, Data/Hora, Placa identificada e Status de autorização (`🟢 AUTORIZADO` / `🔴 NÃO AUTORIZADO`).
2. **Despacho Automático de Clipe de Vídeo (MP4):**
   - Após o término do evento de movimento consolidado pelo Frigate, o clipe comprimido em H.264 é enviado diretamente para o Telegram com controles de reprodução rápida.
3. **Backup Criptografado do Banco de Dados:**
   - Envio diário ou sob demanda do arquivo `sentinela.db` e configurações do Frigate como documento anexo no Telegram para restauração em 1 clique.
4. **Comandos Interativos no Chat:**
   - `/status`: Exibe a telemetria do servidor (temperatura, CPU, RAM, câmeras online).
   - `/snapshot [camera]`: Captura e retorna uma foto ao vivo em tempo real.
   - `/pausar [minutos]`: Suspende alertas temporariamente (ex: durante festas ou obras).
   - `/liberar [placa]`: Adiciona rapidamente uma nova placa à lista de veículos autorizados direto pelo celular.

---

## 8. MÓDULO 4: SCANNER UNIVERSAL DE CÂMERAS E AUTO-DESCOBERTA

### 8.1 Motores de Busca Integrados
1. **ONVIF WS-Discovery:** Disparo de sondas UDP Multicast no endereço `239.255.255.250:3702` e no broadcast geral da sub-rede local (`192.168.1.255:3702`).
2. **Scanner de Portas CFTV Concorrente:** Varredura paralela nas portas padronizadas de CFTV:
   - Porta `554`: RTSP Padrão internacional.
   - Porta `8554`: RTSP Alternativo (Câmeras Xiaomi, go2rtc, streaming Linux).
   - Porta `37777`: Protocolo nativo Intelbras e Dahua.
   - Porta `34567`: Protocolo nativo Xiongmai / XMeye.
   - Porta `4747`: Câmeras DroidCam em smartphones.
   - Portas `8080` / `8081`: Câmeras IP Webcam em celulares Android.
3. **Filtro Anti-Falso Positivo:** Exclusão de portas de servidores RTMP (`1935`) e portas de desenvolvimento web (`8888`) para evitar a identificação de Smart TVs ou PCs como se fossem câmeras.

### 8.2 Recursos da Interface de Busca
- **Botão "Copiar Todos os IPs":** Exporta a lista formatada de todos os dispositivos encontrados para a área de transferência com 1 clique.
- **Botões de Cópia Individual:** Permite copiar o IP individual (`192.168.1.X`) ou a URL RTSP pronta.
- **Auto-Configuração:** Adição em lote de câmeras descobertas diretamente na configuração do Frigate sem necessidade de edição manual de arquivos de texto.

---

## 9. MÓDULO 5: CONTROLE DE ACESSO, SEGURANÇA E PAREAMENTO DE DISPOSITIVOS

### 9.1 Gestão de Telas e Dispositivos Pareados
- Toda TV, tablet ou navegador que se conecta ao sistema recebe um identificador único de hardware (`device_id`).
- O administrador visualiza no painel web todos os dispositivos conectados em tempo real com seu IP local, modelo (ex: *Android TV Sala*, *iPad Portaria*) e tempo de atividade.
- **Estados de Permissão:**
  - `🟢 ALLOWED (Autorizado):` Acesso liberado a streams, alertas e notificações.
  - `🔴 BLOCKED (Bloqueado):` Conexão rejeitada e impedida de receber streams de vídeo.
  - `🟡 PAUSED (Pausado):` Conexão mantida em espera sem transmissão de dados para economia de rede.

---

## 10. MÓDULO 6: DESIGN DE INTERFACE WEB (GLASSMORPHISM & TELEMETRIA GLOBAL)

### 10.1 Diretrizes de UI / UX
- **Identidade Visual:** Dark Theme profundo estilo Obsidian (`#080D14`), cartões translúcidos com efeito Glassmorphism (`backdrop-blur-md`), bordas lineares sutis em ciano (`#06B6D4`) e tipografia monoespaçada para dados técnicos.
- **Header Global Persistente:** Fixado no topo de todas as telas (`position: sticky`), contendo:
  - **Abas de Navegação:** Câmeras, Placas & Veículos, Gravações & Eventos, Telas Pareadas, Ajustes & Diagnósticos.
  - **Ações Rápidas:** Botão de Busca de Rede (Scanner) e Adição Manual de Câmera.
  - **Pílulas de Telemetria ao Vivo:**
    - 🔥 **CPU:** Percentual de uso e temperatura em tempo real.
    - 🧠 **RAM:** Consumo em Megabytes e percentual da memória total.
    - 💾 **SSD NVMe:** Espaço livre em Gigabytes e percentual de ocupação.
    - ⚡ **Rede:** Velocidade da interface (1000 Mbps) e tráfego RX/TX instantâneo.
    - ✈️ **Telegram:** Indicador de status da conexão do bot (`🟢 Conectado` / `🔴 Falha`).
- **Player de Vídeo WebRTC:** Mosaico responsivo com transição suave, modo Spotlight em tela cheia com 1 clique e overlay visual de zonas de detecção.

---

## 11. MODELAGEM DE DADOS E BANCO DE DADOS (SQLITE ASSÍNCRONO)

### 11.1 Estrutura das Tabelas Principais
- **`cameras`:** ID, nome, rtsp_url principal, rtsp_url substream, ip_address, porta_onvif, credenciais, sensibilidade, zonas_roi, zonas_ignoradas, status_online.
- **`plate_detections`:** ID, camera_id, timestamp, placa, tipo_veiculo (carro/moto/caminhão), nivel_confianca, status_autorizacao, caminho_foto, caminho_crop_placa, notificado_telegram.
- **`authorized_vehicles`:** ID, placa, proprietario, modelo_cor, categoria (Morador, Visitante, Prestador, Bloqueado), data_expiracao, ativo.
- **`paired_devices`:** ID, device_identifier, nome_amigavel, tipo_hardware (Android TV, Tablet, Web), ip_address, status_permissao, ultimo_visto.
- **`system_settings`:** Chave/valor para parâmetros globais (Tokens Telegram, retenção de disco, parâmetros LPR, cooldowns).

---

## 12. ROTEIRO DE IMPLEMENTAÇÃO PASSO A PASSO (EXECUTION ROADMAP)

Para construir este projeto do zero no **Google Antigravity**, siga as fases ordenadas:

### 🔹 Fase 1: Fundação do Frigate e Docker Compose
1. Criar o arquivo `docker-compose.yml` contendo:
   - Serviço `frigate` com imagem oficial, montagem de `/dev/dri/renderD128`, pastas de gravação no SSD e portas mapeadas.
   - Serviço `mosquitto` com configuração de autenticação simples e persistência de dados.
2. Criar o arquivo `config/frigate.yml` otimizado para o processador Intel Jasper Lake N5105 com aceleração VAAPI e go2rtc habilitado.

### 🔹 Fase 2: Backend Orchestrator (FastAPI)
1. Estruturar o backend em Python 3.12 com FastAPI, SQLAlchemy assíncrono e Pydantic v2.
2. Implementar o cliente MQTT para escuta contínua de eventos do Frigate.
3. Construir o módulo de LPR com processamento de imagem OpenCV e validação de placas Mercosul.
4. Construir o serviço de integração com Telegram (fotos com marca d'água, clipes de vídeo e comandos).
5. Implementar o Scanner Universal de Câmeras (ONVIF WS-Discovery + Varredura de Portas CFTV).
6. Implementar o Hub WebSocket para sincronização da interface web e controle de dispositivos pareados.

### 🔹 Fase 3: Frontend Web (Next.js 14)
1. Criar a aplicação Next.js com Tailwind CSS, Lucide Icons e Zustand.
2. Construir o `Header.tsx` persistente com telemetria global de hardware e abas fixas.
3. Desenvolver o player de câmeras com integração direta ao streaming WebRTC do go2rtc.
4. Desenvolver as páginas de gerenciamento de placas (`/plates`), linha do tempo de gravações (`/events`) e configurações (`/settings`).
5. Criar o modal de Scanner de Rede com cópia em lote de IPs e adição simplificada.

### 🔹 Fase 4: Integração PiP e Smart TVs
1. Configurar os payloads de notificação para Android TV (PiP-Up / Webhook).
2. Validar a abertura instantânea da janela flutuante em testes de evento.

### 🔹 Fase 5: Validação, Auditoria de Sistema e Otimização
1. Testar uso de CPU e temperatura em operação contínua.
2. Garantir 0% de travamento no vídeo e latência inferior a 50ms.
3. Configurar Nginx para servir a interface web e fazer proxy reverso das APIs com suporte a WebSockets e WebRTC.
