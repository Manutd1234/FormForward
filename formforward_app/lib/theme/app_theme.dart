import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // FormForward brand colors (matches reference design)
  static const Color bg = Color(0xFFEAF5EF); // Soft green tinted background
  static const Color surface = Color(0xFFFFFFFF);
  static const Color card = Color(0xFFFFFFFF);
  static const Color accent = Color(0xFF67B059); // Vibrant Green
  static const Color accentDark = Color(0xFF45853B);
  static const Color muted = Color(0xFF9CAAA1);
  static const Color text = Color(0xFF263238);
  static const Color textSecondary = Color(0xFF607D8B);
  static const Color line = Color(0xFFE8F0EA);
  static const Color red = Color(0xFFFC856E); // Coral/Orange
  static const Color amber = Color(0xFFFCD36E); // Yellow
  static const Color green = Color(0xFF67B059); // Same as accent
  static const Color blue = Color(0xFF5CB7ED);

  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: bg,
      colorScheme: const ColorScheme.light(
        surface: surface,
        primary: accent,
        secondary: blue,
        error: red,
        onSurface: text,
        onPrimary: Colors.white,
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme).apply(
        bodyColor: text,
        displayColor: text,
      ),
      cardTheme: CardThemeData(
        color: card,
        elevation: 12,
        shadowColor: const Color(0x11000000), // Soft shadow
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24), // Highly rounded like the design
          side: BorderSide.none,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: text),
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: text,
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: accent,
        unselectedItemColor: muted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accent,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)), // Pill shaped buttons
          textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: text,
          side: const BorderSide(color: line, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
          textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: accent, width: 2),
        ),
        hintStyle: const TextStyle(color: muted, fontSize: 14),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
    );
  }
}
