# 🎬 PROMPT MESTRE PARA O GOOGLE AI STUDIO: DESIGN SYSTEM & INTERFACE NETFLIX CLONE ADAPTADA PARA O PROJETO SERVONVIF ANDROID TV

---

> 📌 **INSTRUÇÕES DE USO NO GOOGLE AI STUDIO (GEMINI 1.5 PRO / GEMINI 2.0 FLASH / ADVANCED):**
> 1. Copie integralmente o texto dentro do bloco abaixo.
> 2. Cole no campo de prompt do **Google AI Studio**.
> 3. Este prompt foi estruturado para que a IA gere a interface **estilo clone da Netflix** com código pronto (Layouts XML, Kotlin ViewModels e Jetpack Compose for TV) para ser exportado e integrado diretamente no projeto pelo **Google Antigravity** na pasta `android/app-modern/`.

---

```markdown
# ATUE COMO: Designer Sênior de Interfaces para Smart TV (10-Foot Leanback UI) & Arquiteto Android Especialista em Clones de UI Cinematográfica (Estilo Netflix / Apple TV / Disney+)

## 🎯 OBJETIVO PRINCIPAL:
Você deve projetar a **interface visual completa, moderna e cinematográfica** para a versão de Smart TV e Android TV do sistema de segurança **ServONVIF PRO**.

⚠️ **REGRA CRÍTICA DE ESCOPO:**
Você **NÃO** deve criar um novo aplicativo do zero ou alterar a lógica de rede/banco de dados. O objetivo é criar a **camada de interface visual (UI/UX) Estilo Netflix**, 100% adaptada para o ecossistema existente do ServONVIF, para que o **Google Antigravity** possa exportar e integrar diretamente na pasta `android/app-modern/` do projeto.

---

## 🎨 FILOSOFIA DE DESIGN: CLONE DO NETFLIX ADAPTADO PARA CFTV E SEGURANÇA

1. **Estética Visual (Dark Glassmorphism Cinematográfico):**
   - **Fundo Global:** Obsidian profundo e Slate escuro (`#070B14` e `#0D1424`).
   - **Superfícies dos Cards:** Vidro acrílico fumê translúcido (`#131D33` com 85% de opacidade) e bordas ultrafinas em degrade suave (`#1E2D4A`).
   - **Efeito de Foco D-pad (Controle Remoto):** Ao navegar com o controle remoto da TV, o elemento focado recebe:
     - Borda externa com brilho Neon Ciano / Azul Elétrico (`#00D2FF` ou `#007AFF`).
     - Elevação suave e ampliação de escala de **1.06x** (animação de 200ms `ease-out`).
   - **Tipografia:** Sans-Serif moderna (Roboto / Inter / SF Pro Display) com pesos `Bold` e `Medium` de alta legibilidade para distâncias de 2 a 5 metros da TV.

2. **Navegação 100% Leanback (Controle Remoto D-pad):**
   - Toda a interação é baseada exclusivamente nas teclas direcionais (Cima, Baixo, Esquerda, Direita), Botão Central (OK/Enter) e Botão Voltar (Back).
   - Sem dependência de cursor de mouse ou toque.

---

## 🖥️ DETALHAMENTO COMPLETO DE TODAS AS TELAS, ABAS, MENUS E BOTÕES

Abaixo está a especificação minuciosa de cada elemento que compõe o aplicativo:

---

### 🌟 1. BARRA SUPERIOR DE NAVEGAÇÃO (TOP APP BAR)

A barra superior é fixada no topo da tela, permitindo troca ágil de contexto:

* **Logotipo & Identidade:**
  - Ícone de lente de câmera com tipografia estilizada `ServONVIF TV PRO` e badge discreto de versão de 9 dígitos (ex: `v002.002.146`).
* **Indicador de Status da Conexão:**
  - Badge dinâmico no canto superior direito que exibe o tipo de rota ativa e a latência em tempo real:
    - `🟢 LAN Wi-Fi • 8ms` (Conexão direta local).
    - `🔵 Tailscale Funnel • 24ms` (Acesso remoto seguro sem VPN).
    - `🔴 Servidor Desconectado` (Tentando reconectar automaticamente).
* **Relógio Digital & Calendário:**
  - Horário em tempo real e data completa (`14:35 • 28 de Agosto`).
* **Menu de Abas Horizontais (Pill Tabs com Foco D-pad):**
  - **Aba 1: Início (Home Billboard)** -> Tela principal estilo Netflix com câmera em destaque e carrosséis.
  - **Aba 2: Mosaico Multitelas (Grid Mosaic)** -> Grade dividida com todas as câmeras simultâneas.
  - **Aba 3: Central LPR (Veículos & Placas)** -> Histórico de carros e placas detectadas pela inteligência artificial.
  - **Aba 4: Gravações & Histórico (Timeline Playback)** -> Linha do tempo de vídeos gravados com player Leanback.
  - **Aba 5: Status & Diagnóstico (System Health)** -> Painel de telemetria de CPU/RAM, rede e armazenamento.
  - **Aba 6: Configurações (Settings)** -> Preferências de vídeo, Picture-in-Picture e ajustes da TV.

---

### 🎬 2. ABA 1: INÍCIO (LAYOUT ESTILO NETFLIX HERO BILLBOARD)

Esta é a tela principal de impacto visual ao abrir a Smart TV:

#### A. O Hero Billboard (Câmera ao Vivo em Destaque 16:9 no Topo):
- **Área de Exibição:** Ocupa os primeiros 55% da altura da TV, exibindo a transmissão ao vivo da câmera principal em alta definição.
- **Vignette Gradiente Escuro:** A parte inferior do vídeo se funde suavemente com a cor de fundo preta (`#070B14`), permitindo que os carrosséis de conteúdo abaixo fiquem perfeitamente legíveis.
- **Badges de Identificação sobre o Vídeo (OSD Overlay):**
  - `🔴 AO VIVO` (Ponto vermelho pulsante).
  - `5MP ULTRA HD • 25 FPS` (Indicador de resolução e fluidez).
  - `RTSP H.264 • Sensor Sony IMX335` (Codec e sensor).
  - `📍 Garagem & Portão de Entrada` (Nome e localização da câmera).
- **Barra de Botões de Ação Rápida no Hero (com Foco D-pad):**
  - **Botão `[ ▶ Assistir em Tela Cheia ]`:** Abre imediatamente o player imersivo a 60Hz da câmera em exibição.
  - **Botão `[ ⛶ Mosaico 2x2 ]`:** Alterna direto para a grade dividida com todas as câmeras da casa.
  - **Botão `[ 📸 Capturar Snapshot ]`:** Salva uma foto em resolução nativa e emite uma notificação visual na tela.
  - **Botão `[ 🔊 Ouvir Áudio ]`:** Liga ou desliga o canal de áudio ao vivo do microfone da câmera.
  - **Botão `[ 🔀 Próxima Câmera ]`:** Alterna a câmera do Hero Billboard para a próxima câmera disponível.

#### B. Trilho Horizontal 1 (Rail): "Mosaico Rápido de Câmeras"
- Carrossel horizontal com cards 16:9 de todas as câmeras conectadas.
- **Conteúdo de Cada Card:**
  - Miniatura de vídeo ao vivo atualizada continuamente.
  - Nome da câmera (`Câmera 01 - Portão`, `Câmera 02 - Piscina`).
  - Badge de status (`AO VIVO` ou `SEM SINAL`).
- **Interação D-pad:** Ao navegar pelas câmeras, o card focado se expande (`scale 1.06x`) com anel neon azul e o **Hero Billboard no topo troca de câmera instantaneamente**.
- **Clique no Botão OK:** Abre a câmera em Tela Cheia.

#### C. Trilho Horizontal 2 (Rail): "Detecções Recentes & LPR (Placas de Veículos)"
- Carrossel horizontal exibindo os veículos detectados recentemente pela IA.
- **Conteúdo de Cada Card:**
  - Foto do veículo com destaque recortado na placa.
  - Tag estilizada Mercosul iluminada em neon verde (ex: `BRA2E19`).
  - Nível de precisão da IA (ex: `98.5% de Confiança`).
  - Horário exato da detecção (ex: `Há 2 minutos`).
- **Clique no Botão OK:** Abre a gravação em vídeo do momento em que o veículo entrou/passou.

#### D. Trilho Horizontal 3 (Rail): "Eventos de Movimento & Gravações"
- Carrossel com as últimas gravações em vídeo MP4 de alertas de presença ou movimento.
- Badge com a duração do clipe (`00:30s`) e tamanho (`14.2 MB`).
- **Clique no Botão OK:** Inicia a reprodução direta do vídeo gravado na TV.

#### E. Trilho Horizontal 4 (Rail): "Modos de Vigilância & Ações Rápidas"
- Cards de atalho rápido:
  - Card `[ 🔄 Ativar Ronda Automática ]` (Alterna as câmeras a cada 10 segundos).
  - Card `[ 🛡️ Modo Alarme Noturno ]` (Sensibilidade máxima com destaque sonoro).
  - Card `[ 🖼️ Modo Picture-in-Picture ]` (Mantém a câmera em janela flutuante).

---

### ⛶ 3. ABA 2: MOSAICO MULTITELAS (FULL GRID SECURITY MOSAIC)

Tela dedicada para visualização simultânea contínua de todas as câmeras:

* **Barra de Ferramentas de Grade (Grid Toolbar no Topo):**
  - Botão `[ 1x1 ]` -> Câmera única gigante.
  - Botão `[ 2x2 ]` -> 4 Câmeras divididas igualmente (padrão NVR profissional).
  - Botão `[ 3x3 ]` -> Até 9 Câmeras simultâneas.
  - Botão `[ 🔄 Ciclo / Ronda ]` -> Alterna automaticamente os grupos de câmeras.
* **Células da Grade de Câmeras:**
  - Cada quadrante exibe o vídeo ao vivo com overlay OSD no rodapé (Nome, FPS, Bitrate).
  - **Tratamento de Câmera Desligada/Offline:** Se a câmera perder energia ou sinal de rede, a célula exibe instantaneamente a tela preta com a mensagem: `[ 🔴 SEM SINAL • CÂMERA DESCONECTADA ]`, com data/hora em tempo real e aviso de reconexão automática.
  - **Alarme Visual de Intrusão:** Quando há movimento detectado em uma câmera, a borda da célula pisca em vermelho/laranja neon e emite um alerta sonoro suave.
* **Clique no Botão OK:** Maximiza aquela câmera específica para Tela Cheia.

---

### 🚗 4. ABA 3: CENTRAL LPR (VEÍCULOS & PLACAS)

Interface para gestão de controle de acesso de veículos:

* **Menu Lateral de Filtros (Foco D-pad Vertical):**
  - `[ Todas as Placas ]` -> Exibe todos os registros cronológicos.
  - `[ Placas da Família / Autorizadas ]` -> Apenas veículos com tag verde autorizada.
  - `[ Visitantes / Não Cadastrados ]` -> Veículos com tag amarela.
  - `[ Placas Suspeitas / Bloqueadas ]` -> Veículos com tag vermelha de alerta.
* **Painel Central de Veículos:**
  - Cards detalhados com imagem do carro, placa ampliada, data/hora e nome do proprietário.
  - Botão `[ ➕ Cadastrar / Editar Nome do Morador ]` acionável direto pelo controle remoto.

---

### ⏱️ 5. ABA 4: GRAVAÇÕES & HISTÓRICO (PLAYBACK TIMELINE)

Interface de reprodução de gravações antigas:

* **Linha do Tempo de 24 Horas (Timeline Scrubber):**
  - Barra horizontal contínua dividida em blocos coloridos (Azul = Contínuo, Laranja = Movimento, Verde = Veículo).
  - O cursor de tempo desliza com as setas Esquerda/Direita do controle remoto.
* **Controles do Player Leanback:**
  - Botão `[ ⏪ Retroceder 10s ]`
  - Botão `[ ⏯ Play / Pause ]`
  - Botão `[ ⏩ Avançar 10s ]`
  - Botão `[ 🚀 Velocidade: 1x, 2x, 4x, 8x ]`
  - Botão `[ ⬇ Salvar Clipe ]`

---

### 📊 6. ABA 5: STATUS DO SISTEMA & DIAGNÓSTICO DE REDE

Painel de controle com a saúde do servidor e dos dispositivos:

* **Card 1: Saúde do Servidor Core (Mac NVR):**
  - Medidor de Uso de CPU e Memória RAM do servidor.
  - Uptime do servidor (dias/horas ligado sem interrupção).
  - Status do motor de energia Caffeinate 24/7.
* **Card 2: Diagnóstico de Rede & Conexão:**
  - Rota de Rede Ativa (`LAN Wi-Fi Local` vs. `Tailscale Funnel`).
  - IP Local do Servidor (`192.168.1.96:8080`) e IP da Smart TV.
  - Latência RTT medida em milissegundos.
* **Card 3: Armazenamento & Retenção:**
  - Espaço livre em disco no Mac (ex: `180 GB Livres`).
  - Dias de retenção de gravações configurados (ex: `15 dias`).
* **Botões de Ação:**
  - Botão `[ 🔄 Testar Conexão de Rede Agora ]`
  - Botão `[ 📋 Exibir Logs de Erros e Diagnóstico ]`
  - Botão `[ 🧹 Limpar Cache de Vídeo ]`

---

### ⚙️ 7. ABA 6: CONFIGURAÇÕES & AJUSTES DA SMART TV

* **Submenus Configuráveis via D-pad:**
  - **Qualidade de Transmissão:** `[ Auto ]`, `[ 5MP / 4K ]`, `[ 1080p Full HD ]`, `[ 720p Econômico ]`.
  - **Modo Picture-in-Picture (PiP):** Ativar ou desativar janela flutuante sobre outros apps.
  - **Sensibilidade do D-pad:** Velocidade das transições do controle remoto.
  - **Alertas Sonoros:** Habilitar aviso sonoro de movimento na TV.
  - Botão `[ 🚪 Desconectar / Trocar Servidor ]`.

---

### 📺 8. MODOS ESPECIAIS DE EXIBIÇÃO:

#### A. Modo Tela Cheia Imersiva (Spotlight View):
- Exibição de vídeo ao vivo em 100% da tela da TV a 60Hz.
- Barra de controle contextual inferior transparente com auto-hide após 3 segundos de inatividade:
  - Botões: `[ Pausar ]`, `[ Capturar Foto ]`, `[ Voltar para Grade ]`, `[ Trocar Stream Principal/Sub ]`.

#### B. Picture-in-Picture (PiP Android TV):
- Ao trocar de app na TV, a câmera ativa é minimizada para uma janela flutuante no canto superior da tela, permitindo vigiar o portão enquanto assiste canais de TV ou YouTube.

---

## 🔗 CONTRATO DE INTEGRAÇÃO COM O BACKEND SERVONVIF:

Ao gerar a interface, mapeie os seguintes endpoints de backend já existentes:
1. `GET /api/cameras` -> Lista de câmeras, nomes e configurações de ROI.
2. `GET /api/mjpeg/{id}` ou `GET /api/stream/{id}/live` -> Stream de vídeo ao vivo.
3. `GET /api/cameras/{id}/frame` -> Snapshot em alta definição da câmera.
4. `GET /api/events` -> Lista cronológica de gravações e clipes MP4.
5. `GET /api/lpr/detections` -> Lista de veículos e placas identificadas.
6. `GET /api/auth/connection-info` -> Telemetria de rede e status Tailscale Funnel.
7. `WS /ws/events` -> WebSocket de eventos em tempo real (alertas instantâneos de movimento e LPR).

---

## 📦 FORMATO DE SAÍDA REQUISITADO:
Forneça os códigos de interface prontos para a pasta `android/app-modern/`, incluindo:
1. Os **Layouts XML / Jetpack Compose for TV** com foco D-pad e temas escuros.
2. As **Activities e Fragments Leanback** com os seletores de foco neon e carrosséis horizontais.
3. O gerenciamento de estados reativos (LiveData / StateFlow) para conexão com a API e WebSockets.
```
