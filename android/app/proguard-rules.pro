# Proguard rules for ServONVIF
-keep class com.servonvif.client.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
