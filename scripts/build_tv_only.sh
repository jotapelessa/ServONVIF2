#!/usr/bin/env bash
set -e

echo "=================================================="
echo "⚡ ServONVIF - Compilação Rápida Android TV (Netflix)"
echo "=================================================="

WORKSPACE_DIR="$(pwd)"
OUTPUT_DIR="$WORKSPACE_DIR/build-outputs"
mkdir -p "$OUTPUT_DIR"

# 0. Sincronizar Código com o GitHub mais recente no Codespaces
echo "🔄 Sincronizando com o GitHub..."
sudo chown -R $(whoami):$(whoami) "$WORKSPACE_DIR" 2>/dev/null || true
sudo chmod -R u+rwX "$WORKSPACE_DIR" 2>/dev/null || true
git fetch origin main 2>/dev/null || true
git reset --hard origin/main 2>/dev/null || true
git pull origin main 2>/dev/null || true

# Sincronizar Sistema de Versionamento de 9 Dígitos
python3 "$WORKSPACE_DIR/scripts/sync_version.py"
if [ -f "$OUTPUT_DIR/version.env" ]; then
    source "$OUTPUT_DIR/version.env"
fi

APP_VER="${APP_VERSION:-002.002.158}"
export CI=1
unset _JAVA_OPTIONS 2>/dev/null || true
export GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx2048m -Dorg.gradle.workers.max=2 -Dorg.gradle.parallel=true"

# 1. Configurar Java 17
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

# 2. Configurar Android SDK
if [ -d "/usr/local/lib/android/sdk" ]; then
    export ANDROID_HOME="/usr/local/lib/android/sdk"
elif [ -d "$HOME/android-sdk" ]; then
    export ANDROID_HOME="$HOME/android-sdk"
else
    export ANDROID_HOME="$HOME/android-sdk"
fi
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# 3. Garantir gradle-wrapper.jar
mkdir -p "$WORKSPACE_DIR/android/gradle/wrapper"
if [ ! -f "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar" ] || [ ! -s "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar" ]; then
    echo "📥 Baixando Gradle Wrapper JAR..."
    wget -q https://raw.githubusercontent.com/gradle/gradle/v8.6.0/gradle/wrapper/gradle-wrapper.jar -O "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar"
fi

# 4. Compilar UI Netflix Web com Vite
if [ -d "$WORKSPACE_DIR/tv-netflix" ]; then
    echo "🎬 Compilando Interface Web Netflix Smart TV..."
    cd "$WORKSPACE_DIR/tv-netflix"
    npm install --silent 2>/dev/null || true
    npm run build
    mkdir -p "$WORKSPACE_DIR/android/app-modern/src/main/assets/tv-netflix"
    rm -rf "$WORKSPACE_DIR/android/app-modern/src/main/assets/tv-netflix"/* 2>/dev/null || true
    cp -r dist/* "$WORKSPACE_DIR/android/app-modern/src/main/assets/tv-netflix/"
fi

# 5. Compilar Apenas o APK Android TV Netflix
echo "=================================================="
echo "📺 Compilando APK Android TV Netflix v$APP_VER..."
echo "=================================================="
cd "$WORKSPACE_DIR/android"
chmod +x ./gradlew
./gradlew :app-modern:assembleDebug --no-daemon

# 6. Localizar e Copiar APK Gerado
TV_NETFLIX_APK="$(find "$WORKSPACE_DIR/android/app-modern/build/outputs/apk" -name "*.apk" | head -n 1)"
if [ -n "$TV_NETFLIX_APK" ]; then
    cp "$TV_NETFLIX_APK" "$OUTPUT_DIR/ServONVIF_TV_Netflix_v${APP_VER}.apk"
    echo ""
    echo "=================================================="
    echo "🎉 APK ANDROID TV NETFLIX GERADO COM SUCESSO!"
    echo "=================================================="
    echo "📁 Caminho Local: $OUTPUT_DIR/ServONVIF_TV_Netflix_v${APP_VER}.apk"
    echo "📦 Tamanho: $(du -h "$OUTPUT_DIR/ServONVIF_TV_Netflix_v${APP_VER}.apk" | cut -f1)"
    echo "=================================================="
fi
