import sys
import os
import re

def patch():
    workspace = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    mobile_android = os.path.join(workspace, "mobile", "android")
    root_gradle = os.path.join(mobile_android, "build.gradle")
    app_gradle = os.path.join(mobile_android, "app", "build.gradle")

    # 1. Patch root build.gradle for expo-camera local maven repo
    if os.path.exists(root_gradle):
        with open(root_gradle, "r", encoding="utf-8") as f:
            content = f.read()
        
        if "expo-camera/android/maven" not in content:
            maven_snippet = 'allprojects {\n    repositories {\n        maven { url "$rootDir/../node_modules/expo-camera/android/maven" }'
            content = content.replace("allprojects {\n    repositories {", maven_snippet, 1)
            with open(root_gradle, "w", encoding="utf-8") as f:
                f.write(content)
            print("✅ Patched root build.gradle with expo-camera maven repo")

    # 2. Patch app/build.gradle for buildConfig = true and namespace
    if os.path.exists(app_gradle):
        with open(app_gradle, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Ensure buildFeatures { buildConfig true }
        if "buildConfig true" not in content and "buildConfig = true" not in content:
            if "buildFeatures {" in content:
                content = content.replace("buildFeatures {", "buildFeatures {\n        buildConfig true")
            else:
                content = re.sub(r'(android\s*\{)', r'\1\n    buildFeatures {\n        buildConfig true\n    }', content, count=1)
            print("✅ Enabled buildConfig in app/build.gradle")

        # Ensure namespace
        if "namespace" not in content:
            content = re.sub(r'(android\s*\{)', r'\1\n    namespace "com.servonvif.mobile"', content, count=1)
            print("✅ Added namespace in app/build.gradle")

        with open(app_gradle, "w", encoding="utf-8") as f:
            f.write(content)

    # 3. Patch Kotlin source files for explicit imports if needed
    src_dir = os.path.join(mobile_android, "app", "src", "main", "java", "com", "servonvif", "mobile")
    if os.path.exists(src_dir):
        for fname in ["MainActivity.kt", "MainApplication.kt"]:
            fpath = os.path.join(src_dir, fname)
            if os.path.exists(fpath):
                with open(fpath, "r", encoding="utf-8") as f:
                    kt_content = f.read()
                
                imports_to_add = []
                if "import com.servonvif.mobile.BuildConfig" not in kt_content:
                    imports_to_add.append("import com.servonvif.mobile.BuildConfig")
                if "import com.servonvif.mobile.R" not in kt_content:
                    imports_to_add.append("import com.servonvif.mobile.R")
                
                if imports_to_add:
                    package_line = "package com.servonvif.mobile"
                    replacement = package_line + "\n\n" + "\n".join(imports_to_add)
                    kt_content = kt_content.replace(package_line, replacement, 1)
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(kt_content)
                    print(f"✅ Added explicit imports to {fname}")

if __name__ == "__main__":
    patch()
