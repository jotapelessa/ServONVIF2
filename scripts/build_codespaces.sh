#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 ServONVIF - Compilação de APKs no Codespaces"
echo "=================================================="

WORKSPACE_DIR="$(pwd)"
OUTPUT_DIR="$WORKSPACE_DIR/build-outputs"
mkdir -p "$OUTPUT_DIR"

# 1. Configurar Java 17 obrigatório (se o padrão for Java 21/25)
if ! dpkg -s openjdk-17-jdk >/dev/null 2>&1; then
    echo "📦 Instalando OpenJDK 17..."
    sudo apt-get update -qq && sudo apt-get install -y -qq openjdk-17-jdk
fi

# Localizar caminho do Java 17 no Linux
if [ -d "/usr/lib/jvm/java-17-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
elif [ -d "/usr/lib/jvm/java-1.17.0-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-1.17.0-openjdk-amd64"
else
    # Fallback genérico para encontrar java 17
    JAVA_17_PATH=$(find /usr/lib/jvm -maxdepth 1 -name "*17*" | head -n 1)
    if [ -n "$JAVA_17_PATH" ]; then
        export JAVA_HOME="$JAVA_17_PATH"
    fi
fi
export PATH="$JAVA_HOME/bin:$PATH"

echo "☕ Usando versão do Java:"
java -version

# 2. Configurar Android SDK
if [ -d "/usr/local/lib/android/sdk" ]; then
    export ANDROID_HOME="/usr/local/lib/android/sdk"
elif [ -d "$HOME/android-sdk" ]; then
    export ANDROID_HOME="$HOME/android-sdk"
else
    export ANDROID_HOME="$HOME/android-sdk"
    mkdir -p "$ANDROID_HOME/cmdline-tools"
    if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
        echo "📥 Baixando Android Command Line Tools..."
        wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdtools.zip
        unzip -q -o /tmp/cmdtools.zip -d "$ANDROID_HOME/cmdline-tools"
        if [ -d "$ANDROID_HOME/cmdline-tools/cmdline-tools" ]; then
            mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
        fi
        rm -f /tmp/cmdtools.zip
    fi
    export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
    yes | sdkmanager --licenses > /dev/null 2>&1 || true
    sdkmanager "platforms;android-34" "build-tools;34.0.0" > /dev/null 2>&1 || true
fi
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# 3. Garantir gradle-wrapper.jar presente
mkdir -p "$WORKSPACE_DIR/android/gradle/wrapper"
if [ ! -f "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar" ] || [ ! -s "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar" ]; then
    echo "📥 Baixando Gradle Wrapper JAR..."
    wget -q https://raw.githubusercontent.com/gradle/gradle/v8.6.0/gradle/wrapper/gradle-wrapper.jar -O "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar"
fi

echo "=================================================="
echo "📺 Compilando APK 1: ServONVIF TV (Smart TV / PiP)..."
echo "=================================================="
cd "$WORKSPACE_DIR/android"
chmod +x ./gradlew
./gradlew assembleDebug --no-daemon

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

# Instalar dependências se node_modules não existir
if [ ! -d "$WORKSPACE_DIR/mobile/node_modules" ]; then
    echo "📦 Instalando dependências do Mobile..."
    npm install --silent
fi

# Gerar estrutura Android do Expo se ainda não gerada
if [ ! -d "$WORKSPACE_DIR/mobile/android" ] || [ ! -f "$WORKSPACE_DIR/mobile/android/gradlew" ]; then
    echo "📦 Executando expo prebuild..."
    npx expo prebuild --platform android --clean --no-install
fi

cd "$WORKSPACE_DIR/mobile/android"
chmod +x ./gradlew
./gradlew assembleDebug --no-daemon

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
ls -lh "$OUTPUT_DIR"
echo "=================================================="
