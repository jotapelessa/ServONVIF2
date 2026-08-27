#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 ServONVIF - Compilação de APKs no Codespaces"
echo "=================================================="

WORKSPACE_DIR="$(pwd)"
OUTPUT_DIR="$WORKSPACE_DIR/build-outputs"
mkdir -p "$OUTPUT_DIR"

# 1. Configurar Java 17 se necessário
if ! command -v java &> /dev/null; then
    echo "📦 Instalando OpenJDK 17..."
    sudo apt-get update -qq && sudo apt-get install -y -qq openjdk-17-jdk
fi

export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
if [ ! -d "$JAVA_HOME" ]; then
    export JAVA_HOME="$(dirname $(dirname $(readlink -f $(which java))))"
fi

# 2. Configurar Android SDK se necessário
if [ -z "$ANDROID_HOME" ]; then
    export ANDROID_HOME="/usr/local/lib/android/sdk"
    if [ ! -d "$ANDROID_HOME" ]; then
        export ANDROID_HOME="$HOME/android-sdk"
        mkdir -p "$ANDROID_HOME/cmdline-tools"
        if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
            echo "📥 Baixando Android Command Line Tools..."
            wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdtools.zip
            unzip -q /tmp/cmdtools.zip -d "$ANDROID_HOME/cmdline-tools"
            mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
            rm /tmp/cmdtools.zip
        fi
        export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
        yes | sdkmanager --licenses > /dev/null 2>&1 || true
        sdkmanager "platforms;android-34" "build-tools;34.0.0" > /dev/null 2>&1 || true
    fi
fi

echo "=================================================="
echo "📺 Compilando APK 1: ServONVIF TV (Smart TV / PiP)..."
echo "=================================================="
cd "$WORKSPACE_DIR/android"
chmod +x ./gradlew
./gradlew assembleDebug

# Copiar APK de TV para a pasta de saída
if [ -f "$WORKSPACE_DIR/android/app/build/outputs/apk/debug/ServONVIF_TV.apk" ]; then
    cp "$WORKSPACE_DIR/android/app/build/outputs/apk/debug/ServONVIF_TV.apk" "$OUTPUT_DIR/ServONVIF_TV.apk"
    echo "✅ APK 1 Gerado: $OUTPUT_DIR/ServONVIF_TV.apk"
elif [ -f "$WORKSPACE_DIR/android/app/build/outputs/apk/debug/app-debug.apk" ]; then
    cp "$WORKSPACE_DIR/android/app/build/outputs/apk/debug/app-debug.apk" "$OUTPUT_DIR/ServONVIF_TV.apk"
    echo "✅ APK 1 Gerado: $OUTPUT_DIR/ServONVIF_TV.apk"
fi

echo "=================================================="
echo "📱 Compilando APK 2: ServONVIF Mobile (Smartphone)..."
echo "=================================================="
cd "$WORKSPACE_DIR/mobile"

# Gerar estrutura Android do Expo se ainda não gerada
if [ ! -d "$WORKSPACE_DIR/mobile/android" ]; then
    echo "📦 Executando expo prebuild..."
    npx expo prebuild --platform android --no-install
fi

cd "$WORKSPACE_DIR/mobile/android"
chmod +x ./gradlew
./gradlew assembleDebug

# Localizar e copiar APK Mobile
MOBILE_APK="$(find "$WORKSPACE_DIR/mobile/android/app/build/outputs/apk" -name "*.apk" | head -n 1)"
if [ -n "$MOBILE_APK" ]; then
    cp "$MOBILE_APK" "$OUTPUT_DIR/ServONVIF_Mobile.apk"
    echo "✅ APK 2 Gerado: $OUTPUT_DIR/ServONVIF_Mobile.apk"
fi

echo "=================================================="
echo "🎉 Compilação Concluída com Sucesso!"
echo "=================================================="
echo "Os APKs gerados estão na pasta 'build-outputs/':"
ls -la "$OUTPUT_DIR"
echo "=================================================="
