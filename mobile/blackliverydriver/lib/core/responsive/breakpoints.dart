/// 2026-standard display breakpoints (dp) for constraint-based responsive layout.
///
/// **Always** read widths from a [LayoutBuilder]'s [BoxConstraints.maxWidth],
/// never from [MediaQuery.of(context).size], so the UI adapts correctly in
/// split-screen, foldable, and multi-window environments.
enum ScreenSize {
  /// < 600 dp — phone portrait or landscape.
  mobile,

  /// 600–1199 dp — tablet, foldable outer screen, split-screen pane.
  tablet,

  /// ≥ 1200 dp — desktop window, large tablet landscape, Chrome OS.
  desktop,
}

abstract final class Breakpoints {
  /// Minimum width (dp) of the tablet range.
  static const double tablet = 600.0;

  /// Minimum width (dp) of the desktop range.
  static const double desktop = 1200.0;

  /// Maps a layout-constraint width to the corresponding [ScreenSize].
  static ScreenSize fromWidth(double width) {
    if (width >= desktop) return ScreenSize.desktop;
    if (width >= tablet) return ScreenSize.tablet;
    return ScreenSize.mobile;
  }

  /// Recommended [GridView] cross-axis column count for [width].
  ///
  /// * Mobile  → 1 column
  /// * Tablet  → 2 columns
  /// * Desktop → [desktopColumns] (default 3)
  static int gridCrossAxisCount(double width, {int desktopColumns = 3}) {
    return switch (fromWidth(width)) {
      ScreenSize.mobile  => 1,
      ScreenSize.tablet  => 2,
      ScreenSize.desktop => desktopColumns,
    };
  }
}
