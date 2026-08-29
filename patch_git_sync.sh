--- scripts/build_codespaces.sh
+++ scripts/build_codespaces.sh
@@ -74,6 +74,13 @@
 git fetch origin main 2>/dev/null || true
 git reset --hard origin/main 2>/dev/null || true
 git pull origin main 2>/dev/null || true
+
+# If the script was modified during git pull, bash execution pointer might be corrupted.
+# This safely re-executes the script if we just pulled new changes for it.
+if [ "$(git diff HEAD@{1} HEAD --name-only | grep scripts/build_codespaces.sh)" ]; then
+    echo "⚠️ Script de compilação atualizado via Git. Reiniciando execução com segurança..."
+    exec bash "$0" "$CHOICE"
+fi
 
 # 2. Limpeza de Disco
 echo "🧹 Verificando espaço em disco..."
