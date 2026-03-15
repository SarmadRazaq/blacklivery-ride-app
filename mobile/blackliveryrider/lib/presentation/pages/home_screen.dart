import 'package:flutter/material.dart';
import '../../core/responsive/responsive_layout.dart';
import '../../core/theme/app_colors.dart';
import 'home_tab.dart';
import 'my_rides_screen.dart';
import 'ticket_screen.dart';
import 'wallet_screen.dart';
import 'account_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedNavIndex = 0;

  final List<Widget> _screens = [
    const HomeTab(),
    const MyRidesScreen(),
    const TicketScreen(),
    const WalletScreen(),
    const AccountScreen(),
  ];

  void _onNavTap(int index) {
    setState(() {
      _selectedNavIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      selectedIndex: _selectedNavIndex,
      onDestinationSelected: _onNavTap,
      backgroundColor: AppColors.bgPri,
      // Destinations mirror the previous BottomNavBar items exactly.
      destinations: const [
        ResponsiveDestination(
          icon: Icons.home_outlined,
          selectedIcon: Icons.home,
          label: 'Home',
        ),
        ResponsiveDestination(
          icon: Icons.access_time_outlined,
          selectedIcon: Icons.access_time_filled,
          label: 'Rides',
        ),
        ResponsiveDestination(
          icon: Icons.confirmation_number_outlined,
          selectedIcon: Icons.confirmation_number,
          label: 'Ticket',
        ),
        ResponsiveDestination(
          icon: Icons.account_balance_wallet_outlined,
          selectedIcon: Icons.account_balance_wallet,
          label: 'Wallet',
        ),
        ResponsiveDestination(
          icon: Icons.person_outline,
          selectedIcon: Icons.person,
          label: 'Account',
        ),
      ],
      // IndexedStack preserves each tab's state and scroll position.
      body: IndexedStack(index: _selectedNavIndex, children: _screens),
    );
  }
}
