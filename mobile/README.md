# 📱 ServONVIF Mobile (App Dedicado para Smartphone)

Aplicativo mobile de alta performance para smartphones (**Android & iOS**) desenvolvido em React Native / Expo, permitindo visualizar câmeras ONVIF 5MP ao vivo, receber alertas e consultar placas de veículos (LPR) remotamente via **Tailscale e Wi-Fi Local**.

---

## ✨ Recursos Principais

- 🔒 **Login e Emparelhamento no Próprio App:** Dispensa o uso de aplicativo externo de VPN. Emparelhe apontando a câmera para o QR Code no painel web ou colando o token.
- ⚡ **Chaveamento Inteligente LAN ↔ 4G/5G:**
  - **No Wi-Fi de Casa:** Conexão direta local (`http://192.168.1.96:8080`) com latência ultrabaixa ($< 80$ms).
  - **Na Rua (Dados Móveis):** Rota automática pelo túnel criptografado Tailscale HTTPS MagicDNS (`*.ts.net`).
- 📷 **Sensor Nativo 5MP & Modo Economia de Dados:**
  - Grade de câmeras: Sub-stream fluido de baixo consumo.
  - Spotlight (Tela Cheia): 5MP Nativo (2880x1620) com 25 FPS estáveis e botão de captura de snapshot instantâneo.
- 🚗 **Feed LPR de Placas:** Histórico em tempo real de carros detectados na garagem com badges de categoria (*Morador*, *Visitante*, *Suspeito*).
- 📊 **Diagnósticos de Telemetria:** Monitor de rota ativa, teste de latência e seletor de resolução.

---

## 🚀 Como Executar no Smartphone

### Opção 1: Testar no Celular via Expo Go (1 Minuto)

1. Instale o app gratuito **Expo Go** na [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) (Android) ou [Apple App Store](https://apps.apple.com/app/expo-go/id982107779) (iPhone).
2. No seu computador, entre na pasta `mobile/` e inicie o Expo:
   ```bash
   cd mobile
   npx expo start
   ```
3. Abra a câmera do seu celular (ou o app Expo Go) e aponte para o QR Code exibido no terminal.
4. O app ServONVIF Mobile abrirá instantaneamente no seu celular!

---

### Opção 2: Gerar APK Standalone para Instalação Direta no Android

Para gerar um arquivo `.apk` independente e instalar em qualquer celular Android:

```bash
# 1. Instalar o EAS CLI (ferramenta oficial de build)
npm install -g eas-cli

# 2. Gerar APK direto para Android
eas build -p android --profile preview
```

---

## 📱 Fluxo de Emparelhamento

1. No computador, abra `http://localhost:3005/settings/devices`.
2. Clique no botão **`📱 Emparelhar Smartphone`**.
3. No app mobile, cole a chave de emparelhamento gerada.
4. O smartphone é automaticamente registrado e liberado com acesso ao vivo!
