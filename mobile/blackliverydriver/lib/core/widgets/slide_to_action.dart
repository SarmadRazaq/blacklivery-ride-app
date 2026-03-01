import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_theme.dart';

class SlideToAction extends StatefulWidget {
  final Future<void> Function() onSlide;
  final String text;
  final Color outerColor;
  final Color innerColor;
  final double height;
  final double sliderButtonIconSize;
  final IconData? sliderButtonIcon;
  final Color? textColor;

  const SlideToAction({
    super.key,
    required this.onSlide,
    required this.text,
    this.outerColor = AppColors.cardBackground,
    this.innerColor = AppColors.white,
    this.height = 56,
    this.sliderButtonIconSize = 24,
    this.sliderButtonIcon = Icons.chevron_right,
    this.textColor,
  });

  @override
  State<SlideToAction> createState() => _SlideToActionState();
}

class _SlideToActionState extends State<SlideToAction> {
  double _position = 0;
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth;
        final maxDrag = maxWidth - widget.height;

        return Container(
          height: widget.height,
          decoration: BoxDecoration(
            color: widget.outerColor,
            borderRadius: BorderRadius.circular(widget.height / 2),
          ),
          child: Stack(
            children: [
              // Text
              Center(
                child: Text(
                  widget.text,
                  style: TextStyle(
                    color:
                        widget.textColor ??
                        AppColors.white.withValues(alpha: 0.7),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),

              // Slider
              Positioned(
                left: _position,
                top: 0,
                bottom: 0,
                child: GestureDetector(
                  onHorizontalDragUpdate: (details) {
                    if (_isLoading) return;
                    setState(() {
                      _position += details.delta.dx;
                      if (_position < 0) _position = 0;
                      if (_position > maxDrag) _position = maxDrag;
                    });
                  },
                  onHorizontalDragEnd: (details) async {
                    if (_isLoading) return;
                    if (_position >= maxDrag * 0.8) {
                      // Slided enough
                      HapticFeedback.heavyImpact();
                      setState(() {
                        _position = maxDrag;
                        _isLoading = true;
                      });

                      try {
                        await widget.onSlide();
                      } finally {
                        if (mounted) {
                          setState(() {
                            _isLoading = false;
                            _position = 0; // Reset
                          });
                        }
                      }
                    } else {
                      // Reset
                      setState(() {
                        _position = 0;
                      });
                    }
                  },
                  child: Container(
                    width: widget.height,
                    height: widget.height,
                    decoration: BoxDecoration(
                      color: widget.innerColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.2),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: _isLoading
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.primary,
                            ),
                          )
                        : Icon(
                            widget.sliderButtonIcon,
                            color: AppColors.primary,
                            size: widget.sliderButtonIconSize,
                          ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    )); // RepaintBoundary
  }
}
