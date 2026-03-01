---
name: flutter-clean-architecture
description: >
  Blacklivery Flutter architecture guide. Use this skill before writing ANY Flutter code
  for the Blacklivery app — rider, driver, or admin. Covers folder structure, BLoC state
  management, GoRouter navigation, GetIt DI, freezed models, and coding conventions.
  Trigger for any task involving: creating a new feature, adding a screen, writing a BLoC,
  setting up navigation, creating a repository, or any general Flutter coding task.
---

# Blacklivery Flutter Architecture

## CURRENT STATE vs TARGET ARCHITECTURE

**Current code** (what exists in `mobile/`) uses **Provider (ChangeNotifier)** — no BLoC, no GetIt, no GoRouter, no freezed, no dartz. The apps call the backend REST API directly from services; there is no repository or datasource layer yet.

**This skill describes the TARGET architecture** for all new feature development. When adding new screens or features, follow the BLoC patterns below — do not add more ChangeNotifier providers. Legacy Provider code will be migrated gradually.

**App paths:**
- Rider: `mobile/rider/blacklivery/blackliveryrider/`
- Driver: `mobile/rider/blackliverydriver/driver/`

---

## State Management: flutter_bloc (BLoC Pattern)
Every new feature uses Bloc, Event, and State — never Cubit, never setState (except truly isolated UI).

```dart
// CORRECT — logic in BLoC
class BookingBloc extends Bloc<BookingEvent, BookingState> {
  final RequestRideUseCase _requestRide;
  BookingBloc(this._requestRide) : super(BookingInitial()) {
    on<RideRequested>(_onRideRequested);
  }
}

// WRONG — never put logic in widget
onPressed: () async {
  final result = await FirebaseFirestore.instance.collection('trips').add(...)
}
```

## Folder Structure (per feature)
```
lib/
├── core/
│   ├── constants/        # AppRoutes, AppStrings, AppEnums
│   ├── errors/           # Failure, AppException classes
│   ├── utils/            # CurrencyFormatter, DateFormatter, Validators
│   ├── theme/            # AppColors, AppTextStyles, AppSpacing
│   └── di/               # injection.dart (GetIt setup)
├── features/
│   └── [feature_name]/
│       ├── data/
│       │   ├── models/           # JSON + Firestore models (freezed + json_serializable)
│       │   ├── datasources/      # ONLY place Firebase/API calls live
│       │   └── repositories/     # Implements domain abstract class
│       ├── domain/
│       │   ├── entities/         # Pure Dart classes, zero dependencies
│       │   ├── repositories/     # Abstract interfaces
│       │   └── usecases/         # One use case per file, single call() method
│       └── presentation/
│           ├── bloc/             # feature_bloc.dart, feature_event.dart, feature_state.dart
│           ├── screens/          # Full screen widgets, only call BLoC
│           └── widgets/          # Dumb, reusable, no BLoC access
├── shared/
│   ├── widgets/                  # AppButton, AppTextField, LoadingOverlay, etc.
│   └── services/                 # FCM, LocationService, AnalyticsService
└── main.dart
```

## Features List (Blacklivery)
- auth, home, booking, tracking, payments, wallet, trips, delivery, profile, notifications, support

## Navigation: GoRouter
```dart
// core/constants/app_routes.dart
final router = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
    GoRoute(
      path: '/booking',
      builder: (_, state) => BookingScreen(
        destination: state.extra as PlaceEntity,
      ),
    ),
    GoRoute(path: '/trip/:tripId', builder: (_, state) =>
      TripScreen(tripId: state.pathParameters['tripId']!)),
  ],
);
```

## Dependency Injection: GetIt + injectable
```dart
// core/di/injection.dart
@InjectableInit()
Future<void> configureDependencies() async => getIt.init();

// Usage in BLoC
@injectable
class BookingBloc extends Bloc<BookingEvent, BookingState> {
  BookingBloc(@injectable RequestRideUseCase requestRide) ...
}
```

## Freezed Models (always use for State + Entities)
```dart
// domain/entities/trip_entity.dart
@freezed
class TripEntity with _$TripEntity {
  const factory TripEntity({
    required String id,
    required String riderId,
    required String driverId,
    required TripStatus status,
    required double fare,
    required Region region,
  }) = _TripEntity;
}

// presentation/bloc/booking_state.dart
@freezed
class BookingState with _$BookingState {
  const factory BookingState.initial() = BookingInitial;
  const factory BookingState.loading() = BookingLoading;
  const factory BookingState.driverFound(DriverEntity driver) = BookingDriverFound;
  const factory BookingState.failed(String message) = BookingFailed;
}
```

## Error Handling: dartz Either
```dart
// domain/repositories/trip_repository.dart (abstract)
abstract class TripRepository {
  Future<Either<Failure, TripEntity>> requestRide(RideRequest request);
}

// data/repositories/trip_repository_impl.dart
@Injectable(as: TripRepository)
class TripRepositoryImpl implements TripRepository {
  @override
  Future<Either<Failure, TripEntity>> requestRide(RideRequest request) async {
    try {
      final result = await _datasource.createTrip(request);
      return Right(result.toEntity());
    } on FirebaseException catch (e) {
      return Left(ServerFailure(e.message ?? 'Firebase error'));
    }
  }
}
```

## UI Error Display
```dart
// Always show user-friendly messages, never raw exceptions
BlocListener<BookingBloc, BookingState>(
  listener: (context, state) {
    state.whenOrNull(
      failed: (msg) => ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg))),
    );
  },
)
```

## Naming Conventions
| Type | Convention | Example |
|------|-----------|---------|
| BLoC | feature_bloc.dart | booking_bloc.dart |
| Event | feature_event.dart | booking_event.dart |
| State | feature_state.dart | booking_state.dart |
| Screen | feature_screen.dart | booking_screen.dart |
| Widget | descriptive_widget.dart | driver_card_widget.dart |
| Repository (abstract) | feature_repository.dart | trip_repository.dart |
| Repository (impl) | feature_repository_impl.dart | trip_repository_impl.dart |
| UseCase | verb_noun_usecase.dart | request_ride_usecase.dart |

## Datasource → Backend REST API (NOT Firebase directly)

The Flutter apps do **not** query Firebase/Firestore directly. All data access goes through the **Node.js backend** (`backend/`) via REST API. Datasources call `ApiClient` (Dio):

```dart
@injectable
class TripDatasource {
  final Dio _dio;
  TripDatasource(this._dio);

  Future<TripModel> createTrip(RideRequest request) async {
    final response = await _dio.post('/api/v1/rides', data: request.toJson());
    return TripModel.fromJson(response.data['data']);
  }

  Stream<TripModel> watchTrip(String tripId) {
    // Real-time trip updates come via Socket.IO, not Firestore streams
    // See flutter-maps-tracking/SKILL.md for socket event patterns
    throw UnimplementedError('Use SocketService for real-time trip updates');
  }
}
```

The base URL and auth token are managed by `ApiClient` (singleton with Dio interceptors). Firebase ID token is auto-attached to every request.

## Region Enum (use everywhere)
```dart
enum Region { nigeria, chicago }
enum VehicleClass { sedan, suv, xl, businessSedan, businessSuv, firstClass }
enum TripStatus { requested, matched, enRoute, arrived, inProgress, completed, cancelled }
```

## Key Rules
1. Widgets NEVER import Firebase or any data layer packages
2. All money stored as int (kobo for NGN, cents for USD) — never double
3. Use const constructors everywhere possible
4. Dispose all streams, controllers, timers in dispose()
5. All async operations have loading + error + success states
6. Never use ! (bang) operator without explicit null check above it
7. Use StreamBuilder/BlocBuilder for reactive data — no polling
