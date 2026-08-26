#!/usr/bin/env bash
set -e

echo "============================================================"
echo "  🚀 ServONVIF - Compilador de APK para GitHub Codespaces   "
echo "============================================================"

# 1. Atualizar e instalar Java 17 e Unzip se necessário
echo "📦 Verificando dependências base (Java 17, Unzip, Gradle)..."
sudo apt-get update -qq && sudo apt-get install -y -qq openjdk-17-jdk unzip gradle

# 2. Configurar Android SDK Command Line Tools
export ANDROID_HOME="${HOME}/android-sdk"
export PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

if [ ! -d "${ANDROID_HOME}/cmdline-tools/latest" ]; then
    echo "📦 Baixando Android SDK Command Line Tools..."
    mkdir -p "${ANDROID_HOME}/cmdline-tools"
    cd "${ANDROID_HOME}/cmdline-tools"
    curl -sS -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
    unzip -q cmdline-tools.zip
    rm cmdline-tools.zip
    mv cmdline-tools latest
    cd - > /dev/null
fi

echo "📦 Aceitando licenças e instalando Android SDK 34..."
yes | "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" --licenses > /dev/null 2>&1 || true
"${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" "platforms;android-34" "build-tools;34.0.0" "platform-tools" > /dev/null 2>&1 || true

# 3. Compilar APK
echo "⚙️ Compilando o APK Universal (Smartphone Moto G56 + Android TV)..."
cd android
gradle assembleDebug --no-daemon
cd ..

echo ""
echo "============================================================"
echo "  🎉 SUCESSO! APK Compilado com Êxito!                      "
echo "============================================================"
APK_FILE=$(find android/app/build/outputs/apk -name "*.apk" | head -n 1)
if [ -n "$APK_FILE" ]; then
    echo "📁 Arquivo gerado: $APK_FILE"
    echo ""
    echo "💡 COMO BAIXAR NO CODESPACES:"
    echo "   1. No menu de arquivos à esquerda (Explorer do VS Code), vá até:"
    echo "      $APK_FILE"
    echo "   2. Clique com o BOTÃO DIREITO nele e escolha 'Download...'"
fi
echo "============================================================"
