import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';

class Logo extends StatelessWidget {
  const Logo({super.key});

  @override
  Widget build(BuildContext context) {
    // Using text-based logo with custom styling to match "BLACKLIVERY" branding
    return Text(
      'BLACKLIVERY',
      style: GoogleFonts.bebasNeue(
        fontSize: 40,
        fontWeight: FontWeight.w400,
        color: AppColors.buttonBgPri,
        letterSpacing: 4,
      ),
    );
  }
}
