# Driver App ↔ Backend Integration Report

This document summarizes how the driver app aligns with the BlackLivery backend API and notes any gaps or conventions.

---

## ✅ Aligned Integrations

### Auth
| App | Backend | Notes |
|-----|---------|--------|
| `GET /api/v1/auth/profile` | `GET /auth/profile` | Profile returned as Firestore user doc; app parses `displayName` → first/last, `driverStatus`, `driverProfile`. |
| `PATCH /api/v1/auth/profile` | `PATCH /auth/profile` | App sends `fullName` and `phoneNumber` (aligned). Allowed fields: fullName, phoneNumber, profileImage, emergencyContact, payoutPreference, rideMode. |
| `POST /api/v1/auth/login` | `POST /auth/login` | Firebase token in `Authorization`; backend returns user summary. |
| `POST /api/v1/auth/logout` | `POST /auth/logout` | Revokes refresh tokens. |
| `POST /api/v1/auth/phone/start` | `POST /auth/phone/start` | Send OTP. |
| `POST /api/v1/auth/phone/verify` | `POST /auth/phone/verify` | Verify OTP. |
| `POST /api/v1/auth/driver/onboarding` | `POST /auth/driver/onboarding` | Driver onboarding. |
| `GET /api/v1/driver/application` | `GET /driver/application` | Driver application status. |
| `POST /api/v1/auth/fcm-token`, `DELETE .../fcm-token` | Same | FCM registration. |
| 2FA send/verify/toggle | Same paths | Aligned. |

### Driver availability & heartbeat
| App | Backend | Notes |
|-----|---------|--------|
| `POST /api/v1/driver/availability` | `POST /driver/availability` | Body: `{ isOnline, location?: { lat, lng, heading? } }`. |
| `POST /api/v1/driver/heartbeat` | `POST /driver/heartbeat` | Body: `{ location?: { lat, lng, heading? } }`. |

### Rides
| App | Backend | Notes |
|-----|---------|--------|
| `GET /api/v1/driver/active-ride` | `GET /driver/active-ride` | Returns `{ success, data: ride \| null }`. |
| `GET /api/v1/driver/rides` | `GET /driver/rides` | Query: `page`, `limit`. Response: `{ success, data: rides[], pagination }`. |
| `PUT /api/v1/rides/{id}/status` | `PUT /rides/:id/status` | Body: `{ status }`. |
| `POST /api/v1/rides/{id}/rate-rider` | `POST /rides/:id/rate-rider` | Body: `{ rating, comment? }`. |
| Accept ride | Socket `accept_ride` | App emits `accept_ride` with `rideId`; backend uses driver room to get driverId and calls `transitionRideStatus`. |

### Vehicles
| App | Backend | Notes |
|-----|---------|--------|
| `GET /api/v1/vehicles` | `GET /vehicles` | Driver’s vehicles. |
| `POST /api/v1/vehicles` | `POST /vehicles` | Add vehicle. |

### Earnings & payouts
| App | Backend | Notes |
|-----|---------|--------|
| `GET /api/v1/driver/earnings?period=week` | `GET /driver/earnings` | Backend returns `totalTrips`, `totalEarnings`, `walletBalance`, `currency`, etc. App normalizes `totalTrips` → `ridesCount` in `EarningsProvider`. |
| `GET /api/v1/payouts?page=&limit=` | `GET /payouts` | Returns `{ success, data: payouts[], pagination }`. App uses `data` for history; each payout has `amount`, `currency`, `status`, `reference`, `createdAt` (ISO or Firestore timestamp). |
| `POST /api/v1/payouts/request` | `POST /payouts/request` | Body: `{ amount, currency?, accountNumber?, bankCode?, accountName?, bankAccountId? }`. For NGN, backend requires `accountNumber` and `bankCode`. Response: `{ message, requestId, reference }`. |
| `GET /api/v1/payouts/banks` | `GET /payouts/banks` | Bank list `[{ code, name, type?, currency? }]` for NGN. |
| `POST /api/v1/driver/bank` | `POST /driver/bank` | Bank details: `{ accountName, accountNumber, bankName, bankCode }` (all required; min lengths enforced). |

### Ratings
| App | Backend | Notes |
|-----|---------|--------|
| `GET /api/v1/driver/ratings` | `GET /driver/ratings` | Returns `{ success, data: { averageRating, totalRated, distribution, recentFeedback } }`. App loads this and merges `averageRating` into earnings flow for screens that use `earningsData['rating']`. |

### Chat
| App | Backend | Notes |
|-----|---------|--------|
| `GET /api/v1/chat/rides/{rideId}/messages` | `GET /chat/rides/:rideId/messages` | Aligned. |
| `POST /api/v1/chat/rides/{rideId}/messages` | `POST /chat/rides/:rideId/messages` | Aligned. |
| `POST /api/v1/chat/rides/{rideId}/read` | `POST /chat/rides/:rideId/read` | Aligned. |

### Support
| App | Backend | Notes |
|-----|---------|--------|
| `POST /api/v1/support` | `POST /support` | Create ticket. |
| `GET /api/v1/support` | `GET /support` | My tickets. |
| `POST /api/v1/support/:id/reply` | `POST /support/:id/reply` | Reply. |

---

## Fixes applied in the app

1. **Earnings shape**  
   Backend returns `totalTrips`; the app uses `ridesCount` in several places. `EarningsProvider` now maps `totalTrips` → `ridesCount` when parsing the earnings response.

2. **Rating in earnings**  
   Backend earnings do not include rating. The app calls the ratings API and merges `averageRating` into the earnings data so existing screens that use `earningsData['rating']` keep working.

3. **Profile update fields**  
   Backend only allows `fullName` and `phoneNumber` (not `firstName`/`lastName` or `phone`). Edit Profile now sends `fullName` (first + last name) and `phoneNumber`.

4. **Payment / payout alignment**  
   - **Request payout:** App sends `amount`, `currency` (from earnings), `accountNumber`, `bankCode`, `accountName` to match backend. For NGN the app validates account number and bank code are present. Response `requestId`/`reference` is shown in success message.  
   - **Bank details:** App uses backend shape: `accountName`, `accountNumber`, `bankName`, `bankCode` (all required; min lengths). No `routingNumber` key; backend expects `bankCode`.  
   - **Payout history:** App uses backend payload: `amount`, `currency`, `status`, `reference`, `createdAt`. Dates parsed from ISO or Firestore `{ _seconds }`. Total shown is sum of completed/processing payouts; status displayed with correct labels and colors.

---

## Gaps / follow-ups

### 1. Driver document upload (form vs JSON)
- **Backend:** `POST /api/v1/driver/documents` expects JSON body: `{ documents: [{ type, fileUrl, storagePath, fileName, mimeType, fileSize }] }`. So it expects pre-uploaded file URLs.
- **App:** Sends multipart FormData with `type` and `file`.
- **Needed:** Either (a) backend adds a multipart endpoint that accepts a file, uploads to storage, and then creates the document record with the resulting URL, or (b) app uploads the file to storage (e.g. Firebase Storage) first and then POSTs the document metadata (including `fileUrl`) to the backend. Currently the app’s upload may not satisfy the backend schema.

### 2. Scheduled rides count
- **App:** Home screen shows “Scheduled Rides” using `earningsData['scheduledRidesCount']`. Backend earnings response does not include `scheduledRidesCount`.
- **Options:** Backend could add `scheduledRidesCount` to the earnings (or a small stats) response; or the app could derive it from ride history (e.g. count of scheduled/completed scheduled rides). Until then, the app treats a missing value as 0.

### 3. WebSocket URL
- App uses `ApiConstants.wsUrl` (same as `baseUrl`). Ensure the backend WebSocket server is mounted on the same host/port as the API (or set a separate WS base URL in the app if needed).

---

## Route prefix summary

Backend mounts:
- Auth: `/api/v1/auth`
- Driver: `/api/v1/driver`
- Rides: `/api/v1/rides`
- Vehicles: `/api/v1/vehicles`
- Payouts: `/api/v1/payouts`
- Chat: `/api/v1/chat`
- Support: `/api/v1/support`

All app `ApiConstants` use these prefixes and are consistent with the backend.

---

---

## Data structure alignment

### User / profile
- **Backend** returns Firestore user doc: `uid`, `email`, `displayName`, `phoneNumber`, `driverStatus` (e.g. `{ isOnline, state, lastOnlineAt }`), `driverProfile`, etc. Dates may be ISO strings or Firestore `Timestamp` (serialized as `{ _seconds, _nanoseconds }`).
- **App** `User.fromJson` maps: `displayName` → split into `firstName`/`lastName`, `phoneNumber` → `phone`, `driverStatus.state` → `status`, and parses `driverProfile` / `driverStatus`. No backend change needed.

### Ride
- **Backend** ride doc: `pickupLocation` / `dropoffLocation` (`lat`, `lng`, `address`), `pricing` (`estimatedFare`, `finalFare`, `currency`), `payment.settlement.driverAmount`, and date fields that can be Firestore Timestamps when returned via `doc.data()`.
- **App** `Ride.fromJson` now parses dates from either **ISO strings** or **Firestore-style** `{ _seconds, _nanoseconds }` via a shared `_parseDate()` helper, so active-ride and ride-history responses work regardless of backend serialization.
- **RideRequest** (incoming socket): backend `ride:offer` sends `rideId`, `id`, `pickupLocation`, `dropoffLocation`, `pricing`, `estimatedFare`, `distanceKm`, `etaSeconds`, `riderId`, `riderName`, `riderPhone`. App `RideRequest.fromJson` accepts both `duration`/`distance` and `etaSeconds`/`distanceKm` for compatibility.

### Google Maps
- **App** uses `google_maps_flutter` and a **Directions API** URL with `ApiConstants.googleMapsApiKey` (set via `--dart-define=GOOGLE_MAPS_API_KEY=...` at build). If the key is missing or placeholder, `NavigationService` returns an empty route and logs a debug message; no crash.
- **Backend** uses its own Google Maps (Distance Matrix, Geocoding) server-side. No shared key is required; driver app only needs a key with **Maps SDK** (and optionally Directions) enabled for the app.

---

## Ride logic (start to end)

1. **Rider creates ride** (rider app) → Backend creates ride in `finding_driver`, starts driver matching.
2. **Backend** finds nearby drivers (geohash), fetches rider info, emits **`ride:offer`** to each driver via socket (`notifyDriver(driverId, 'ride:offer', { rideId, pickupLocation, dropoffLocation, pricing, distanceKm, etaSeconds, riderName, riderPhone, ... })`).
3. **Driver app** receives `ride:offer` (or legacy `ride_request`), maps payload to `RideRequest` and shows the overlay with Accept/Decline.
4. **Accept:** App calls **REST** `PUT /api/v1/rides/{rideId}/status` with body `{ status: 'accepted' }` (or socket `accept_ride`; backend supports both). Backend `transitionRideStatus` sets `driverId`, `acceptedAt`, stops matching, notifies rider.
5. **Driver** navigates to pickup → App calls `PUT .../status` with `arrived` → then `in_progress` when ride starts.
6. **During ride:** Optional location updates via socket `location_update`; backend can emit `ride:update` to rider.
7. **Complete:** App calls `PUT .../status` with `completed`. Backend settles payment, updates wallet, emits `ride:completed`.
8. **Rate rider:** App calls `POST /api/v1/rides/{id}/rate-rider` with `{ rating, comment? }`.

All status transitions and payloads are aligned between app and backend.

---

## Google & Apple sign-in

- **Google:** App uses `google_sign_in` → Firebase `GoogleAuthProvider.credential` → `signInWithCredential` → gets Firebase **idToken** → `POST /api/v1/auth/google` with `{ idToken, role: 'driver' }`. Backend verifies idToken with Firebase Admin, creates/links user in Firestore, returns 200. App then fetches profile with `GET /api/v1/auth/profile`. Fully integrated.
- **Apple:** App uses **`sign_in_with_apple`** → `SignInWithApple.getAppleIDCredential` → Firebase `OAuthProvider('apple.com').credential` → `signInWithCredential` → gets Firebase **idToken** → same `POST /api/v1/auth/google` (backend only verifies Firebase idToken; works for any provider). “Sign in with Apple” button is shown when `SignInWithApple.isAvailable()` is true (iOS/macOS). Fully integrated; no backend change required.

---

## Summary

- **Auth, availability, heartbeat, rides (REST + accept via socket), vehicles, earnings, payouts, ratings, chat, support** are integrated and aligned after the applied fixes.
- **Profile updates** use `fullName` and `phoneNumber` as required by the backend.
- **Earnings/rating** are normalized so the app can use `ridesCount` and `rating` from the existing APIs.
- **Ride dates** are parsed from both ISO strings and Firestore timestamp shape; **ride:offer** payload uses `distanceKm`/`etaSeconds` with app fallbacks.
- **Google Maps** works when `GOOGLE_MAPS_API_KEY` is set at build; **Google** and **Apple** sign-in are implemented and use the same backend auth flow.
- **Remaining:** Document upload (multipart vs JSON with URLs) and optional **scheduled rides count** from backend or from ride history.
