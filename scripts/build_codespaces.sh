#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 ServONVIF - Compilação de APKs no Codespaces"
echo "=================================================="

WORKSPACE_DIR="$(pwd)"
OUTPUT_DIR="$WORKSPACE_DIR/build-outputs"
mkdir -p "$OUTPUT_DIR"

# 0. Sincronizar Código com o GitHub mais recente no Codespaces
echo "🔄 Ajustando permissões e sincronizando repositório com o GitHub..."
sudo chown -R $(whoami):$(whoami) "$WORKSPACE_DIR" 2>/dev/null || true
sudo chmod -R u+rwX "$WORKSPACE_DIR" 2>/dev/null || true
git fetch origin main 2>/dev/null || true
git reset --hard origin/main 2>/dev/null || true
git fetch --unshallow 2>/dev/null || true
git pull origin main 2>/dev/null || true

# 1. Limpeza Agressiva de Disco no Codespaces para Evitar 'No space left on device'
echo "🧹 Liberando espaço em disco no Codespaces..."
sudo swapoff -a 2>/dev/null || true
sudo rm -f /swapfile 2>/dev/null || true
sudo apt-get clean 2>/dev/null || true
sudo rm -rf /tmp/* /var/tmp/* 2>/dev/null || true
docker system prune -af --volumes 2>/dev/null || true
rm -rf ~/.npm/_cacache 2>/dev/null || true
rm -rf "$OUTPUT_DIR"/*.apk 2>/dev/null || true

echo "💽 Espaço em Disco Disponível:"
df -h /

# Sincronizar Sistema de Versionamento Contínuo de 9 Dígitos (000.000.000)
python3 "$WORKSPACE_DIR/scripts/sync_version.py"
if [ -f "$OUTPUT_DIR/version.env" ]; then
    source "$OUTPUT_DIR/version.env"
fi

APP_VER="${APP_VERSION:-002.002.145}"
export CI=1

# Unset _JAVA_OPTIONS para não corromper subprocessos do CMake/Prefab
unset _JAVA_OPTIONS 2>/dev/null || true
export GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx2048m -Dorg.gradle.workers.max=1 -Dorg.gradle.parallel=false"

# Alocar Swap leve (1GB) apenas se houver mais de 5GB de disco livre
FREE_KB=$(df --output=avail / | tail -n 1)
if [ "$FREE_KB" -gt 5000000 ]; then
    echo "💾 Alocando 1GB de memória Swap leve..."
    (sudo fallocate -l 1024M /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=1024 2>/dev/null) && \
    sudo chmod 600 /swapfile 2>/dev/null && \
    sudo mkswap /swapfile 2>/dev/null && \
    sudo swapon /swapfile 2>/dev/null || true
fi

# 2. Configurar Java 17 obrigatório
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
fi
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/cmdline-tools/tools/bin:$ANDROID_HOME/platform-tools:$PATH"

# Instalar NDK 26.1 e CMake 3.22 necessários para React Native 0.74 (Fabric)
if command -v sdkmanager &> /dev/null; then
    yes | sdkmanager --licenses > /dev/null 2>&1 || true
    if [ ! -d "$ANDROID_HOME/ndk/26.1.10909125" ] || [ ! -d "$ANDROID_HOME/cmake/3.22.1" ]; then
        echo "📦 Instalando Android NDK 26.1 e CMake 3.22..."
        sdkmanager "platforms;android-34" "build-tools;34.0.0" "cmake;3.22.1" "ndk;26.1.10909125" > /dev/null 2>&1 || true
    fi
fi

if [ -d "$ANDROID_HOME/ndk/26.1.10909125" ]; then
    export ANDROID_NDK_HOME="$ANDROID_HOME/ndk/26.1.10909125"
    export ANDROID_NDK_ROOT="$ANDROID_NDK_HOME"
fi

# 3. Garantir gradle-wrapper.jar presente
mkdir -p "$WORKSPACE_DIR/android/gradle/wrapper"
if [ ! -f "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar" ] || [ ! -s "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar" ]; then
    echo "📥 Baixando Gradle Wrapper JAR..."
    wget -q https://raw.githubusercontent.com/gradle/gradle/v8.6.0/gradle/wrapper/gradle-wrapper.jar -O "$WORKSPACE_DIR/android/gradle/wrapper/gradle-wrapper.jar"
fi

echo "=================================================="
echo "📺 Compilando APKs TV (Clássico & Netflix) v$APP_VER..."
echo "=================================================="
cd "$WORKSPACE_DIR/android"
chmod +x ./gradlew
./gradlew :app:assembleDebug :app-modern:assembleDebug --no-daemon

# 1. Localizar e copiar APK 1 (TV Clássico)
TV_CLASSIC_APK="$(find "$WORKSPACE_DIR/android/app/build/outputs/apk" -name "*.apk" | head -n 1)"
if [ -n "$TV_CLASSIC_APK" ]; then
    cp "$TV_CLASSIC_APK" "$OUTPUT_DIR/ServONVIF_TV_Classic_v${APP_VER}.apk"
    echo "✅ APK 1 Gerado: $OUTPUT_DIR/ServONVIF_TV_Classic_v${APP_VER}.apk"
fi

# 2. Localizar e copiar APK 2 (TV Netflix Style)
TV_MODERN_APK="$(find "$WORKSPACE_DIR/android/app-modern/build/outputs/apk" -name "*.apk" | head -n 1)"
if [ -n "$TV_MODERN_APK" ]; then
    cp "$TV_MODERN_APK" "$OUTPUT_DIR/ServONVIF_TV_Netflix_v${APP_VER}.apk"
    echo "✅ APK 2 Gerado: $OUTPUT_DIR/ServONVIF_TV_Netflix_v${APP_VER}.apk"
fi

# Liberar espaço de compilação intermediária da TV antes de iniciar o Mobile
echo "🧹 Liberando arquivos intermediários da TV para economizar disco..."
rm -rf "$WORKSPACE_DIR/android/app/build/intermediates" "$WORKSPACE_DIR/android/app-modern/build/intermediates" 2>/dev/null || true

echo "=================================================="
echo "📱 Compilando APK 3: ServONVIF Mobile v$APP_VER..."
echo "=================================================="
cd "$WORKSPACE_DIR/mobile"

# Sincronizar e instalar dependências do Mobile
echo "📦 Instalando dependências do Mobile..."
npm install --legacy-peer-deps --silent

# Gerar estrutura limpa do Expo Android sem prompt interativo
echo "📦 Executando expo prebuild..."
rm -rf "$WORKSPACE_DIR/mobile/android"
find "$WORKSPACE_DIR/mobile/node_modules" -name ".cxx" -type d -exec rm -rf {} + 2>/dev/null || true
CI=1 npx expo prebuild --platform android --clean --no-install

# Aplicar patches de compatibilidade (cameraview maven repo + buildConfig + memory guards)
python3 "$WORKSPACE_DIR/scripts/patch_mobile_gradle.py"

# Garantir local.properties com sdk.dir
cat << EOF > "$WORKSPACE_DIR/mobile/android/local.properties"
sdk.dir=$ANDROID_HOME
EOF

cd "$WORKSPACE_DIR/mobile/android"
chmod +x ./gradlew
echo "⚡ Compilando APK Standalone Release (com bundle JS embutido)..."
./gradlew assembleRelease -x lint -x lintVitalAnalyzeRelease -x lintVitalRelease -x test --no-daemon

# Localizar e copiar APK Mobile com nome e versão
MOBILE_APK="$(find "$WORKSPACE_DIR/mobile/android/app/build/outputs/apk/release" -name "*release*.apk" 2>/dev/null | head -n 1)"
if [ -z "$MOBILE_APK" ]; then
    MOBILE_APK="$(find "$WORKSPACE_DIR/mobile/android/app/build/outputs/apk" -name "*.apk" | head -n 1)"
fi

if [ -n "$MOBILE_APK" ]; then
    cp "$MOBILE_APK" "$OUTPUT_DIR/ServONVIF_Mobile_v${APP_VER}.apk"
    echo "✅ APK 3 Gerado: $OUTPUT_DIR/ServONVIF_Mobile_v${APP_VER}.apk"
fi

# Limpar intermediários do Mobile
rm -rf "$WORKSPACE_DIR/mobile/android/app/build/intermediates" 2>/dev/null || true

echo "=================================================="
echo "🎉 Compilação Concluída com Sucesso!"
echo "=================================================="
echo "📁 CAMINHO LOCAL DOS ARQUIVOS NO CODESPACES:"
echo "   /workspaces/ServONVIF2/build-outputs/ServONVIF_TV_Classic_v${APP_VER}.apk"
echo "   /workspaces/ServONVIF2/build-outputs/ServONVIF_TV_Netflix_v${APP_VER}.apk"
echo "   /workspaces/ServONVIF2/build-outputs/ServONVIF_Mobile_v${APP_VER}.apk"
echo ""
echo "💡 DICA: No painel esquerdo do Codespaces, clique na pasta 'build-outputs',"
echo "   clique com o BOTÃO DIREITO no APK desejado e selecione 'Download...' para baixar no seu computador."
echo "=================================================="

# 4. Publicar / Atualizar Release no GitHub
if command -v gh &> /dev/null; then
    echo "📦 Atualizando Release no GitHub..."
    RELEASE_TAG="v${APP_VER}"
    if gh auth status >/dev/null 2>&1; then
        if gh release view "$RELEASE_TAG" >/dev/null 2>&1; then
            echo "🔄 Release $RELEASE_TAG já existe. Enviando novos APKs..."
            gh release upload "$RELEASE_TAG" \
                "$OUTPUT_DIR/ServONVIF_TV_Classic_v${APP_VER}.apk" \
                "$OUTPUT_DIR/ServONVIF_TV_Netflix_v${APP_VER}.apk" \
                "$OUTPUT_DIR/ServONVIF_Mobile_v${APP_VER}.apk" \
                --clobber || true
        else
            echo "✨ Criando nova Release $RELEASE_TAG no GitHub..."
            gh release create "$RELEASE_TAG" \
                "$OUTPUT_DIR/ServONVIF_TV_Classic_v${APP_VER}.apk" \
                "$OUTPUT_DIR/ServONVIF_TV_Netflix_v${APP_VER}.apk" \
                "$OUTPUT_DIR/ServONVIF_Mobile_v${APP_VER}.apk" \
                --title "ServONVIF $RELEASE_TAG - TV Classic, TV Netflix & Mobile Apps" \
                --notes "🚀 **Lançamento Oficial ServONVIF $RELEASE_TAG**
- 📺 **ServONVIF_TV_Classic_v${APP_VER}.apk**: Aplicativo para Smart TV / Android TV Box com PiP overlay e navegação D-pad tradicional.
- 🎬 **ServONVIF_TV_Netflix_v${APP_VER}.apk**: Nova versão com UI/UX cinematográfica **Estilo Netflix** (Hero Billboard, trilhos de câmeras, foco D-pad glow), mantendo 100% das abas, Mosaico e PiP.
- 📱 **ServONVIF_Mobile_v${APP_VER}.apk**: Aplicativo Mobile Standalone em modo Release (autônomo, sem Metro) com Tailscale Funnel, streaming Zero-Flicker e feed LPR de placas." || true
        fi
        echo "=================================================="
        echo "🌐 LINKS DIRETOS PARA DOWNLOAD NO GITHUB RELEASES:"
        echo "   Página Oficial: https://github.com/jotapelessa/ServONVIF2/releases/tag/${RELEASE_TAG}"
        echo "   • TV Clássico : https://github.com/jotapelessa/ServONVIF2/releases/download/${RELEASE_TAG}/ServONVIF_TV_Classic_v${APP_VER}.apk"
        echo "   • TV Netflix  : https://github.com/jotapelessa/ServONVIF2/releases/download/${RELEASE_TAG}/ServONVIF_TV_Netflix_v${APP_VER}.apk"
        echo "   • Mobile App  : https://github.com/jotapelessa/ServONVIF2/releases/download/${RELEASE_TAG}/ServONVIF_Mobile_v${APP_VER}.apk"
        echo "=================================================="
    else
        echo "ℹ️ GitHub CLI não autenticado. Execute 'gh auth login' se desejar publicar releases automáticas."
    fi
fi
