#!/usr/bin/env python3
import os
import re
import subprocess
from pathlib import Path

VERSION_MAJOR = 2
VERSION_MINOR = 2
BASE_BUILD_COUNT = 142

def get_git_count(repo_dir: Path) -> int:
    try:
        # Check if shallow and unshallow if possible
        subprocess.run(["git", "fetch", "--unshallow"], cwd=repo_dir, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL, timeout=4.0)
    except Exception:
        pass

    try:
        out = subprocess.check_output(
            ["git", "rev-list", "--count", "HEAD"],
            cwd=repo_dir,
            stderr=subprocess.DEVNULL,
            timeout=2.0
        )
        count = int(out.decode().strip())
        return max(count, BASE_BUILD_COUNT)
    except Exception:
        return BASE_BUILD_COUNT

def sync_all():
    repo_dir = Path(__file__).resolve().parent.parent
    build_count = get_git_count(repo_dir)
    
    # 9-digit Canonical Version (000.000.000)
    canonical_version = f"{VERSION_MAJOR:03d}.{VERSION_MINOR:03d}.{build_count:03d}"
    semver_version = f"{VERSION_MAJOR}.{VERSION_MINOR}.{build_count}"
    android_version_code = VERSION_MAJOR * 1000000 + VERSION_MINOR * 1000 + build_count

    print("==================================================")
    print(f"🏷️  Sincronizando Sistema de Versão 9 Dígitos")
    print(f"📌 Versão Canônica : {canonical_version}")
    print(f"🔢 Version Code    : {android_version_code}")
    print("==================================================")

    # 1. Android TV App (android/app/build.gradle.kts)
    tv_gradle = repo_dir / "android" / "app" / "build.gradle.kts"
    if tv_gradle.exists():
        content = tv_gradle.read_text(encoding="utf-8")
        content = re.sub(r'versionCode\s*=\s*\d+', f'versionCode = {android_version_code}', content)
        content = re.sub(r'versionName\s*=\s*"[^"]+"', f'versionName = "{canonical_version}"', content)
        tv_gradle.write_text(content, encoding="utf-8")
        print(f"✅ Atualizado TV app build.gradle.kts -> {canonical_version} (code {android_version_code})")

    # 2. Android Modern App (android/app-modern/build.gradle.kts)
    modern_gradle = repo_dir / "android" / "app-modern" / "build.gradle.kts"
    if modern_gradle.exists():
        content = modern_gradle.read_text(encoding="utf-8")
        content = re.sub(r'versionCode\s*=\s*\d+', f'versionCode = {android_version_code}', content)
        content = re.sub(r'versionName\s*=\s*"[^"]+"', f'versionName = "{canonical_version}"', content)
        modern_gradle.write_text(content, encoding="utf-8")
        print(f"✅ Atualizado TV app-modern build.gradle.kts -> {canonical_version}")

    # 3. Android API Clients (ping telemetry payload)
    api_clients = [
        repo_dir / "android" / "app" / "src" / "main" / "java" / "com" / "servonvif" / "client" / "network" / "ServOnvifApiClient.kt",
        repo_dir / "android" / "app-modern" / "src" / "main" / "java" / "com" / "servonvif" / "client" / "modern" / "network" / "ServOnvifApiClient.kt"
    ]
    for client_file in api_clients:
        if client_file.exists():
            content = client_file.read_text(encoding="utf-8")
            content = re.sub(r'"app_version"\s*to\s*"[^"]+"', f'"app_version" to "{canonical_version}"', content)
            client_file.write_text(content, encoding="utf-8")
            print(f"✅ Atualizado {client_file.name} -> {canonical_version}")

    # 4. Mobile App (mobile/app.json)
    mobile_app_json = repo_dir / "mobile" / "app.json"
    if mobile_app_json.exists():
        content = mobile_app_json.read_text(encoding="utf-8")
        content = re.sub(r'"version":\s*"[^"]+"', f'"version": "{canonical_version}"', content)
        content = re.sub(r'"versionCode":\s*\d+', f'"versionCode": {android_version_code}', content)
        mobile_app_json.write_text(content, encoding="utf-8")
        print(f"✅ Atualizado mobile/app.json -> {canonical_version} (code {android_version_code})")

    # 5. Mobile App (mobile/package.json)
    mobile_pkg = repo_dir / "mobile" / "package.json"
    if mobile_pkg.exists():
        content = mobile_pkg.read_text(encoding="utf-8")
        content = re.sub(r'"version":\s*"[^"]+"', f'"version": "{semver_version}"', content, count=1)
        mobile_pkg.write_text(content, encoding="utf-8")
        print(f"✅ Atualizado mobile/package.json -> {semver_version}")

    # 6. Web Panel (ui/package.json)
    ui_pkg = repo_dir / "ui" / "package.json"
    if ui_pkg.exists():
        content = ui_pkg.read_text(encoding="utf-8")
        content = re.sub(r'"version":\s*"[^"]+"', f'"version": "{semver_version}"', content, count=1)
        ui_pkg.write_text(content, encoding="utf-8")
        print(f"✅ Atualizado ui/package.json -> {semver_version}")

    # 7. Web Panel UI (Header.tsx & Settings Page)
    header_file = repo_dir / "ui" / "src" / "components" / "layout" / "Header.tsx"
    if header_file.exists():
        content = header_file.read_text(encoding="utf-8")
        content = re.sub(r'useState<string>\("[^"]+"\)', f'useState<string>("{canonical_version}")', content)
        header_file.write_text(content, encoding="utf-8")
        print(f"✅ Atualizado Header.tsx -> {canonical_version}")

    settings_file = repo_dir / "ui" / "src" / "app" / "settings" / "page.tsx"
    if settings_file.exists():
        content = settings_file.read_text(encoding="utf-8")
        content = re.sub(r'serverInfo\?\.version\s*\|\|\s*"[^"]+"', f'serverInfo?.version || "{canonical_version}"', content)
        settings_file.write_text(content, encoding="utf-8")
        print(f"✅ Atualizado settings/page.tsx -> {canonical_version}")

    # 8. Engine Backend (engine/config/version.py)
    engine_ver = repo_dir / "engine" / "config" / "version.py"
    if engine_ver.exists():
        content = engine_ver.read_text(encoding="utf-8")
        content = re.sub(r'VERSION_MAJOR\s*=\s*\d+', f'VERSION_MAJOR = {VERSION_MAJOR}', content)
        content = re.sub(r'VERSION_MINOR\s*=\s*\d+', f'VERSION_MINOR = {VERSION_MINOR}', content)
        engine_ver.write_text(content, encoding="utf-8")
        print(f"✅ Atualizado engine/config/version.py -> {canonical_version}")

    # Write output for shell scripts
    version_env = repo_dir / "build-outputs" / "version.env"
    version_env.parent.mkdir(parents=True, exist_ok=True)
    version_env.write_text(
        f"APP_VERSION={canonical_version}\nVERSION_CODE={android_version_code}\nSEMVER_VERSION={semver_version}\n",
        encoding="utf-8"
    )
    print(f"💾 Arquivo de versão salvo em: {version_env}")

if __name__ == "__main__":
    sync_all()
