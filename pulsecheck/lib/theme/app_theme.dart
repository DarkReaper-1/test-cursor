import 'package:flutter/material.dart';

/// High-contrast, large-touch-target theme aimed at readability for every
/// age group (including older users and low-vision users). Respects the
/// system text-scale factor instead of fighting it, and never dips below
/// WCAG AA contrast for body text.
class AppTheme {
  AppTheme._();

  static const Color primary = Color(0xFF0E7C66); // calm teal, not "alarm red"
  static const Color danger = Color(0xFFB3261E);
  static const Color warning = Color(0xFFB8860B);
  static const Color background = Color(0xFFFAFAF8);
  static const Color surface = Colors.white;
  static const Color textPrimary = Color(0xFF1A1A1A);

  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: background,
      fontFamily: 'Roboto',
    );

    return base.copyWith(
      textTheme: base.textTheme.apply(
        bodyColor: textPrimary,
        displayColor: textPrimary,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(double.infinity, 64),
          textStyle: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: true,
      ),
    );
  }

  static ThemeData dark() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        brightness: Brightness.dark,
      ),
      fontFamily: 'Roboto',
    );
    return base.copyWith(
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(double.infinity, 64),
          textStyle: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      appBarTheme: const AppBarTheme(elevation: 0, centerTitle: true),
    );
  }
}
