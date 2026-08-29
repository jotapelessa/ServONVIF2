#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 ServONVIF - Central de Compilação no Codespaces"
echo "=================================================="

WORKSPACE_DIR="$(pwd)"
OUTPUT_DIR="$WORKSPACE_DIR/build-outputs"
mkdir -p "$OUTPUT_DIR"

# 0. Menu Interativo de Escolha de APK
echo ""
echo "🎯 Escolha qual APK deseja compilar agora:"
echo "--------------------------------------------------"
echo "  [1] 🎬 Android TV Netflix (Recomendado / Mais Rápido ~30s)"
echo "  [2] 📺 Android TV Clássico (Interface Nativa ~30s)"
echo "  [3] 📱 ServONVIF Mobile (React Native / Expo Release ~4-5min)"
echo "  [4] 🚀 Compilar TODOS os 3 APKs (TV Netflix + Clássico + Mobile)"
echo "--------------------------------------------------"

CHOICE="$1"
if [ -z "$CHOICE" ]; then
    if [ -t 0 ]; then
        read -p "👉 Digite a opção [1, 2, 3 ou 4] (Padrão: 1): " USER_INPUT
        CHOICE="${USER_INPUT:-1}"
    else
        CHOICE="1"
    fi
fi

case "$CHOICE" in
    1|netflix|tv-netflix)
        TARGET_DESC="🎬 Android TV (Estilo Netflix)"
        BUILD_TV_NETFLIX=true
        BUILD_TV_CLASSIC=false
        BUILD_MOBILE=false
        ;;
    2|classic|tv-classic)
        TARGET_DESC="📺 Android TV (Clássico)"
        BUILD_TV_NETFLIX=false
        BUILD_TV_CLASSIC=true
        BUILD_MOBILE=false
        ;;
    3|mobile)
        TARGET_DESC="📱 ServONVIF Mobile"
        BUILD_TV_NETFLIX=false
        BUILD_TV_CLASSIC=false
        BUILD_MOBILE=true
        ;;
    4|all|todos)
        TARGET_DESC="🚀 TODOS os APKs (TV Netflix + TV Clássico + Mobile)"
        BUILD_TV_NETFLIX=true
        BUILD_TV_CLASSIC=true
        BUILD_MOBILE=true
        ;;
    *)
        echo "⚠️ Opção inválida '$CHOICE'. Usando padrão: [1] Android TV Netflix."
        TARGET_DESC="🎬 Android TV (Estilo Netflix)"
        BUILD_TV_NETFLIX=true
        BUILD_TV_CLASSIC=false
        BUILD_MOBILE=false
        ;;
esac

echo ""
echo "✅ Alvo selecionado: $TARGET_DESC"
echo "=================================================="

# 1. Sincronizar Código com o GitHub mais recente no Codespaces
echo "🔄 Sincronizando com o GitHub..."
sudo chown -R $(whoami):$(whoami) "$WORKSPACE_DIR" 2>/dev/null || true
sudo chmod -R u+rwX "$WORKSPACE_DIR" 2>/dev/null || true
git fetch origin main 2>/dev/null || true
git reset --hard origin/main 2>/dev/null || true
git pull origin main 2>/dev/null || true

# If the script was modified during git pull, bash execution pointer might be corrupted.
# This safely re-executes the script if we just pulled new changes for it.
if [ "$(git diff HEAD@{1} HEAD --name-only | grep scripts/build_codespaces.sh)" ]; then
    echo "⚠️ Script de compilação atualizado via Git. Reiniciando execução com segurança..."
    exec bash "$0" "$CHOICE"
fi

# 2. Limpeza de Disco
echo "🧹 Verificando espaço em disco..."
sudo swapoff -a 2>/dev/null || true
sudo rm -f /swapfile 2>/dev/null || true
sudo apt-get clean 2>/dev/null || true
sudo rm -rf /tmp/* /var/tmp/* 2>/dev/null || true
docker system prune -af --volumes 2>/dev/null || true

# Sincronizar Sistema de Versionamento Contínuo de 9 Dígitos
python3 "$WORKSPACE_DIR/scripts/sync_version.py"
if [ -f "$OUTPUT_DIR/version.env" ]; then
    source "$OUTPUT_DIR/version.env"
fi

APP_VER="${APP_VERSION:-002.002.162}"
export CI=1
unset _JAVA_OPTIONS 2>/dev/null || true
export GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx2048m -Dorg.gradle.workers.max=2 -Dorg.gradle.parallel=true"

# 3. Configurar Java 17 (Obrigatório para Gradle 8.6 / Android)
echo "☕ Configurando Java 17..."
JAVA_17_FOUND=""

# Procurar Java 17 em caminhos conhecidos (SDKMAN, /usr/lib/jvm, /opt)
for candidate in \
    /usr/lib/jvm/java-17-openjdk-amd64 \
    /usr/lib/jvm/java-1.17.0-openjdk-amd64 \
    /usr/local/sdkman/candidates/java/17* \
    $HOME/.sdkman/candidates/java/17* \
    /opt/java/17* \
    /opt/hostedtoolcache/Java_temurin-bin/17*
do
    if [ -d "$candidate" ] && [ -f "$candidate/bin/javac" ]; then
        JAVA_17_FOUND="$candidate"
        break
    fi
done

# Se não encontrou instalado, instalar OpenJDK 17 via apt-get
if [ -z "$JAVA_17_FOUND" ]; then
    echo "📥 Instalando OpenJDK 17..."
    sudo apt-get update -qq >/dev/null 2>&1 || true
    sudo apt-get install -y -qq openjdk-17-jdk-headless >/dev/null 2>&1 || true
    for candidate in /usr/lib/jvm/java-17-openjdk* /usr/lib/jvm/*17*; do
        if [ -d "$candidate" ] && [ -f "$candidate/bin/javac" ]; then
            JAVA_17_FOUND="$candidate"
            break
        fi
    done
fi

if [ -n "$JAVA_17_FOUND" ]; then
    export JAVA_HOME="$JAVA_17_FOUND"
    export PATH="$JAVA_HOME/bin:$PATH"
    echo "✅ JAVA_HOME configurado com sucesso para Java 17: $JAVA_HOME"
else
    echo "⚠️ Java 17 não encontrado. Tentando usar o java disponível."
fi
"$JAVA_HOME/bin/java" -version 2>&1 | head -n 2 || java -version 2>&1 | head -n 2

# 4. Configurar Android SDK
if [ -d "/usr/local/lib/android/sdk" ]; then
    export ANDROID_HOME="/usr/local/lib/android/sdk"
elif [ -d "$HOME/android-sdk" ]; then
    export ANDROID_HOME="$HOME/android-sdk"
else
    export ANDROID_HOME="$HOME/android-sdk"
fi
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# Criar local.properties para a pasta android/
cat << EOF > "$WORKSPACE_DIR/android/local.properties"
sdk.dir=$ANDROID_HOME
EOF

# 5. Garantir Gradle Wrapper JAR
mkdir -p "$WORKSPACE_DIR/android/gradle/wrapper"
if [ ! -f "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar" ] || [ ! -s "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar" ]; then
    echo "📥 Baixando Gradle Wrapper JAR..."
    wget -q https://raw.githubusercontent.com/gradle/gradle/v8.6.0/gradle/wrapper/gradle-wrapper.jar -O "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar"
fi

# ==============================================================================
# 🎬 COMPILAÇÃO 1: ANDROID TV NETFLIX STYLE
# ==============================================================================
if [ "$BUILD_TV_NETFLIX" = true ]; then
    echo "=================================================="
    echo "🎬 Compilando UI Web e APK Android TV Netflix v$APP_VER..."
    echo "=================================================="
    if [ -d "$WORKSPACE_DIR/tv-netflix" ]; then
        cd "$WORKSPACE_DIR/tv-netflix"
        npm install --silent 2>/dev/null || true
        npm run build
        mkdir -p "$WORKSPACE_DIR/android/app-modern/src/main/assets/tv-netflix"
        rm -rf "$WORKSPACE_DIR/android/app-modern/src/main/assets/tv-netflix"/* 2>/dev/null || true
        cp -r dist/* "$WORKSPACE_DIR/android/app-modern/src/main/assets/tv-netflix/"
    fi

    cd "$WORKSPACE_DIR/android"
    chmod +x ./gradlew
    ./gradlew :app-modern:assembleDebug --no-daemon

    TV_MODERN_APK="$(find "$WORKSPACE_DIR/android/app-modern/build/outputs/apk" -name "*.apk" | head -n 1)"
    if [ -n "$TV_MODERN_APK" ]; then
        cp "$TV_MODERN_APK" "$OUTPUT_DIR/ServONVIF_TV_Netflix_v${APP_VER}.apk"
        echo "✅ APK Netflix Gerado: $OUTPUT_DIR/ServONVIF_TV_Netflix_v${APP_VER}.apk"
    fi
fi

# ==============================================================================
# 📺 COMPILAÇÃO 2: ANDROID TV CLÁSSICO
# ==============================================================================
if [ "$BUILD_TV_CLASSIC" = true ]; then
    echo "=================================================="
    echo "📺 Compilando APK Android TV Clássico v$APP_VER..."
    echo "=================================================="
    cd "$WORKSPACE_DIR/android"
    chmod +x ./gradlew
    ./gradlew :app:assembleDebug --no-daemon

    TV_CLASSIC_APK="$(find "$WORKSPACE_DIR/android/app/build/outputs/apk" -name "*.apk" | head -n 1)"
    if [ -n "$TV_CLASSIC_APK" ]; then
        cp "$TV_CLASSIC_APK" "$OUTPUT_DIR/ServONVIF_TV_Classic_v${APP_VER}.apk"
        echo "✅ APK Clássico Gerado: $OUTPUT_DIR/ServONVIF_TV_Classic_v${APP_VER}.apk"
    fi
fi

# ==============================================================================
# 📱 COMPILAÇÃO 3: SERVONVIF MOBILE (REACT NATIVE / EXPO STANDALONE)
# ==============================================================================
if [ "$BUILD_MOBILE" = true ]; then
    echo "=================================================="
    echo "📱 Compilando APK ServONVIF Mobile v$APP_VER..."
    echo "=================================================="
    cd "$WORKSPACE_DIR/mobile"
    npm install --legacy-peer-deps --silent
    rm -rf "$WORKSPACE_DIR/mobile/android"
    find "$WORKSPACE_DIR/mobile/node_modules" -name ".cxx" -type d -exec rm -rf {} + 2>/dev/null || true
    CI=1 npx expo prebuild --platform android --clean --no-install
    python3 "$WORKSPACE_DIR/scripts/patch_mobile_gradle.py"

    cat << EOF > "$WORKSPACE_DIR/mobile/android/local.properties"
sdk.dir=$ANDROID_HOME
EOF

    cd "$WORKSPACE_DIR/mobile/android"
    chmod +x ./gradlew
    ./gradlew assembleRelease -x lint -x lintVitalAnalyzeRelease -x lintVitalRelease -x test --no-daemon

    MOBILE_APK="$(find "$WORKSPACE_DIR/mobile/android/app/build/outputs/apk/release" -name "*release*.apk" 2>/dev/null | head -n 1)"
    if [ -z "$MOBILE_APK" ]; then
        MOBILE_APK="$(find "$WORKSPACE_DIR/mobile/android/app/build/outputs/apk" -name "*.apk" | head -n 1)"
    fi

    if [ -n "$MOBILE_APK" ]; then
        cp "$MOBILE_APK" "$OUTPUT_DIR/ServONVIF_Mobile_v${APP_VER}.apk"
        echo "✅ APK Mobile Gerado: $OUTPUT_DIR/ServONVIF_Mobile_v${APP_VER}.apk"
    fi
fi

echo ""
echo "=================================================="
echo "🎉 COMPILAÇÃO FINALIZADA COM SUCESSO!"
echo "=================================================="
echo "📁 ARQUIVOS DISPONÍVEIS EM: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"/*.apk 2>/dev/null || true
echo "=================================================="
