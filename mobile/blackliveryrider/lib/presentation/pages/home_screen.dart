import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../widgets/bottom_nav_bar.dart';
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
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: IndexedStack(index: _selectedNavIndex, children: _screens),
      bottomNavigationBar: BottomNavBar(
        selectedIndex: _selectedNavIndex,
        onTap: _onNavTap,
      ),
    );
  }
}
