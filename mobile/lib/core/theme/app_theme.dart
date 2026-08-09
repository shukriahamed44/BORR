/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * BORR Design System (`app_theme.dart`).
 * Defines the light, iOS-flavoured design tokens — brand palette, CreatoDisplay
 * typography scale, corner radii, soft elevation shadows and glass tints — and
 * assembles them into the application ThemeData with component-level overrides.
 *
 * IN SIMPLE WORDS:
 * The look of the whole app in one file — colours, fonts, rounded corners and
 * shadows. Change it here and every screen follows.
 */

import 'package:flutter/material.dart';

class AppTheme {
  // ─── Brand ────────────────────────────────────────────────────────────────
  static const Color primary = Color(0xFF2563EB); // BORR blue
  static const Color primaryLight = Color(0xFF3B82F6);
  static const Color primaryDark = Color(0xFF1D4ED8);

  // ─── Semantic ─────────────────────────────────────────────────────────────
  static const Color accent = Color(0xFF34C759); // iOS green
  static const Color danger = Color(0xFFFF3B30); // iOS red
  static const Color warning = Color(0xFFFF9F0A); // iOS orange

  // ─── Surfaces ─────────────────────────────────────────────────────────────
  static const Color bgDeep = Color(0xFFF2F5F9); // page background
  static const Color bgSurface = Color(0xFFFFFFFF); // cards, sheets
  static const Color bgElevated = Color(0xFFF7F9FC); // subtle raised fills
  static const Color bgInput = Color(0xFFF1F4F8); // field fills

  // ─── Text ─────────────────────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFF0B1524);
  static const Color textSecondary = Color(0xFF4B5768);
  static const Color textMuted = Color(0xFF8A94A6);

  // ─── Borders ──────────────────────────────────────────────────────────────
  static const Color borderSubtle = Color(0xFFE6EAF0);
  static const Color borderMedium = Color(0xFFD4DBE5);

  // ─── Glass ────────────────────────────────────────────────────────────────
  /// Translucent fills layered over blurred backdrops. Kept here so every glass
  /// surface in the app frosts by exactly the same amount.
  static const Color glassFill = Color(0x99FFFFFF);
  static const Color glassFillStrong = Color(0xCCFFFFFF);
  static const Color glassBorder = Color(0x66FFFFFF);
  static const double glassBlur = 24;

  // ─── Shape ────────────────────────────────────────────────────────────────
  static const double radiusSm = 12;
  static const double radiusMd = 18;
  static const double radiusLg = 24;
  static const double radiusPill = 999;

  /// The single soft shadow that separates a white card from the page behind it.
  static const List<BoxShadow> shadowSoft = [
    BoxShadow(color: Color(0x0A0B1524), blurRadius: 18, offset: Offset(0, 6)),
    BoxShadow(color: Color(0x05000000), blurRadius: 2, offset: Offset(0, 1)),
  ];

  static const List<BoxShadow> shadowLifted = [
    BoxShadow(color: Color(0x140B1524), blurRadius: 32, offset: Offset(0, 12)),
  ];

  /// Brand-tinted glow used under the primary call to action.
  static const List<BoxShadow> shadowPrimary = [
    BoxShadow(color: Color(0x402563EB), blurRadius: 20, offset: Offset(0, 8)),
  ];

  static const String fontFamily = 'CreatoDisplay';

  /// Single source of truth for reservation status colours (customer + staff screens).
  static Color statusColor(String status) {
    switch (status) {
      case 'APPROVED':
        return accent;
      case 'ACTIVE':
        return primary;
      case 'RETURNED':
        return textMuted;
      case 'REJECTED':
      case 'CANCELLED':
        return danger;
      default: // PENDING
        return warning;
    }
  }

  static ThemeData get lightTheme {
    const textTheme = TextTheme(
      displayLarge: TextStyle(
          fontSize: 34, height: 1.15, fontWeight: FontWeight.w700, color: textPrimary, letterSpacing: -0.6),
      displayMedium: TextStyle(
          fontSize: 28, height: 1.2, fontWeight: FontWeight.w700, color: textPrimary, letterSpacing: -0.4),
      headlineLarge: TextStyle(
          fontSize: 24, height: 1.25, fontWeight: FontWeight.w700, color: textPrimary, letterSpacing: -0.3),
      headlineMedium: TextStyle(
          fontSize: 20, height: 1.3, fontWeight: FontWeight.w700, color: textPrimary, letterSpacing: -0.2),
      headlineSmall: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: textPrimary),
      titleLarge: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: textPrimary),
      titleMedium: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: textPrimary),
      titleSmall: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: textSecondary),
      bodyLarge: TextStyle(fontSize: 15, height: 1.45, color: textPrimary),
      bodyMedium: TextStyle(fontSize: 14, height: 1.45, color: textSecondary),
      bodySmall: TextStyle(fontSize: 12, height: 1.4, color: textMuted),
      labelLarge: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: textPrimary),
      labelMedium: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: textSecondary),
      labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: textMuted),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      fontFamily: fontFamily,
      scaffoldBackgroundColor: bgDeep,
      splashFactory: InkSparkle.splashFactory,
      colorScheme: const ColorScheme.light(
        primary: primary,
        secondary: accent,
        surface: bgSurface,
        surfaceContainerHighest: bgInput,
        error: danger,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: textPrimary,
        onSurfaceVariant: textSecondary,
        outline: borderMedium,
        outlineVariant: borderSubtle,
        onError: Colors.white,
      ),
      textTheme: textTheme,

      // ─── AppBar — iOS: centred title, hairline separation on scroll ───────
      appBarTheme: const AppBarTheme(
        backgroundColor: bgDeep,
        surfaceTintColor: Colors.transparent,
        foregroundColor: textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: textPrimary,
          letterSpacing: -0.2,
        ),
        iconTheme: IconThemeData(color: textPrimary, size: 22),
      ),

      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.transparent,
        selectedItemColor: primary,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        showUnselectedLabels: true,
        selectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w500),
      ),

      cardTheme: CardThemeData(
        color: bgSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
        margin: EdgeInsets.zero,
      ),

      // ─── Inputs — filled, borderless until focused ────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bgInput,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        hintStyle: const TextStyle(color: textMuted, fontSize: 15),
        labelStyle: const TextStyle(color: textSecondary, fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSm),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSm),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSm),
          borderSide: const BorderSide(color: primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSm),
          borderSide: const BorderSide(color: danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSm),
          borderSide: const BorderSide(color: danger, width: 1.6),
        ),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: borderMedium,
          disabledForegroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusSm)),
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontWeight: FontWeight.w700,
            fontSize: 15,
            letterSpacing: -0.1,
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          backgroundColor: Colors.white,
          side: const BorderSide(color: borderMedium),
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusSm)),
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontWeight: FontWeight.w700,
            fontSize: 15,
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontWeight: FontWeight.w700,
            fontSize: 15,
          ),
        ),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: Colors.white,
        selectedColor: primary,
        checkmarkColor: Colors.white,
        showCheckmark: false,
        labelStyle: const TextStyle(
          fontFamily: fontFamily,
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: textSecondary,
        ),
        secondaryLabelStyle: const TextStyle(
          fontFamily: fontFamily,
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
        side: const BorderSide(color: borderSubtle),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      ),

      dividerTheme: const DividerThemeData(color: borderSubtle, thickness: 1, space: 1),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusSm)),
        contentTextStyle: const TextStyle(
          fontFamily: fontFamily,
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: Colors.white,
        ),
      ),

      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: bgSurface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(radiusLg)),
        ),
      ),

      progressIndicatorTheme: const ProgressIndicatorThemeData(color: primary),
    );
  }
}
