---
name: flutter-firebase-integration
description: >
  Blacklivery Firebase integration guide for Flutter. Use before writing any Firebase-related
  code: Firestore queries, Auth flows, Realtime Database, Cloud Functions calls, Storage uploads,
  FCM push notifications, or security rules. Also use when debugging Firebase errors, setting up
  a new Firebase feature, or writing any datasource class. Covers all collections, data models,
  security rules, and safe write patterns for the Blacklivery app.
---

# Blacklivery Firebase Integration

## CRITICAL: What Flutter Apps Actually Use

The Flutter apps (rider + driver) use Firebase for **three things only**:
1. **Firebase Auth** — sign in, get ID token, refresh token
2. **Firebase Storage** — upload driver documents / profile photos
3. **Firebase Messaging (FCM)** — receive push notifications

**The Flutter apps do NOT query Firestore directly.** All ride data, user profiles, wallet balances, and trip history are fetched via the **Node.js REST API** (backend at `backend/`). The backend uses Firebase Admin SDK to read/write Firestore.

**There are no Firebase Cloud Functions.** Payment verification and wallet credits are handled by the backend Express server (`backend/`) via Paystack/Stripe webhooks. The Node.js/Express backend is the permanent architecture — not a temporary setup.

**Driver real-time location** is currently broadcast via Socket.IO (`location_update` WebSocket event) and HTTP heartbeats (`POST /api/v1/driver/heartbeat`), not Firebase Realtime DB from Flutter. The RTDB patterns below describe the planned architecture for new datasource implementations.

---

## Project Setup
```bash
# Run once to configure
flutterfire configure --project=blacklivery-prod
# Generates: lib/firebase_options.dart
```

```dart
// main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await configureDependencies();
  runApp(const BlackliveryApp());
}
```

## Firestore Collection Structure
```
/users/{userId}
  name, email, phone, photoUrl, region (nigeria|chicago),
  walletBalance (int, kobo/cents), promoBalance (int),
  savedAddresses[], referralCode, createdAt, status

/drivers/{driverId}
  name, email, phone, photoUrl, region,
  vehicleClass, vehicleMake, vehicleModel, vehiclePlate, vehicleColor,
  walletBalance (int), pendingBalance (int), totalEarned (int),
  documentsStatus (pending|under_review|approved|rejected),
  documents: { license, vehicleReg, insurance, photos[] },
  rating (double), totalTrips, acceptanceRate, completionRate,
  isOnline (bool), lastLocation: {lat, lng, updatedAt},
  subscriptionActive (bool), createdAt, status

/trips/{tripId}
  riderId, driverId, region,
  status (requested|matched|enRoute|arrived|inProgress|completed|cancelled),
  vehicleClass, pickupAddress, dropoffAddress,
  pickupGeo: {lat, lng}, dropoffGeo: {lat, lng},
  fareBreakdown: { baseFare, distanceFare, timeFare, surgeMultiplier,
                   totalFare, platformCommission, driverEarnings },
  currency (NGN|USD),
  paymentMethod, paymentStatus, paymentRef,
  cancelledBy, cancellationFee, cancellationReason,
  waitTimeStarted, waitTimeMinutes,
  riderRating, driverRating, riderReview, driverReview,
  createdAt, startedAt, completedAt

/deliveries/{deliveryId}
  [same structure as trips + packageType, serviceType, isFragile, extraStops]

/driverLocations/{driverId}          ← Firebase Realtime DB (not Firestore)
  lat, lng, heading, updatedAt, isOnline, vehicleClass, region

/pricing/{region}                    ← region = "nigeria_lagos" | "nigeria_abuja" | "chicago"
  baseFares: {sedan, suv, xl},
  kmRates / mileRates: {sedan, suv, xl},
  minuteRates: {sedan, suv, xl},
  minimumFares: {sedan, suv, xl},
  surgeConfig: {active, multiplier, zones[]},
  cancellationFees: {sedan, suv, xl},
  noShowFees: {sedan, suv, xl},
  waitTimeFreeMinutes, waitTimeRatePerMin

/surgeZones/{zoneId}
  name, region, polygon: [{lat, lng}], active, multiplier, reason, expiresAt

/promotions/{promoId}
  code, discountType (percent|fixed), discountValue,
  maxUses, currentUses, expiresAt, active, region

/disputes/{disputeId}
  tripId, raisedBy (rider|driver), userId, reason,
  status (open|resolved|dismissed), resolution, resolvedBy, createdAt

/adminConfig
  maintenanceMode, minAppVersion, commissionRate, insuranceDeduction

/auditLog/{logId}
  action, performedBy, targetId, before, after, timestamp
```

## Datasource Pattern (calls backend REST API, not Firestore)

In the clean architecture target, datasources call the **backend REST API** using `ApiClient` (Dio). The backend then reads/writes Firestore via Firebase Admin SDK.

```dart
@injectable
class TripDatasource {
  final Dio _dio;
  TripDatasource(this._dio);

  Future<TripModel> createTrip(RideRequest request) async {
    final response = await _dio.post('/api/v1/rides', data: request.toJson());
    return TripModel.fromJson(response.data['data']);
  }

  Future<TripModel> getTrip(String tripId) async {
    final response = await _dio.get('/api/v1/rides/$tripId');
    return TripModel.fromJson(response.data['data']);
  }

  Future<List<TripModel>> getTripHistory({int page = 1}) async {
    final response = await _dio.get('/api/v1/rides/history',
        queryParameters: {'page': page, 'limit': 20});
    return (response.data['data'] as List)
        .map((e) => TripModel.fromJson(e))
        .toList();
  }

  // Real-time trip updates come via Socket.IO — see flutter-maps-tracking/SKILL.md
}
```

## Driver Location Broadcasting (Current: Socket.IO + HTTP)

Current driver app broadcasts location two ways simultaneously:

```dart
// Current implementation in driver app (ChangeNotifier style)
// 30-second periodic timer in driver_map_screen.dart
_heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
  final position = await Geolocator.getCurrentPosition();
  // 1. HTTP heartbeat
  await _dio.post('/api/v1/driver/heartbeat', data: {
    'lat': position.latitude,
    'lng': position.longitude,
    'heading': position.heading,
  });
  // 2. WebSocket broadcast
  _socketService.emitLocationUpdate(
    position.latitude, position.longitude,
    heading: position.heading,
  );
});
```

**Planned RTDB architecture** (for new clean-arch datasource):
```dart
@injectable
class LocationBroadcastDatasource {
  final FirebaseDatabase _rtdb;
  Timer? _timer;

  void startBroadcasting(String driverId) {
    _timer = Timer.periodic(const Duration(seconds: 4), (_) async {
      final position = await Geolocator.getCurrentPosition();
      await _rtdb.ref('driverLocations/$driverId').update({
        'lat': position.latitude,
        'lng': position.longitude,
        'heading': position.heading,
        'updatedAt': ServerValue.timestamp,
        'isOnline': true,
      });
    });
  }

  void stopBroadcasting(String driverId) {
    _timer?.cancel();
    _rtdb.ref('driverLocations/$driverId').update({'isOnline': false});
  }
}
```

## Wallet & Payment Writes — Backend Handles Transactions

The Flutter apps **never write to Firestore directly**. Wallet credits and payment confirmations are handled by the backend server via webhooks:
- Paystack webhook → `POST /webhooks/paystack` on backend
- Stripe webhook → `POST /webhooks/stripe` on backend
- Backend uses `runTransaction()` to atomically update trip + driver wallet

From Flutter, initiate payment via REST API:
```dart
// POST /api/v1/payments/initiate
final response = await _dio.post('/api/v1/payments/initiate', data: {
  'tripId': tripId,
  'amount': amountInKobo,
  'provider': 'paystack', // or 'stripe' for Chicago
});
final authorizationUrl = response.data['data']['authorizationUrl'];
// Launch authorizationUrl in WebView or browser
```

## FCM Push Notifications
```dart
@injectable
class NotificationService {
  Future<void> initialize() async {
    await FirebaseMessaging.instance.requestPermission();

    // Foreground messages
    FirebaseMessaging.onMessage.listen((message) {
      // Show local notification
    });

    // Background tap → navigate
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      final tripId = message.data['tripId'];
      if (tripId != null) router.push('/trip/$tripId');
    });
  }

  Future<String?> getToken() => FirebaseMessaging.instance.getToken();
}
```

## Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Riders: own data only
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Drivers: own data only
    match /drivers/{driverId} {
      allow read, write: if request.auth.uid == driverId;
    }

    // Trips: rider or assigned driver can read; only backend writes
    match /trips/{tripId} {
      allow read: if request.auth.uid == resource.data.riderId
                  || request.auth.uid == resource.data.driverId;
      allow write: if false; // Cloud Functions only
    }

    // Pricing: anyone authenticated can read, only admin writes
    match /pricing/{region} {
      allow read: if request.auth != null;
      allow write: if false; // Admin SDK only
    }

    // Admin: deny all client access
    match /adminConfig/{doc} {
      allow read, write: if false;
    }
  }
}
```

## Key Rules
1. Flutter apps use Firebase for Auth, Storage, and FCM **only**
2. All data reads/writes go through backend REST API (`/api/v1/...`)
3. Real-time updates (trip status, driver location) come via Socket.IO events
4. Realtime DB (planned) for driver locations — high-frequency, cheap writes
5. Never expose Firebase Admin SDK or Firestore secret keys to Flutter apps
6. Store timestamps as FieldValue.serverTimestamp() (RTDB) or ISO string (REST API)
7. Store all money as int (kobo/cents), never double
8. No Cloud Functions — backend Express server handles all server-side logic
