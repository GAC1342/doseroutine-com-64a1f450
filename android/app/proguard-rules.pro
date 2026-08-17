# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep Capacitor core classes and plugin entry points so the WebView bridge
# and native plugin discovery keep working after R8 obfuscation.
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.doseroutine.app.** { *; }

# Keep JavaScript interface methods used by the Capacitor bridge.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve line number info for debugging crashlytics/stack traces.
-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
