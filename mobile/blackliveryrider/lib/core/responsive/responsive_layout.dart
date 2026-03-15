import 'package:flutter/material.dart';
import 'breakpoints.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Destination descriptor
// ─────────────────────────────────────────────────────────────────────────────

/// A navigation entry used by [ResponsiveLayout].
///
/// Supply a list of these to [ResponsiveLayout.destinations].
/// [ResponsiveLayout] renders them as a bottom [NavigationBar] on
/// mobile/tablet and as an extended [NavigationRail] on desktop.
class ResponsiveDestination {
  const ResponsiveDestination({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
}

// ─────────────────────────────────────────────────────────────────────────────
// ResponsiveLayout
// ─────────────────────────────────────────────────────────────────────────────

/// A shell widget that adapts navigation chrome based on parent [LayoutBuilder]
/// constraints — not [MediaQuery] — so it correctly handles split-screen,
/// foldables, and multi-window environments.
///
/// * **Mobile / Tablet** (< 1200 dp) → [Scaffold] with a bottom
///   [NavigationBar].
/// * **Desktop** (≥ 1200 dp) → [Scaffold] body with an extended
///   [NavigationRail] (200 dp) on the left and page content on the right.
///
/// ### Basic usage
/// ```dart
/// ResponsiveLayout(
///   selectedIndex: _index,
///   onDestinationSelected: (i) => setState(() => _index = i),
///   backgroundColor: AppColors.bgPri,
///   destinations: const [
///     ResponsiveDestination(
///       icon: Icons.home_outlined,
///       selectedIcon: Icons.home,
///       label: 'Home',
///     ),
///   ],
///   body: IndexedStack(index: _index, children: _pages),
/// )
/// ```
class ResponsiveLayout extends StatelessWidget {
  const ResponsiveLayout({
    super.key,
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.destinations,
    required this.body,
    this.backgroundColor,
    this.appBar,
    this.floatingActionButton,
    this.drawer,
    this.scaffoldKey,
    this.selectedNavColor = Colors.white,
    this.unselectedNavColor = const Color(0xFF7C7C7C),
    this.navIndicatorColor = const Color(0x26D2BF9F),
  });

  /// Index of the currently selected destination.
  final int selectedIndex;

  /// Fired when the user taps a nav item.
  final ValueChanged<int> onDestinationSelected;

  /// Navigation items shown in the bottom bar or rail.
  final List<ResponsiveDestination> destinations;

  /// The current page content.
  /// Wrap in [IndexedStack] to preserve state across tab switches.
  final Widget body;

  /// Scaffold background color. Defaults to [ThemeData.scaffoldBackgroundColor].
  final Color? backgroundColor;

  final PreferredSizeWidget? appBar;
  final Widget? floatingActionButton;
  final Widget? drawer;
  final GlobalKey<ScaffoldState>? scaffoldKey;

  /// Icon / label color for the *selected* destination.
  final Color selectedNavColor;

  /// Icon / label color for *unselected* destinations.
  final Color unselectedNavColor;

  /// Background tint of the active-destination indicator pill.
  final Color navIndicatorColor;

  @override
  Widget build(BuildContext context) {
    // LayoutBuilder gives constraints from the parent widget — correct for
    // split-screen and multi-window, unlike MediaQuery.of(context).size.
    return LayoutBuilder(
      builder: (context, constraints) {
        final screenSize = Breakpoints.fromWidth(constraints.maxWidth);
        return switch (screenSize) {
          ScreenSize.desktop                     => _DesktopShell(layout: this),
          ScreenSize.tablet || ScreenSize.mobile => _MobileTabletShell(layout: this),
        };
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile / Tablet — BottomNavigationBar (NavigationBar M3)
// ─────────────────────────────────────────────────────────────────────────────

class _MobileTabletShell extends StatelessWidget {
  const _MobileTabletShell({required this.layout});

  final ResponsiveLayout layout;

  @override
  Widget build(BuildContext context) {
    final bg = layout.backgroundColor ?? Theme.of(context).scaffoldBackgroundColor;
    return Scaffold(
      key: layout.scaffoldKey,
      appBar: layout.appBar,
      backgroundColor: bg,
      drawer: layout.drawer,
      floatingActionButton: layout.floatingActionButton,
      body: layout.body,
      bottomNavigationBar: _ResponsiveBottomBar(
        layout: layout,
        backgroundColor: bg,
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop — Extended NavigationRail sidebar
// ─────────────────────────────────────────────────────────────────────────────

class _DesktopShell extends StatelessWidget {
  const _DesktopShell({required this.layout});

  final ResponsiveLayout layout;

  @override
  Widget build(BuildContext context) {
    final bg = layout.backgroundColor ?? Theme.of(context).scaffoldBackgroundColor;
    return Scaffold(
      key: layout.scaffoldKey,
      appBar: layout.appBar,
      backgroundColor: bg,
      floatingActionButton: layout.floatingActionButton,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ResponsiveRail(layout: layout, backgroundColor: bg),
          VerticalDivider(
            width: 1,
            thickness: 1,
            color: Colors.white.withValues(alpha: 0.06),
          ),
          // Expanded prevents the body from overflowing the rail.
          Expanded(child: layout.body),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom NavigationBar — mobile / tablet
// ─────────────────────────────────────────────────────────────────────────────

class _ResponsiveBottomBar extends StatelessWidget {
  const _ResponsiveBottomBar({
    required this.layout,
    required this.backgroundColor,
  });

  final ResponsiveLayout layout;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    // Override NavigationBarTheme inline so we don't pollute the global theme.
    return Theme(
      data: Theme.of(context).copyWith(
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: backgroundColor,
          surfaceTintColor: Colors.transparent,
          shadowColor: Colors.transparent,
          indicatorColor: layout.navIndicatorColor,
          labelTextStyle: WidgetStateProperty.resolveWith<TextStyle?>((states) {
            final selected = states.contains(WidgetState.selected);
            return TextStyle(
              fontSize: 10,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              color: selected
                  ? layout.selectedNavColor
                  : layout.unselectedNavColor,
            );
          }),
          iconTheme: WidgetStateProperty.resolveWith<IconThemeData?>((states) {
            return IconThemeData(
              color: states.contains(WidgetState.selected)
                  ? layout.selectedNavColor
                  : layout.unselectedNavColor,
            );
          }),
        ),
      ),
      child: NavigationBar(
        selectedIndex: layout.selectedIndex,
        onDestinationSelected: layout.onDestinationSelected,
        backgroundColor: backgroundColor,
        destinations: layout.destinations
            .map((d) => NavigationDestination(
                  icon: Icon(d.icon),
                  selectedIcon: Icon(d.selectedIcon),
                  label: d.label,
                ))
            .toList(),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extended NavigationRail — desktop
// ─────────────────────────────────────────────────────────────────────────────

class _ResponsiveRail extends StatelessWidget {
  const _ResponsiveRail({
    required this.layout,
    required this.backgroundColor,
  });

  final ResponsiveLayout layout;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return NavigationRail(
      selectedIndex: layout.selectedIndex,
      onDestinationSelected: layout.onDestinationSelected,
      extended: true,
      minExtendedWidth: 200,
      backgroundColor: backgroundColor,
      useIndicator: true,
      indicatorColor: layout.navIndicatorColor,
      selectedIconTheme: IconThemeData(color: layout.selectedNavColor),
      unselectedIconTheme: IconThemeData(color: layout.unselectedNavColor),
      selectedLabelTextStyle: TextStyle(
        color: layout.selectedNavColor,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
      unselectedLabelTextStyle: TextStyle(
        color: layout.unselectedNavColor,
        fontSize: 12,
      ),
      destinations: layout.destinations
          .map((d) => NavigationRailDestination(
                icon: Icon(d.icon),
                selectedIcon: Icon(d.selectedIcon),
                label: Text(d.label),
              ))
          .toList(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ResponsiveTileGrid — adaptive GridView.builder helper
// ─────────────────────────────────────────────────────────────────────────────

/// An adaptive [GridView.builder] that derives [crossAxisCount] from
/// [LayoutBuilder] constraints at runtime.
///
/// Automatically adjusts column count when the parent width changes (e.g.,
/// split-screen, orientation change, window resize):
/// * Mobile  (< 600 dp)  → 1 column
/// * Tablet  (600–1199)  → 2 columns
/// * Desktop (≥ 1200 dp) → [desktopColumns] (default 3)
///
/// Wrap tile content in [Flexible] or [Expanded] inside row-children to
/// prevent overflow, as demonstrated below.
///
/// ### Sample — adaptive ride-card grid
/// ```dart
/// ResponsiveTileGrid(
///   itemCount: rides.length,
///   desktopColumns: 3,
///   childAspectRatio: 2.5,
///   padding: const EdgeInsets.all(16),
///   itemBuilder: (context, i) => _RideCard(ride: rides[i]),
/// )
/// ```
class ResponsiveTileGrid extends StatelessWidget {
  const ResponsiveTileGrid({
    super.key,
    required this.itemCount,
    required this.itemBuilder,
    this.desktopColumns = 3,
    this.childAspectRatio = 1.8,
    this.mainAxisSpacing = 12.0,
    this.crossAxisSpacing = 12.0,
    this.padding,
    this.shrinkWrap = false,
    this.physics,
  });

  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;

  /// Number of columns when the available width is ≥ 1200 dp. Default 3.
  final int desktopColumns;

  /// Ratio of cross-axis to main-axis extent per tile.
  final double childAspectRatio;

  final double mainAxisSpacing;
  final double crossAxisSpacing;
  final EdgeInsetsGeometry? padding;
  final bool shrinkWrap;
  final ScrollPhysics? physics;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = Breakpoints.gridCrossAxisCount(
          constraints.maxWidth,
          desktopColumns: desktopColumns,
        );
        return GridView.builder(
          shrinkWrap: shrinkWrap,
          physics: physics,
          padding: padding,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            childAspectRatio: childAspectRatio,
            mainAxisSpacing: mainAxisSpacing,
            crossAxisSpacing: crossAxisSpacing,
          ),
          itemCount: itemCount,
          itemBuilder: itemBuilder,
        );
      },
    );
  }
}
