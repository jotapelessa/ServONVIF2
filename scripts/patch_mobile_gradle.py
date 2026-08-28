import os
import re

def patch():
    workspace = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    mobile_android = os.path.join(workspace, "mobile", "android")
    root_gradle = os.path.join(mobile_android, "build.gradle")
    app_gradle = os.path.join(mobile_android, "app", "build.gradle")
    gradle_properties = os.path.join(mobile_android, "gradle.properties")

    # 1. Patch gradle.properties to enable buildConfig and prevent OOM Killer in Codespaces
    if os.path.exists(gradle_properties):
        with open(gradle_properties, "r", encoding="utf-8") as f:
            props = f.read()
        
        settings = [
            "android.defaults.buildfeatures.buildconfig=true",
            "org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m",
            "org.gradle.parallel=false",
            "org.gradle.workers.max=1",
            "org.gradle.vfs.watch=false",
            # Restrict to arm64-v8a only: avoids CXX1210 "No compatible library" for armeabi-v7a
            # and halves CMake compilation memory, preventing OOM Daemon kill in Codespaces
            "reactNativeArchitectures=arm64-v8a"
        ]
        for setting in settings:
            key = setting.split("=")[0]
            if key not in props:
                props += f"\n{setting}\n"
            else:
                props = re.sub(rf"^{re.escape(key)}=.*$", setting, props, flags=re.MULTILINE)

        with open(gradle_properties, "w", encoding="utf-8") as f:
            f.write(props)
        print("✅ Configured memory bounds and buildconfig in gradle.properties")

    # 2. Patch root build.gradle for expo-camera local maven repo
    if os.path.exists(root_gradle):
        with open(root_gradle, "r", encoding="utf-8") as f:
            content = f.read()
        
        if "expo-camera/android/maven" not in content:
            maven_snippet = 'allprojects {\n    repositories {\n        maven { url "$rootDir/../node_modules/expo-camera/android/maven" }'
            content = content.replace("allprojects {\n    repositories {", maven_snippet, 1)
            with open(root_gradle, "w", encoding="utf-8") as f:
                f.write(content)
            print("✅ Patched root build.gradle with expo-camera maven repo")

    # 3. Patch app/build.gradle for buildFeatures.buildConfig, namespace, and ndkVersion
    if os.path.exists(app_gradle):
        with open(app_gradle, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Ensure ndkVersion
        if "ndkVersion" not in content:
            content = re.sub(r'(android\s*\{)', r'\1\n    ndkVersion "26.1.10909125"', content, count=1)
            print("✅ Added ndkVersion 26.1.10909125 in app/build.gradle")

        # Ensure buildFeatures { buildConfig = true }
        if "buildConfig = true" not in content and "buildConfig true" not in content:
            if "buildFeatures {" in content:
                content = content.replace("buildFeatures {", "buildFeatures {\n        buildConfig = true")
            else:
                content = re.sub(r'(android\s*\{)', r'\1\n    buildFeatures {\n        buildConfig = true\n    }', content, count=1)
            print("✅ Enabled buildConfig in app/build.gradle")

        # Ensure namespace
        if "namespace" not in content:
            content = re.sub(r'(android\s*\{)', r'\1\n    namespace "com.servonvif.mobile"', content, count=1)
            print("✅ Added namespace in app/build.gradle")

        # Ensure release signingConfig uses debug keystore for standalone installable APK
        if "signingConfigs.debug" not in content and "signingConfig signingConfigs.debug" not in content:
            content = re.sub(r'(release\s*\{)', r'\1\n            signingConfig signingConfigs.debug\n            minifyEnabled false', content, count=1)
            print("✅ Configured release build to sign with debug keystore and disable minify")
        else:
            # Replace minifyEnabled with false to prevent proguard missing class errors
            content = re.sub(r'minifyEnabled\s+enableProguardInReleaseBuilds', 'minifyEnabled false', content)
            print("✅ Disabled Proguard minify in release build for maximum build speed & reliability")

        # Disable Lint during build to prevent high memory usage and OOM crash
        if "lint {" not in content and "lintOptions {" not in content:
            lint_block = """
    lint {
        abortOnError false
        checkReleaseBuilds false
    }
"""
            content = re.sub(r'(android\s*\{)', r'\1' + lint_block, content, count=1)
            print("✅ Disabled checkReleaseBuilds in app/build.gradle")

        with open(app_gradle, "w", encoding="utf-8") as f:
            f.write(content)

if __name__ == "__main__":
    patch()
