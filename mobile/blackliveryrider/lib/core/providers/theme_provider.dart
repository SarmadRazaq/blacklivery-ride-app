import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../theme/app_color_theme.dart';

class ThemeProvider extends ChangeNotifier {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  ThemeMode _themeMode = ThemeMode.dark; // Default to dark (brand design)

  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == ThemeMode.dark;

  ThemeProvider() {
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final theme = await _storage.read(key: 'themeMode');
    if (theme == 'light') {
      _themeMode = ThemeMode.light;
    } else {
      _themeMode = ThemeMode.dark;
    }
    notifyListeners();
  }

  Future<void> toggleTheme(bool isDark) async {
    _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
    await _storage.write(key: 'themeMode', value: isDark ? 'dark' : 'light');
    notifyListeners();
  }

  // ── Dark Theme ───────────────────────────────────────────────────────────
  ThemeData get darkTheme => ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        scaffoldBackgroundColor: AppColorTheme.dark.bgPri,
        primaryColor: AppColorTheme.dark.brand,
        colorScheme: ColorScheme.dark(
          primary: AppColorTheme.dark.brand,
          secondary: AppColorTheme.dark.brand,
          surface: AppColorTheme.dark.bgTertiary,
          onPrimary: Colors.black,
          onSecondary: Colors.black,
          onSurface: AppColorTheme.dark.txtPri,
          error: AppColorTheme.dark.error,
          onError: Colors.white,
        ),
        textTheme: _buildTextTheme(Brightness.dark),
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          titleTextStyle: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColorTheme.dark.txtPri,
          ),
          iconTheme: IconThemeData(color: AppColorTheme.dark.txtPri),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColorTheme.dark.brand,
            foregroundColor: Colors.black,
            minimumSize: const Size(double.infinity, 52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: GoogleFonts.poppins(
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColorTheme.dark.inputBg,
          hintStyle: TextStyle(color: AppColorTheme.dark.txtInactive),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppColorTheme.dark.inputBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppColorTheme.dark.inputBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppColorTheme.dark.inputFocusBorder, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppColorTheme.dark.error),
          ),
        ),
        dividerTheme: DividerThemeData(
          color: AppColorTheme.dark.divider,
          thickness: 1,
        ),
        chipTheme: ChipThemeData(
          backgroundColor: AppColorTheme.dark.inputBg,
          labelStyle: TextStyle(color: AppColorTheme.dark.txtSec),
          side: BorderSide(color: AppColorTheme.dark.inputBorder),
        ),
        extensions: const [AppColorTheme.dark],
      );

  // ── Light Theme ──────────────────────────────────────────────────────────
  ThemeData get lightTheme => ThemeData(
        brightness: Brightness.light,
        useMaterial3: true,
        scaffoldBackgroundColor: AppColorTheme.light.bgPri,
        primaryColor: AppColorTheme.light.brand,
        colorScheme: ColorScheme.light(
          primary: AppColorTheme.light.brand,
          secondary: AppColorTheme.light.brand,
          surface: AppColorTheme.light.bgTertiary,
          onPrimary: Colors.white,
          onSecondary: Colors.white,
          onSurface: AppColorTheme.light.txtPri,
          error: AppColorTheme.light.error,
          onError: Colors.white,
        ),
        textTheme: _buildTextTheme(Brightness.light),
        appBarTheme: AppBarTheme(
          backgroundColor: AppColorTheme.light.bgPri,
          elevation: 0,
          titleTextStyle: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColorTheme.light.txtPri,
          ),
          iconTheme: IconThemeData(color: AppColorTheme.light.txtPri),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColorTheme.light.brand,
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: GoogleFonts.poppins(
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColorTheme.light.inputBg,
          hintStyle: TextStyle(color: AppColorTheme.light.txtInactive),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppColorTheme.light.inputBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppColorTheme.light.inputBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppColorTheme.light.inputFocusBorder, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppColorTheme.light.error),
          ),
        ),
        dividerTheme: DividerThemeData(
          color: AppColorTheme.light.divider,
          thickness: 1,
        ),
        chipTheme: ChipThemeData(
          backgroundColor: AppColorTheme.light.inputBg,
          labelStyle: TextStyle(color: AppColorTheme.light.txtSec),
          side: BorderSide(color: AppColorTheme.light.inputBorder),
        ),
        extensions: const [AppColorTheme.light],
      );

  // ── Shared text theme ────────────────────────────────────────────────────
  TextTheme _buildTextTheme(Brightness brightness) {
    final base = brightness == Brightness.dark
        ? ThemeData.dark().textTheme
        : ThemeData.light().textTheme;
    return GoogleFonts.poppinsTextTheme(base);
  }
}
