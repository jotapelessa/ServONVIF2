# 🎬 PROMPT MESTRE PARA O GOOGLE AI STUDIO: INTERFACE ANDROID TV & SMART TV ESTILO NETFLIX PARA SERVONVIF PRO

---

> **COMO USAR ESTE PROMPT NO GOOGLE AI STUDIO / GEMINI PRO / ADVANCED:**
> 1. Copie todo o conteúdo abaixo e cole no campo de prompt do Google AI Studio (ou Gemini).
> 2. Este prompt instrui a IA a atuar como um **Designer Chefe de TV Leanback (10-foot UI)** e **Arquiteto Sênior Android TV**, detalhando todas as abas, submenus, botões, trilhos horizontais de conteúdo e controles remotos D-pad.

---

```markdown
# ATUE COMO: Designer Chefe de UI/UX para Android TV (10-Foot Leanback Experience) & Especialista em Design Cinematográfico Estilo Netflix

## 🎯 OBJETIVO DO PROJETO:
Você deve projetar a interface completa, moderna e cinematográfica do aplicativo **ServONVIF TV Pro** para Smart TVs, Android TV e TV Boxes (Amazon Fire TV, Google TV, Mi Box, TCL, Chromecast). 

O design deve seguir estritamente o paradigma de design da **Netflix / Disney+ / Apple TV**, adaptado para um sistema profissional de monitoramento de segurança NVR, câmeras IP ONVIF, detecção de movimento e inteligência artificial de reconhecimento de placas (LPR).

---

## 🎨 IDENTIDADE VISUAL & ESPECIFICAÇÕES DE DESIGN:

1. **Paleta de Cores Cinematográfica (Dark Glassmorphism):**
   - **Fundo Principal (Canvas):** Obsidian / Deep Slate `#070B14` e `#0D1424`.
   - **Superfícies & Cards:** Vidro escuro translúcido `#131D33` com opacidade 80% e bordas suaves `#1E2D4A`.
   - **Destaque de Foco D-pad (Controle Remoto):** Borda externa com brilho Neon Ciano / Azul Elétrico `#00D2FF` / `#007AFF`, com leve elevação e ampliação de escala de **1.06x**.
   - **Badges de Status:**
     - 🔴 **Ao Vivo / Gravando:** Vermelho Carmesim `#FF3B30` pulsante.
     - 🟢 **Conectado / OK / LPR Aprovado:** Verde Esmeralda `#34C759`.
     - 🟡 **Alerta de Movimento:** Laranja Neon `#FF9500`.
     - 🔵 **Tailscale / Rede Mesh:** Azul Royal `#5856D6`.

2. **Ergonomia do Controle Remoto (10-Foot UI):**
   - Navegação 100% pensada para **D-pad** (Cima, Baixo, Esquerda, Direita, Botão Central OK/Enter, Voltar, Menu).
   - Sem necessidade de cursor de mouse ou toque.
   - Retorno auditivo sutil e animações suaves de transição (250ms cubic-bezier).
   - Tipografia de alta legibilidade para distâncias de 2 a 5 metros da TV (Inter / Roboto / SF Pro Display).

---

## 🖥️ ESTRUTURA COMPLETA DAS TELAS, ABAS, MENUS E BOTÕES:

### 🌟 1. BARRA SUPERIOR DE NAVEGAÇÃO (TOP APP BAR & HEADER)
A barra superior fica fixa no topo ou expande conforme o usuário navega para cima:
- **Logotipo ServONVIF TV PRO:** Ícone de lente com badge de versão de 9 dígitos no canto esquerdo.
- **Badge de Status de Conexão:** Mostra se a TV está conectada via **LAN Wi-Fi Local** ou **Tailscale Funnel / Nuvem**, com indicação de latência em milissegundos (ex: `🟢 LAN • 8ms`).
- **Relógio Digital & Data em Tempo Real:** Exibição elegante no canto superior direito (`14:35 • 28/08/2026`).
- **Menu de Abas Horizontais (Pill Tabs com Foco D-pad):**
  1. 🏠 **Início & Destaques (Home Billboard)**
  2. ⛶ **Mosaico Multitelas (Grid Mosaic)**
  3. 🚗 **Central LPR & Veículos (License Plates)**
  4. ⏱️ **Histórico & Gravações (Playback Timeline)**
  5. 📊 **Diagnóstico & Status (System Health)**
  6. ⚙️ **Configurações (Settings)**

---

### 🎬 2. ABA 1: INÍCIO & DESTAQUES (LAYOUT ESTILO NETFLIX HERO BILLBOARD)

Esta é a tela principal do aplicativo ao abrir na Smart TV:

#### A. O Hero Billboard (Topo Panorâmico 16:9 em Destaque):
- O topo da tela exibe uma **transmissão ao vivo em tela panorâmica** da câmera principal (ou da última câmera onde houve detecção de movimento recente).
- **Vignette Gradiente:** A parte inferior do vídeo se funde suavemente com o fundo escuro da interface.
- **Overlays e Badges OSD sobre o Vídeo:**
  - `🔴 AO VIVO`
  - `5MP ULTRA HD • 25 FPS`
  - `SENSOR SONY IMX335 • RTSP H.264`
  - `📍 Garagem / Entrada Principal`
- **Linha de Botões de Ação Rápida (com Foco D-pad):**
  - **Botão 1: `[ ▶ Assistir em Tela Cheia ]`** -> Abre imediatamente a câmera selecionada em modo Spotlight imersivo a 60Hz.
  - **Botão 2: `[ ⛶ Mosaico 2x2 / 3x3 ]`** -> Alterna instantaneamente para a visualização de todas as câmeras divididas na tela.
  - **Botão 3: `[ 📸 Capturar Snapshot ]`** -> Salva uma foto HD instantânea da câmera e notifica na tela.
  - **Botão 4: `[ 🔊 Ouvir Áudio ]`** -> Ativa o canal de áudio da câmera na TV.
  - **Botão 5: `[ 🔀 Próxima Câmera ]`** -> Alterna a câmera do Hero Billboard para a próxima disponível.

#### B. Trilho Horizontal 1 (Rail): "Mosaico Rápido de Câmeras"
- Carrossel horizontal de cards de câmeras no formato 16:9.
- Cada card exibe:
  - Miniatura de vídeo ao vivo (com streaming MJPEG/RTSP contínuo).
  - Título da câmera (`Câmera 01 - Portão`, `Câmera 02 - Jardim`, etc.).
  - Badge de status (`AO VIVO • 1080p` ou `SEM SINAL • OFFLINE`).
- **Comportamento do D-pad:** Ao focar em um card, a borda acende em neon azul/ciano, o card amplia (`scale 1.06x`) e o **Hero Billboard no topo atualiza automaticamente** para transmitir aquela câmera selecionada.
- **Clique no Botão OK:** Abre o player em Tela Cheia.

#### C. Trilho Horizontal 2 (Rail): "Detecções Recentes & LPR (Placas de Veículos)"
- Carrossel horizontal com as últimas detecções de inteligência artificial.
- Cada card exibe:
  - Foto do veículo detectado com recorte da placa em alta definição.
  - Badge Mercosul iluminado com os caracteres da placa (ex: `BRA2E19`).
  - Nível de confiança da IA (`98.5% de Confiança`).
  - Horário exato da passagem (`Há 3 minutos • Câmera Garagem`).
- **Clique no Botão OK:** Abre o clipe de vídeo do momento exato em que o carro passou.

#### D. Trilho Horizontal 3 (Rail): "Eventos de Movimento & Gravações"
- Miniaturas dos clipes de vídeo gravados recentemente com alertas de presença humana ou movimento.
- Badge com a duração do vídeo (`00:30s`, `00:15s`) e tamanho do arquivo (`12.4 MB`).
- **Clique no Botão OK:** Inicia a reprodução direta do vídeo MP4 na TV com controles de avançar e retroceder.

---

### ⛶ 3. ABA 2: MOSAICO MULTITELAS (FULL GRID MOSAIC)

Tela dedicada para segurança patrimonial e monitoramento contínuo em tempo real:
- **Seletor de Grid no Cabeçalho:**
  - `[ 1x1 ]` Tela Única
  - `[ 2x2 ]` 4 Câmeras Simultâneas
  - `[ 3x3 ]` 9 Câmeras Simultâneas
  - `[ 🔄 Modo Ronda / Ciclo ]` Alterna as câmeras a cada 10 segundos automaticamente.
- **Células de Câmeras no Mosaico:**
  - Cada célula possui OSD profissional: Nome da Câmera, FPS em tempo real, Taxa de Bits (kbps) e relógio.
  - Em caso de desconexão, a célula exibe imediatamente a tela escura estilizada com `[ SEM SINAL • CÂMERA DESCONECTADA ]`.
  - Em caso de movimento na área vigiada, a borda da célula pisca em **vermelho/laranja neon** com aviso sonoro sutil.
- **Clique no Botão OK em qualquer célula:** Expande aquela câmera para Tela Cheia instantaneamente.

---

### 🚗 4. ABA 3: CENTRAL LPR & HISTÓRICO DE PLACAS

Tela para controle de acesso veicular:
- **Painel Lateral Esquerdo (Filtros com D-pad):**
  - Botão `[ Todas as Placas ]`
  - Botão `[ Placas Cadastradas / Família ]` (Tag Verde)
  - Botão `[ Visitantes / Desconhecidos ]` (Tag Amarela)
  - Botão `[ Placas Bloqueadas / Alerta ]` (Tag Vermelha)
- **Painel Central (Galeria de Veículos):**
  - Cards detalhados com foto panorâmica do carro, recorte em zoom da placa, texto extraído pelo OCR e botão para cadastrar ou editar o nome do proprietário diretamente na TV.

---

### ⏱️ 5. ABA 4: HISTÓRICO & REPRODUÇÃO DE GRAVAÇÕES (PLAYBACK TIMELINE)

- **Linha do Tempo Interativa (Timeline Scrubber):**
  - Régua horizontal de 24 horas dividida em blocos coloridos (azul = gravação contínua, laranja = movimento detectado, verde = veículo/LPR).
- **Player de Vídeo Leanback Integrado:**
  - Botão `[ ⏪ Retroceder 10s ]`
  - Botão `[ ⏯ Play / Pause ]`
  - Botão `[ ⏩ Avançar 10s ]`
  - Botão `[ 🚀 Velocidade: 1x / 2x / 4x / 8x ]`
  - Botão `[ ⬇ Salvar / Exportar Clipe ]`

---

### 📊 6. ABA 5: STATUS DO SISTEMA & DIAGNÓSTICO DE REDE

- **Cards de Telemetria em Tempo Real:**
  - **Card 1 - Servidor Core:** Status do motor Python, uso de CPU e memória RAM do servidor Mac, uptime contínuo.
  - **Card 2 - Rede & Conexão:** Rota ativa (LAN Wi-Fi vs. Tailscale Funnel), endereço IP da TV, endereço IP do servidor, latência RTT em milissegundos.
  - **Card 3 - Armazenamento NVR:** Espaço livre no disco, dias de retenção configurados (ex: 15 dias) e tamanho total dos vídeos.
  - **Card 4 - Dispositivos Pareados:** Lista de Smart TVs, Smartphones e Tablets autorizados na rede.
- **Botões de Ação:**
  - Botão `[ 🔄 Testar Conexão de Rede ]`
  - Botão `[ 📋 Exibir Logs do Sistema ]`
  - Botão `[ 🧹 Limpar Cache do App ]`

---

### ⚙️ 7. ABA 6: CONFIGURAÇÕES & AJUSTES DO APP TV

- **Submenus Configuráveis com o Controle Remoto:**
  - **Qualidade de Transmissão:** `[ Auto ]`, `[ Máxima 5MP/4K ]`, `[ Equilibrada 1080p ]`, `[ Fluida 720p ]`.
  - **Modo Picture-in-Picture (PiP):** Ativar/Desativar câmera flutuante sobre outros apps da TV.
  - **Sensibilidade do D-pad & Navegação:** Ajuste de velocidade do foco do controle remoto.
  - **Alertas Sonoros na TV:** Ativar/Desativar bipe suave ao detectar movimento ou carro no portão.
  - **Botão `[ Desconectar / Trocar Servidor ]`**

---

### 📺 8. MODOS ESPECIAIS DE EXIBIÇÃO:

#### A. Modo Tela Cheia Imersiva (Spotlight View):
- Vídeo ao vivo ocupando 100% da tela da TV.
- Controles contextuais transparentes que deslizam suavemente para fora da tela após 3 segundos sem tocar no controle remoto.
- Ao pressionar qualquer tecla do D-pad, a barra inferior surge com botões: `[ Pausar ]`, `[ Tirar Foto ]`, `[ Grade ]`, `[ Trocar Stream ]`, `[ Fechar ]`.

#### B. Modo Picture-in-Picture (PiP Android TV):
- Ao pressionar o botão Home ou alternar de app, a câmera ativa se transforma em uma pequena janela flutuante no canto superior direito da TV, permitindo que o usuário continue assistindo televisão enquanto monitora o portão/câmera.

---

## 🎯 INSTRUÇÃO DE SAÍDA:
Com base em todas as especificações acima:
1. Gere a interface visual completa em código (seja **Android Jetpack Compose for TV**, **XML Layouts com Leanback** ou **React Native TV**).
2. Forneça o código limpo, componentes reutilizáveis, gerenciamento de foco D-pad (`focusable`, `focusedBorder`, animações de escala `animateFloatAsState`) e temas modernos com fundo obsidian escuro.
```
