#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 ServONVIF - Compilação de APKs no Codespaces"
echo "=================================================="

WORKSPACE_DIR="$(pwd)"
OUTPUT_DIR="$WORKSPACE_DIR/build-outputs"
mkdir -p "$OUTPUT_DIR"

TV_VERSION="v2.1.0"
MOBILE_VERSION="v1.0.0"

# 1. Configurar Java 17 obrigatório
if ! dpkg -s openjdk-17-jdk >/dev/null 2>&1; then
    echo "📦 Instalando OpenJDK 17..."
    sudo apt-get update -qq && sudo apt-get install -y -qq openjdk-17-jdk
fi

if [ -d "/usr/lib/jvm/java-17-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
elif [ -d "/usr/lib/jvm/java-1.17.0-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-1.17.0-openjdk-amd64"
else
    JAVA_17_PATH=$(find /usr/lib/jvm -maxdepth 1 -name "*17*" | head -n 1)
    if [ -n "$JAVA_17_PATH" ]; then
        export JAVA_HOME="$JAVA_17_PATH"
    fi
fi
export PATH="$JAVA_HOME/bin:$PATH"

echo "☕ Versão do Java:"
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
echo "📺 Compilando APK 1: ServONVIF TV $TV_VERSION..."
echo "=================================================="
cd "$WORKSPACE_DIR/android"
chmod +x ./gradlew
./gradlew assembleDebug --no-daemon

# Localizar e copiar APK de TV com nome e versão
TV_APK="$(find "$WORKSPACE_DIR/android/app/build/outputs/apk" -name "*.apk" | head -n 1)"
if [ -n "$TV_APK" ]; then
    cp "$TV_APK" "$OUTPUT_DIR/ServONVIF_TV_${TV_VERSION}.apk"
    cp "$TV_APK" "$OUTPUT_DIR/ServONVIF_TV.apk"
    echo "✅ APK 1 Gerado: $OUTPUT_DIR/ServONVIF_TV_${TV_VERSION}.apk"
fi

echo "=================================================="
echo "📱 Compilando APK 2: ServONVIF Mobile $MOBILE_VERSION..."
echo "=================================================="
cd "$WORKSPACE_DIR/mobile"

# Instalar dependências se node_modules não existir
if [ ! -d "$WORKSPACE_DIR/mobile/node_modules" ]; then
    echo "📦 Instalando dependências do Mobile..."
    npm install --silent
fi

# Gerar estrutura Android do Expo
if [ ! -d "$WORKSPACE_DIR/mobile/android" ] || [ ! -f "$WORKSPACE_DIR/mobile/android/gradlew" ]; then
    echo "📦 Executando expo prebuild..."
    npx expo prebuild --platform android --clean --no-install
fi

# Configurar repositório local do expo-camera no build.gradle se necessário
if [ -f "$WORKSPACE_DIR/mobile/android/build.gradle" ]; then
    if ! grep -q "expo-camera/android/maven" "$WORKSPACE_DIR/mobile/android/build.gradle"; then
        echo "🔧 Adicionando repositório Maven do expo-camera..."
        sed -i 's|allprojects {|allprojects {\n    repositories {\n        maven { url "$rootDir/../node_modules/expo-camera/android/maven" }\n    }|' "$WORKSPACE_DIR/mobile/android/build.gradle" || true
    fi
fi

cd "$WORKSPACE_DIR/mobile/android"
chmod +x ./gradlew
./gradlew assembleDebug --no-daemon

# Localizar e copiar APK Mobile com nome e versão
MOBILE_APK="$(find "$WORKSPACE_DIR/mobile/android/app/build/outputs/apk" -name "*.apk" | head -n 1)"
if [ -n "$MOBILE_APK" ]; then
    cp "$MOBILE_APK" "$OUTPUT_DIR/ServONVIF_Mobile_${MOBILE_VERSION}.apk"
    cp "$MOBILE_APK" "$OUTPUT_DIR/ServONVIF_Mobile.apk"
    echo "✅ APK 2 Gerado: $OUTPUT_DIR/ServONVIF_Mobile_${MOBILE_VERSION}.apk"
fi

echo "=================================================="
echo "🎉 Compilação Concluída com Sucesso!"
echo "=================================================="
echo "Os APKs gerados estão na pasta 'build-outputs/':"
ls -lh "$OUTPUT_DIR"
echo "=================================================="

# 4. Publicar / Atualizar Release no GitHub
if command -v gh &> /dev/null; then
    echo "📦 Atualizando Release no GitHub..."
    if gh auth status >/dev/null 2>&1; then
        gh release create "v2.1.0" \
            "$OUTPUT_DIR/ServONVIF_TV_${TV_VERSION}.apk" \
            "$OUTPUT_DIR/ServONVIF_Mobile_${MOBILE_VERSION}.apk" \
            --title "ServONVIF v2.1.0 - TV & Mobile Apps" \
            --notes "🚀 **Lançamento Oficial ServONVIF v2.1.0**
- 📺 **ServONVIF_TV_v2.1.0.apk**: Aplicativo para Smart TV / TV Box com PiP overlay e controle remoto D-pad.
- 📱 **ServONVIF_Mobile_v1.0.0.apk**: Aplicativo para Smartphone com Tailscale, streaming 5MP ao vivo e feed LPR de placas." \
            --clobber && echo "🌟 GitHub Release atualizada com sucesso!" || echo "ℹ️ Release já existente ou criada."
    else
        echo "ℹ️ GitHub CLI não autenticado. Execute 'gh auth login' se desejar publicar releases automáticas."
    fi
fi
