# Flutter ProGuard rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Google Maps & GMS
-keep class com.google.android.gms.maps.** { *; }
-keep interface com.google.android.gms.maps.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Paystack
-keep class co.paystack.android.** { *; }
-dontwarn co.paystack.android.**

# Stripe
-keep class com.stripe.android.** { *; }
-dontwarn com.stripe.android.**

# OkHttp (used by Dio)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Dio / Retrofit
-keepattributes Exceptions
-keep class retrofit2.** { *; }

# Socket.IO
-keep class io.socket.** { *; }
-dontwarn io.socket.**

# Geolocator
-keep class com.baseflow.geolocator.** { *; }

# image_picker
-keep class io.flutter.plugins.imagepicker.** { *; }

# flutter_local_notifications
-keep class com.dexterous.flutterlocalnotifications.** { *; }

# Kotlin coroutines
-keepclassmembernames class kotlinx.** { volatile <fields>; }
-dontwarn kotlinx.**

# Play Core (deferred components / split install)
-dontwarn com.google.android.play.core.splitcompat.**
-dontwarn com.google.android.play.core.splitinstall.**
-dontwarn com.google.android.play.core.tasks.**
