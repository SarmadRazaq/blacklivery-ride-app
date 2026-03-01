# BlackLivery Driver App — Production-Readiness Audit Report

**Date:** 2025-07-21  
**Scope:** `f:\BlackLivery\mobile\rider\blackliverydriver\driver\`  
**App Version:** 0.1.0  
**Flutter SDK:** ^3.10.3

---

## Executive Summary

The BlackLivery Driver app is a **well-structured, feature-rich** Flutter application with multi-region support (Nigeria NGN / Chicago USD), real-time WebSocket communication, FCM push notifications, and a complete ride lifecycle. However, it has **critical production blockers** in security, testing, asset management, and robustness that must be addressed before any public release.

| Area | Status |
|------|--------|
| Architecture & Structure | ✅ Good |
| Dependencies | ✅ Good (minor concerns) |
| Firebase Configuration | ✅ Good |
| Android Configuration | ✅ Good |
| iOS Configuration | ✅ Good |
| Environment & Secrets | ⚠️ Issues |
| Screens & Features | ⚠️ Incomplete |
| API Integration | ✅ Good |
| Authentication Flow | ✅ Good (minor gaps) |
| Error Handling | ⚠️ Inconsistent |
| Tests | ❌ **Critical — None exist** |
| State Management | ✅ Good (minor gaps) |
| Assets & Branding | ❌ **Critical — Empty** |
| Security | ⚠️ Issues |
| CI/CD | ✅ Present (needs hardening) |

---

## 1. App Structure & Architecture

### What IS implemented
- **Feature-based folder structure** — clean separation: `auth/`, `chat/`, `earnings/`, `history/`, `home/`, `onboarding/`, `ride/`.
- **Core layer** with shared infrastructure: `network/`, `services/`, `theme/`, `utils/`, `widgets/`, `providers/`, `constants/`.
- Each feature follows a reasonable pattern: `screens/`, `data/models/`, `data/services/`, `providers/`.
- Singleton API client (`ApiClient`) and Socket service (`SocketService`).

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **Duplicate services** | Medium | Two `auth_service.dart` files (`core/services/` and `features/auth/data/services/`) and two `ride_service.dart` files (`core/services/` and `features/ride/data/services/`). The core versions are lower-level wrappers; the feature versions call the API. This works but is confusing — consolidate or rename (e.g. `AuthApiService` vs `AuthSessionService`). |
| **No router package** | Medium | All navigation uses raw `Navigator.of(context).push(MaterialPageRoute(...))`. For production, adopt `go_router` or `auto_route` for declarative routing, deep-link support, and guard middleware. |
| **No dependency injection** | Low | Services are instantiated inline (`DriverService()`, `AuthService()`). Consider `get_it` or `riverpod` for testability and lifecycle control. |
| **No global error boundary** | High | No top-level `ErrorWidget.builder` or `FlutterError.onError` override to catch uncaught framework errors. |

---

## 2. Dependencies (`pubspec.yaml`)

### What IS implemented
All necessary dependencies are present:
- Firebase (core, auth, messaging)
- Google Maps, Geolocator, Geocoding, Polyline Points
- Provider state management
- Dio HTTP client
- Socket.IO client
- SharedPreferences, Secure Storage
- Image Picker, File Picker, Permission Handler
- Flutter Local Notifications, Pinput, Intl, URL Launcher

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **`flutter_secure_storage` imported but unused** | Low | Listed in `pubspec.yaml` but `grep` finds zero usages in `lib/`. Either use it (for tokens instead of SharedPreferences) or remove it. |
| **Version pinning** | Medium | Most dependencies use `^` ranges. For production, pin exact versions or use a lockfile strategy to avoid surprise breakages. Ensure `pubspec.lock` is committed. |
| **`analysis_options.yaml` uses deprecated lints** | Low | Uses `package:flutter_lints/flutter.yaml` — this is deprecated. Migrate to `package:flutter_lints` → `package:lints` or the recommended `flutter_lints` successor. |
| **No crash reporting SDK** | High | No `firebase_crashlytics`, `sentry_flutter`, or similar. Production **must** have crash reporting. |
| **No analytics SDK** | Medium | No `firebase_analytics` or equivalent for tracking user flows. |

---

## 3. Firebase Configuration

### What IS implemented
- `google-services.json` present in `android/app/` (package: `com.blacklivery.driver`).
- `GoogleService-Info.plist` present in `ios/Runner/`.
- Firebase is initialized in `main.dart` before `runApp`.
- FCM token registration with backend.
- Background message handler configured.

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **Firebase Crashlytics not integrated** | High | See Dependencies section. |
| **No Firebase Remote Config** | Low | Nice-to-have for feature flags, kill switches, and force-update prompts. |
| **Credentials in repo** | Medium | `google-services.json` and `GoogleService-Info.plist` are checked in. While common for mobile apps, ensure the Firebase project has proper security rules (Firestore, Storage, Auth). |

---

## 4. Android Configuration

### What IS implemented
- `namespace`: `com.blacklivery.driver`
- `minSdk`: 23, `targetSdk`: 35, `compileSdk`: 35 — up to date.
- Release build: `minifyEnabled = true`, `shrinkResources = true`, ProGuard rules loaded.
- Signing: reads from `key.properties` file (with `.example` template provided).
- Permissions: `INTERNET`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`.
- ProGuard rules cover Flutter, Firebase, and Google Maps.
- Three `AndroidManifest.xml` files (main, debug, profile) with appropriate metadata.
- Google Maps API key referenced via `<meta-data>` from manifest properties.

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **App icon** | High | No custom launcher icon configured. Uses default Flutter icon. Add `flutter_launcher_icons` package and proper icon assets. |
| **Splash screen** | Medium | No native splash configured. Add `flutter_native_splash` for a branded experience before Flutter engine loads. |
| **`versionCode`/`versionName`** | Medium | Currently uses Flutter default `flutter.versionCode`/`flutter.versionName` from `pubspec.yaml` (0.1.0). Must be incremented for Play Store releases. |
| **`key.properties` documentation** | Low | Example file exists but ensure CI creates it from secrets (already done in CI workflow). |
| **Network security config** | Low | No `network_security_config.xml` for cleartext/HTTP in debug. The app uses `10.0.2.2:5000` in .env which requires cleartext on Android 9+. Currently relies on `android:usesCleartextTraffic="true"` in debug manifest — this is fine. |

---

## 5. iOS Configuration

### What IS implemented
- `Info.plist` configured with:
  - `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSLocationAlwaysUsageDescription`
  - `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`
  - `UIBackgroundModes`: `location`, `fetch`, `remote-notification`
  - `NSAppTransportSecurity` → `NSAllowsArbitraryLoads: true` (for development)
- Google Maps iOS API key set in `AppDelegate.swift`.

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **`NSAllowsArbitraryLoads: true`** | High | Must be set to `false` for production, or use `NSExceptionDomains` for specific hosts only. Apple may reject the app otherwise. |
| **App icon & splash** | High | Same as Android — needs custom assets. |
| **Bundle identifier** | Low | Verify it matches your App Store Connect registration. |
| **Entitlements** | Medium | Ensure push notification entitlement is configured in Xcode for both debug and release. |

---

## 6. Environment & Secrets

### What IS implemented
- `.env` file with `API_BASE_URL` and `GOOGLE_MAPS_API_KEY`.
- `.env.example` template provided.
- `.gitignore` includes `.env` at the bottom — secrets excluded from version control ✅.
- `api_constants.dart` reads values at compile time via `--dart-define`, throwing `StateError` if `API_BASE_URL` is missing in release mode.
- CI workflow passes secrets via `--dart-define` from GitHub Secrets.

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **`.env` currently committed** | Critical | Despite `.gitignore` listing `.env`, it appears the file was committed before the ignore rule was added (it's readable in the workspace). Run `git rm --cached .env` and rotate the Google Maps API key immediately. |
| **Google Maps API key in `.env`** | High | The key `AIzaSyC3vvjWrGhV4_E8rq5zktutb04XWU5FPmw` is exposed. Even after removing from git, the key should be rotated and restricted in Google Cloud Console (HTTP referrers / Android app restriction). |
| **No per-environment configs** | Medium | Only one `.env`. Consider `.env.development`, `.env.staging`, `.env.production` with a build flavor system. |
| **Google Maps key in `AppDelegate.swift`** | Medium | The iOS Google Maps key is hardcoded in `AppDelegate.swift`. Extract to build config or `--dart-define`. |

---

## 7. Screens & Features

### What IS implemented

| Feature | Screens | Status |
|---------|---------|--------|
| **Onboarding** | Splash, Phone Entry, OTP Verification, Create Account, Emergency Contacts, Verification (document upload), Account Setup (payout), Incoming Rides Mode, Success | ✅ Complete flow |
| **Auth** | Login, Edit Profile, Documents, Vehicle Info | ✅ Complete |
| **Ride** | Driver Map, Ride Request Overlay/Sheet/Detail, Ride Accepted, Trip Screen, Scheduled Ride Request Sheet | ✅ Complete |
| **Chat** | Chat Screen (with rider) | ✅ Functional (polling) |
| **Earnings** | Earnings Screen, Payout Screen | ✅ Complete |
| **History** | Bookings Screen | ✅ Complete |
| **Home** | Home Dashboard, Support, Incentives, Rating, Settings | ✅ Complete |

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **Placeholder car carousel images** | High | All onboarding screens show colored `Container` boxes with `Icons.directions_car` instead of real car images. Replace with actual asset images. |
| **Chat uses HTTP polling (3-second interval)** | Medium | `ChatProvider` polls via HTTP every 3 seconds. The app already has `SocketService` — migrate chat to WebSocket for real-time delivery and lower battery/data usage. |
| **Settings notification toggles are local-only** | Medium | `SettingsScreen` has notification toggle switches stored in widget `setState` only — values reset on screen rebuild. Persist to SharedPreferences and sync with backend. |
| **No force-update/maintenance screen** | Medium | No mechanism to force users to update the app or display a maintenance banner. |
| **No offline/connectivity indicator** | Medium | No handling for when the device loses internet. The map screen and ride flow should show a connectivity banner. |
| **No dark/light theme toggle** | Low | App is dark-theme only. May want to support system theme. |
| **Delete account flow incomplete** | Medium | Settings shows a delete account button but implementation needs verification that it fully clears local data and navigates to login. |
| **No loading/empty states for some screens** | Low | Some screens handle loading/error/empty states well (Bookings, Documents). Verify consistency across all screens. |

---

## 8. API Integration

### What IS implemented
- **Singleton Dio client** (`ApiClient`) with:
  - Auto-attach Firebase ID token to `Authorization: Bearer` header.
  - 401 interceptor with automatic token refresh and request retry.
  - Configurable base URL via `--dart-define`.
- **Comprehensive endpoint coverage** in `ApiConstants`:
  - Auth (login, register, OTP send/verify)
  - Driver (profile, vehicles, documents, status, rating)
  - Rides (active, history, accept, decline, status updates, route)
  - Earnings (summary, payouts, request payout, bank details)
  - Chat (messages, send)
  - Support (tickets, FAQ)
  - Loyalty/Incentives
  - FCM token registration
- **Socket.IO integration** for real-time ride events with exponential backoff reconnection.

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **No request timeout configured** | High | `Dio` has no explicit `connectTimeout`, `receiveTimeout`, or `sendTimeout`. Add sensible defaults (e.g., 15s connect, 30s receive). |
| **No retry logic for non-401 failures** | Medium | Only 401 retries are handled. Add retry for network errors (timeout, connection reset) with `dio_retry_plus` or manual exponential backoff. |
| **No API response model validation** | Medium | Services parse JSON with direct map access and `as` casts. Invalid responses will throw `TypeError` with no helpful message. Add null checks and fallback values. |
| **No request cancellation** | Low | Long-running requests (route calculation, file upload) should support `CancelToken` for when users navigate away. |
| **WebSocket reconnection cap** | Low | `SocketService` caps reconnection at 5 attempts then gives up silently. Consider infinite retry with longer backoff, or surface a "connection lost" indicator. |

---

## 9. Authentication Flow

### What IS implemented
- **Registration flow**: Phone → OTP → Create Account (name, email, password, phone, region) → Emergency Contacts → Document Verification → Account Setup → Incoming Rides Mode → Map.
- **Login flow**: Email + password → Firebase Auth → Backend profile fetch → Map.
- **Session persistence**: `AuthProvider.checkAuthStatus()` checks `FirebaseAuth.currentUser`, fetches profile, navigates to map if authenticated.
- **Token management**: Firebase ID tokens auto-attached via Dio interceptor; 401 triggers `getIdToken(true)` force-refresh.
- **Online/offline status toggle** for drivers.
- **Logout**: Clears Firebase auth, resets providers, navigates to splash.

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **No biometric/PIN re-authentication** | Low | No secondary auth for sensitive actions (payouts, delete account). |
| **No email verification step** | Medium | Registration accepts email without verification flow. |
| **Password reset flow missing** | High | No "Forgot Password" screen or link on the login screen. |
| **No session expiry handling** | Medium | If the backend invalidates a session (account suspended, etc.), the app only handles 401 at the HTTP level. No explicit "account suspended" or "force logout" mechanism. |
| **Token stored in memory only** | Low | Firebase SDK handles token persistence internally, which is fine. But any additional tokens (if used) should go to `flutter_secure_storage` (which is imported but unused). |

---

## 10. Error Handling

### What IS implemented
- Most async operations use `try/catch` with `SnackBar` error display.
- Providers expose `error` state, and screens show error widgets with retry buttons (Bookings, Documents, Earnings).
- API client handles 401 gracefully with token refresh.
- Socket reconnection with backoff.

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **No global error handler** | High | `main.dart` has no `FlutterError.onError`, no `PlatformDispatcher.instance.onError`, and no `runZonedGuarded`. Uncaught errors will crash the app silently. |
| **Inconsistent error display** | Medium | Some screens use `SnackBar`, others use inline `Text` widgets. Standardize with a global error notification system. |
| **Raw exception messages shown to users** | Medium | Several screens show `e.toString()` directly in snackbars. Map exceptions to user-friendly messages. |
| **No network connectivity checking** | Medium | No proactive check for internet connectivity. Operations fail with cryptic Dio errors. Use `connectivity_plus` to detect and show offline state. |
| **Silent failures in some places** | Medium | `OtpVerificationScreen._sendInitialOtp()` catches and ignores errors. `ChatProvider.stopPolling()` in dispose uses `addPostFrameCallback` which may not run. |

---

## 11. Tests

### What IS implemented
- **Nothing.** The `test/` directory does not exist.

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **No unit tests** | Critical | No tests for any provider, service, model, or utility. |
| **No widget tests** | Critical | No tests for any screen or widget. |
| **No integration tests** | Critical | No `integration_test/` directory. |
| **CI runs `flutter test`** | — | The CI workflow runs `flutter test` which will pass vacuously (no tests = no failures). This gives false confidence. |

**Recommended priority test targets:**
1. `RideModel` — JSON parsing (supports both flat and nested formats)
2. `ApiClient` — 401 retry logic, token attachment
3. `AuthProvider` — login, register, session restore
4. `RideProvider` — ride lifecycle state transitions
5. `CurrencyUtils` — formatting for NGN/USD
6. Widget tests for critical flows (Login, Ride Request acceptance)

---

## 12. State Management

### What IS implemented
- **7 providers** wrapped in `MultiProvider` at app root:
  - `AuthProvider` — auth state, user profile, online status
  - `DriverProvider` — vehicles, documents, profile updates
  - `RideProvider` — active ride, ride requests, WebSocket listening
  - `RideHistoryProvider` — paginated ride history (cursor-based)
  - `ChatProvider` — messages, polling, send
  - `EarningsProvider` — earnings data, payouts, rating distribution
  - `RegionProvider` — multi-region (GPS auto-detect, manual override, persistence)
- All providers use `ChangeNotifier` with `isLoading` and `error` state patterns.
- `notifyListeners()` called appropriately after state changes.

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **No provider disposal** | Medium | Providers are created at app root and never disposed. `ChatProvider` timer, `RideProvider` WebSocket listeners, and `LocationService` streams should be cleaned up. |
| **Chat polling should be WebSocket** | Medium | Repeated from Screens section — move to WebSocket for real-time chat. |
| **Some screens create service instances directly** | Low | `DriverService()`, `AuthService()` instantiated in widgets instead of injected. Makes testing harder. |
| **No state persistence beyond SharedPreferences** | Low | Region is persisted, but other state (e.g., active ride) is not. If the app restarts mid-ride, state must be refetched from backend (which is handled via `checkActiveRide()`). |
| **Settings toggles not in provider** | Medium | Notification preferences in `SettingsScreen` are local `setState` — they need a dedicated provider or at least SharedPreferences persistence. |

---

## 13. Assets & Branding

### What IS implemented
- `assets/images/` directory exists (declared in `pubspec.yaml`).
- App uses Material icons throughout.
- Custom dark theme defined in `app_theme.dart` with consistent `AppColors`.
- No Google Fonts loaded from network (package is imported, check if used).

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **No image assets exist** | Critical | `assets/images/` contains only `.gitkeep`. All car carousel slides, splash branding, and any branded imagery use placeholder `Icons.directions_car`. |
| **No app icon** | Critical | Using default Flutter launcher icon. Must add branded icon for both platforms. Use `flutter_launcher_icons`. |
| **No splash image** | High | Splash screen renders the icon programmatically. Add `flutter_native_splash` with branded image for the native splash before Flutter loads. |
| **Hardcoded "BLACKLIVERY" text branding** | Low | Brand name is hardcoded as string literals in several screens. Consider a constants file for brand strings. |
| **`google_fonts` package** | Low | Imported in `pubspec.yaml` but verify it's actually used. If not, remove to reduce app size. If used, check that fonts are bundled (not fetched at runtime) for offline reliability. |

---

## 14. Security

### What IS implemented
- Firebase Authentication for identity.
- Bearer token attached to all API requests.
- 401 automatic token refresh.
- `.env` file gitignored (at line 49).
- Android release build with minification and ProGuard.
- ProGuard rules for Flutter, Firebase, Google Maps.
- Signing config loaded from external `key.properties` file.

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **`.env` was committed with real API key** | Critical | `AIzaSyC3vvjWrGhV4_E8rq5zktutb04XWU5FPmw` is in the repo. Remove from git history and rotate the key. |
| **`NSAllowsArbitraryLoads: true`** | High | Allows cleartext HTTP on iOS. Disable for production; use `NSExceptionDomains` if needed. |
| **`flutter_secure_storage` unused** | Medium | Package is a dependency but never imported. If storing any sensitive data locally (tokens, PII), use secure storage instead of SharedPreferences. |
| **No certificate pinning** | Medium | Dio client doesn't pin SSL certificates. For a ride-hailing app handling payments, consider `dio_http2_adapter` or custom `SecurityContext` with pinned certs. |
| **No code obfuscation flag** | Medium | Release build has minification but no `--obfuscate --split-debug-info` flags in CI build command. Add these for production APK/IPA builds. |
| **No jailbreak/root detection** | Low | No check for rooted/jailbroken devices. Consider `flutter_jailbreak_detection` for sensitive financial operations. |
| **Google Maps API key in `AppDelegate.swift`** | Medium | Hardcoded. Should be injected via build config. |
| **No input sanitization** | Low | User inputs (chat messages, profile fields) are sent to the API without sanitization. Backend should handle this, but defense-in-depth suggests client-side sanitization too. |

---

## 15. CI/CD

### What IS implemented
- GitHub Actions workflow at `.github/workflows/driver-ci.yml`:
  - Triggers on push to `main`/`develop` and PRs to `main` (path-filtered).
  - Flutter 3.32.2, stable channel, with caching.
  - Steps: `pub get` → `analyze` → `test` → `build apk --release` with `--dart-define` secrets.
  - Uploads APK as artifact.

### What is MISSING / needs change
| Item | Severity | Detail |
|------|----------|--------|
| **No iOS build in CI** | High | Only Android APK is built. Add iOS build step (requires macOS runner). |
| **`flutter test` runs with no tests** | High | CI gives green check with zero tests. Add a test gate (minimum coverage threshold). |
| **No code coverage reporting** | Medium | No coverage collection or threshold enforcement. |
| **No `--obfuscate` in release build** | Medium | CI build command lacks `--obfuscate --split-debug-info=build/symbols`. |
| **No Play Store / App Store deployment** | Medium | Artifacts are uploaded but not deployed. Add Fastlane or equivalent for store deployment. |
| **No lint / format check** | Low | `flutter analyze` runs but `flutter format --set-exit-if-changed .` is not enforced. |

---

## Priority Action Items (Ranked)

### 🔴 Critical (Must fix before any release)

1. **Remove `.env` from git** and rotate the exposed Google Maps API key
2. **Add crash reporting** (Firebase Crashlytics or Sentry)
3. **Create a `test/` directory** and write tests for core services, models, and providers
4. **Add real image assets** — app icon, splash image, car carousel images, brand imagery
5. **Add global error handler** (`FlutterError.onError`, `PlatformDispatcher.instance.onError`, `runZonedGuarded`)

### 🟡 High (Must fix before public launch)

6. Disable `NSAllowsArbitraryLoads` in iOS production builds
7. Add `--obfuscate --split-debug-info` to release builds
8. Add Dio request timeouts (connect: 15s, receive: 30s)
9. Add "Forgot Password" flow
10. Add `flutter_launcher_icons` and `flutter_native_splash` configuration
11. Migrate chat from HTTP polling to WebSocket
12. Add connectivity monitoring and offline UI indicators

### 🟠 Medium (Should fix before public launch)

13. Adopt a declarative router (`go_router` / `auto_route`)
14. Consolidate or rename duplicate service files
15. Persist notification settings (SharedPreferences + backend)
16. Add iOS build to CI pipeline
17. Add certificate pinning for API requests
18. Remove `flutter_secure_storage` or start using it
19. Map exception messages to user-friendly strings
20. Add per-environment build flavors

### 🟢 Low (Post-launch improvements)

21. Add Firebase Analytics / Remote Config
22. Add `get_it` for dependency injection
23. Add biometric re-auth for payouts
24. Add jailbreak/root detection
25. Add email verification flow
26. Support system light/dark theme toggle

---

## File Inventory

Total Dart files in `lib/`: **47**

| Directory | Files | Lines (approx) |
|-----------|-------|---------|
| `lib/` root | 1 (`main.dart`) | ~70 |
| `core/constants/` | 1 | ~70 |
| `core/network/` | 1 | ~80 |
| `core/providers/` | 1 | ~100 |
| `core/services/` | 6 | ~700 |
| `core/theme/` | 1 | ~80 |
| `core/utils/` | 1 | ~40 |
| `core/widgets/` | 3 | ~170 |
| `features/auth/` | 7 | ~1,400 |
| `features/chat/` | 4 | ~500 |
| `features/earnings/` | 3 | ~600 |
| `features/history/` | 3 | ~450 |
| `features/home/` | 5 | ~2,500 |
| `features/onboarding/` | 9 | ~2,200 |
| `features/ride/` | 10 | ~4,600 |
| **Total** | **~56** | **~13,500** |

---

*End of audit report.*
