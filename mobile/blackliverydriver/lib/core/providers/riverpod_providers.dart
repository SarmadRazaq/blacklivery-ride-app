import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/providers/driver_provider.dart';
import '../../features/ride/providers/ride_provider.dart';
import '../../features/history/providers/ride_history_provider.dart';
import '../../features/chat/providers/chat_provider.dart';
import '../../features/earnings/providers/earnings_provider.dart';
import '../../features/home/providers/driver_preferences_provider.dart';
import 'region_provider.dart';
import '../utils/currency_utils.dart';

final authRiverpodProvider = ChangeNotifierProvider<AuthProvider>((ref) {
  return AuthProvider();
});

final driverRiverpodProvider = ChangeNotifierProvider<DriverProvider>((ref) {
  return DriverProvider();
});

final rideRiverpodProvider = ChangeNotifierProvider<RideProvider>((ref) {
  final rp = RideProvider();
  rp.onRideCompleted = () {
    ref.read(earningsRiverpodProvider).fetchDashboard();
  };
  return rp;
});

final rideHistoryRiverpodProvider = ChangeNotifierProvider<RideHistoryProvider>((ref) {
  return RideHistoryProvider();
});

final chatRiverpodProvider = ChangeNotifierProvider<ChatProvider>((ref) {
  return ChatProvider();
});

final earningsRiverpodProvider = ChangeNotifierProvider<EarningsProvider>((ref) {
  return EarningsProvider();
});

final driverPreferencesRiverpodProvider = ChangeNotifierProvider<DriverPreferencesProvider>((ref) {
  final dp = DriverPreferencesProvider();
  dp.loadPreferences();
  return dp;
});

final regionRiverpodProvider = ChangeNotifierProvider<RegionProvider>((ref) {
  final rp = RegionProvider();
  rp.addListener(() {
    CurrencyUtils.activeCurrency = rp.currency;
  });
  return rp;
});
