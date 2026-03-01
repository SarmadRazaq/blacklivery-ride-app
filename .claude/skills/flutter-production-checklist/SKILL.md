---
name: flutter-production-checklist
description: >
  Blacklivery Flutter production readiness guide. Use before submitting to Play Store or
  App Store, when configuring release builds, setting up signing, handling permissions,
  debugging crashes on release builds, setting up ProGuard rules, configuring app icons/splash,
  or doing final QA before launch. Also use when setting up CI/CD, environment variables,
  or any deployment-related task for Nigeria or Chicago launch.
---

# Blacklivery Flutter Production Checklist

## Environment Variables (Never hardcode keys)
```dart
// Use --dart-define at build time, never put keys in code
// lib/core/constants/env.dart
class Env {
  static const googleMapsKey = String.fromEnvironment('GOOGLE_MAPS_KEY');
  static const paystackPublicKey = String.fromEnvironment('PAYSTACK_PUBLIC_KEY');
  static const stripePublishableKey = String.fromEnvironment('STRIPE_PUBLISHABLE_KEY');
  static const firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
}

// Build command
// flutter build apk --dart-define=GOOGLE_MAPS_KEY=xxx --dart-define=PAYSTACK_PUBLIC_KEY=xxx
```

## Two Separate Apps (Rider & Driver)
```yaml
# rider/pubspec.yaml
name: blacklivery_rider
# android/app/build.gradle applicationId: com.blacklivery.app
# ios/Runner/Info.plist CFBundleIdentifier: com.blacklivery.app

# driver/pubspec.yaml
name: blacklivery_driver
# android/app/build.gradle applicationId: com.blacklivery.driver
# ios/Runner/Info.plist CFBundleIdentifier: com.blacklivery.driver
```

## Android Configuration

### AndroidManifest.xml — Required Permissions
```xml
<!-- Rider App -->
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>

<!-- Driver App — additional -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

<!-- Google Maps Key -->
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="${GOOGLE_MAPS_KEY}"/>
```

### build.gradle (app-level)
```groovy
android {
  compileSdkVersion 34
  defaultConfig {
    minSdkVersion 21      // Android 5.0 — covers 99% of Nigerian Android devices
    targetSdkVersion 34
    multiDexEnabled true
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                    'proguard-rules.pro'
    }
  }
}
```

### proguard-rules.pro (prevent stripping critical classes)
```
# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Google Maps
-keep class com.google.android.gms.maps.** { *; }

# Paystack
-keep class co.paystack.android.** { *; }

# Stripe
-keep class com.stripe.android.** { *; }

# Flutterwave
-keep class com.flutterwave.** { *; }

# Flutter
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Dart
-keepattributes *Annotation*
-keepattributes Signature
```

## iOS Configuration

### Info.plist — Required Keys
```xml
<!-- Location (Rider) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Blacklivery needs your location to find nearby drivers.</string>

<!-- Location (Driver — needs "always") -->
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Blacklivery needs your location in the background while you're driving.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Blacklivery Driver needs background location to match you with riders.</string>

<!-- Camera & Photos -->
<key>NSCameraUsageDescription</key>
<string>Blacklivery needs camera access for document uploads.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Blacklivery needs photo library access for profile pictures.</string>

<!-- Background Location (Driver only) -->
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

### AppDelegate.swift
```swift
import GoogleMaps
@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(_ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    GMSServices.provideAPIKey("YOUR_MAPS_KEY") // before GeneratedPluginRegistrant
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

## App Icons & Splash Screen
```yaml
# pubspec.yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/icons/app_icon.png"  # 1024x1024 PNG, no transparency for iOS
  adaptive_icon_background: "#000000"      # Blacklivery black
  adaptive_icon_foreground: "assets/icons/app_icon_foreground.png"

flutter_native_splash:
  color: "#000000"
  image: assets/splash/splash_logo.png
  android_12:
    image: assets/splash/splash_logo.png
    color: "#000000"
```
```bash
flutter pub run flutter_launcher_icons
flutter pub run flutter_native_splash:create
```

## Minimum SDK Requirements
```
Android: minSdkVersion 21 (Android 5.0 — covers low-end Nigerian devices)
iOS: minimum deployment target 13.0
```

## Release Build Commands
```bash
# Android APK (for testing)
flutter build apk --release \
  --dart-define=GOOGLE_MAPS_KEY=xxx \
  --dart-define=PAYSTACK_PUBLIC_KEY=xxx \
  --dart-define=STRIPE_PUBLISHABLE_KEY=xxx

# Android App Bundle (for Play Store)
flutter build appbundle --release \
  --dart-define=GOOGLE_MAPS_KEY=xxx \
  --dart-define=PAYSTACK_PUBLIC_KEY=xxx

# iOS (from Mac only)
flutter build ios --release \
  --dart-define=GOOGLE_MAPS_KEY=xxx \
  --dart-define=STRIPE_PUBLISHABLE_KEY=xxx
```

## Android Signing Setup
```
# 1. Generate keystore (run once)
keytool -genkey -v -keystore blacklivery.keystore \
  -alias blacklivery -keyalg RSA -keysize 2048 -validity 10000

# 2. android/key.properties (add to .gitignore!)
storePassword=your_password
keyPassword=your_password
keyAlias=blacklivery
storeFile=../blacklivery.keystore

# 3. Reference in build.gradle (already shown above)
```

## Pre-Launch QA Checklist
```
FUNCTIONALITY
[ ] OTP login works on both +234 and +1 numbers
[ ] Ride booking completes end-to-end (request → match → complete → payment)
[ ] Driver receives ride request notification within 5 seconds
[ ] Driver location visible on rider map in real-time
[ ] Fare calculated correctly for Nigeria AND Chicago
[ ] Surge multiplier applies correctly
[ ] Paystack charge completes and driver wallet credited
[ ] Stripe charge completes for Chicago test
[ ] Driver withdrawal flow works (Monnify for Nigeria)
[ ] Cancellation fee charged correctly
[ ] Push notifications arrive in background (test with app killed)
[ ] Deep links work (GoRouter)

PERFORMANCE
[ ] Test on low-end Android (2GB RAM, Snapdragon 450)
[ ] Map renders without stuttering on slow device
[ ] App launch < 3 seconds on mid-range device
[ ] No memory leaks (run flutter DevTools → memory profiler)
[ ] Images use cached_network_image (no repeated downloads)

PERMISSIONS
[ ] Location permission requested at right moment (not on splash)
[ ] Camera permission requested before upload
[ ] Notification permission requested (Android 13+)
[ ] Background location permission for driver (separate prompt, explain why)

APP STORE / PLAY STORE REQUIREMENTS
[ ] Privacy policy URL live and linked in app listing
[ ] App icons match required sizes (Play: 512x512, App Store: 1024x1024)
[ ] Screenshots prepared for all required device sizes
[ ] Content rating completed (Play Store)
[ ] Data safety form completed (Play Store — declare location, payments data)
[ ] App Privacy labels filled (App Store — location, payments)
[ ] No test/debug keys in release build
[ ] No hardcoded API keys in source (verify with grep -r "pk_live" lib/)
[ ] Both apps have unique bundle IDs (com.blacklivery.app, com.blacklivery.driver)

NIGERIA SPECIFIC
[ ] App works on Nigerian carrier networks (test with MTN/Glo SIM)
[ ] Paystack test mode disabled, live keys in use
[ ] NGN currency displays correctly (₦ symbol, comma separators)

CHICAGO SPECIFIC
[ ] Stripe live keys in use (not test)
[ ] USD currency displays correctly ($ symbol, decimal)
[ ] Airport transfer fixed prices load correctly
```

## Common Release Build Errors & Fixes

### "Multidex" error on old Android
```groovy
// build.gradle
defaultConfig { multiDexEnabled true }
dependencies { implementation 'androidx.multidex:multidex:2.0.1' }
```

### Google Maps blank on release
```
Fix: Add API key restriction in Google Cloud Console
→ Restrict to package name: com.blacklivery.app + SHA-1 fingerprint
```

### Firebase not working on release
```
Fix: Ensure google-services.json SHA-1 matches your release keystore
→ firebase appdistribution:addtesters or add SHA in Firebase Console
```

### iOS build fails — CocoaPods
```bash
cd ios && pod install --repo-update && cd ..
flutter clean && flutter pub get
```

### Paystack SDK crash on release
```
Fix: Add ProGuard rule:
-keep class co.paystack.android.** { *; }
```
