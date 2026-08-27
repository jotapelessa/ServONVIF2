#!/usr/bin/env bash
set -e

echo "============================================================"
echo "  🚀 ServONVIF - Compilador de APK para GitHub Codespaces   "
echo "============================================================"

# 1. Atualizar e instalar Java 17 e dependências
echo "📦 Verificando dependências base (Java 17, Unzip, Curl)..."
sudo apt-get update -qq && sudo apt-get install -y -qq openjdk-17-jdk unzip curl

# Encontrar e fixar Java 17 (obrigatório para Android Gradle Plugin 8.2.2)
if [ -d "/usr/lib/jvm/java-17-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
elif [ -d "/usr/lib/jvm/java-17-openjdk-arm64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-arm64"
elif [ -d "/usr/lib/jvm/java-17-openjdk" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-17-openjdk"
fi

if [ -n "$JAVA_HOME" ]; then
    export PATH="${JAVA_HOME}/bin:${PATH}"
    sudo update-java-alternatives --set "$(basename "${JAVA_HOME}")" > /dev/null 2>&1 || true
fi
echo "☕ Usando Java: $(java -version 2>&1 | head -n 1) (JAVA_HOME=$JAVA_HOME)"

# 2. Configurar Gradle 8.6 Oficial (100% compatível com Android Gradle Plugin 8.2.2)
export GRADLE_HOME="${HOME}/gradle-8.6"
if [ ! -d "${GRADLE_HOME}/bin" ]; then
    echo "📦 Baixando e configurando Gradle 8.6..."
    curl -sS -L -o /tmp/gradle-8.6-bin.zip https://services.gradle.org/distributions/gradle-8.6-bin.zip
    unzip -q -o /tmp/gradle-8.6-bin.zip -d "${HOME}"
    rm -f /tmp/gradle-8.6-bin.zip
fi
export PATH="${GRADLE_HOME}/bin:${PATH}"

# 3. Configurar Android SDK Command Line Tools
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

# 4. Compilar APK
echo "⚙️ Compilando o APK Universal (Smartphone Moto G56 + Android TV)..."
cd android
gradle assembleDebug --no-daemon
cd ..

echo ""
echo "============================================================"
echo "  🎉 SUCESSO! APKs Compilados com Êxito!                    "
echo "============================================================"
echo "📁 APKs Gerados:"
find android -name "*.apk" | while read -r apk; do
    echo "   👉 $apk"
done
echo ""
echo "💡 COMO BAIXAR NO CODESPACES:"
echo "   1. No Explorer de Arquivos à esquerda do VS Code, navegue até os arquivos acima."
echo "   2. Clique com o BOTÃO DIREITO no APK desejado e escolha 'Download...'"
echo "   3. Você pode instalar os dois simultaneamente no Moto G54 / Android TV!"
echo "============================================================"
