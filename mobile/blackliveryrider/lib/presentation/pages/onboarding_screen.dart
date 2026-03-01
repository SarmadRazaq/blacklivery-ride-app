import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/assets.dart';
import 'signup_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  static const Color _backgroundColor = Color(0xFF000000);
  static const Color _headingColor = Colors.white;
  static const Color _subheadingColor = Color(0xFF7F7F7F);

  final List<_OnboardingItem> _items = const [
    _OnboardingItem(
      title: 'Welcome to\nBLACKLIVERY',
      subtitle: 'Your seamless ride-hailing experience starts here.',
      imagePath: AppAssets.screen1Car,
    ),
    _OnboardingItem(
      title: 'Flexible ride\noptions to\nsuit your\nneeds',
      subtitle:
          'Pay with cash, credit/debit cards, or use your in-app wallet for a fast checkout.',
      imagePath: AppAssets.screen2Car,
    ),
    _OnboardingItem(
      title: 'Track Rides\nin Real-Time',
      subtitle: 'Stay updated with live location tracking from pickup to drop-off.',
      imagePath: AppAssets.screen3Car,
    ),
    _OnboardingItem(
      title: 'Safety Is\nOur Priority',
      subtitle:
          'In-app emergency button for quick support from local authorities or BlackLivery emergency team.',
      imagePath: AppAssets.screen4Car,
    ),
    _OnboardingItem(
      title: 'Book Rides\nwith Ease',
      subtitle: 'Request premium rides in seconds and get moving effortlessly.',
      imagePath: AppAssets.screen5Car,
    ),
  ];

  final List<String> _progressAssets = const [
    AppAssets.progressNav1,
    AppAssets.progressNav2,
    AppAssets.progressNav3,
    AppAssets.progressNav4,
    AppAssets.progressNav5,
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _items.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const SignUpScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _backgroundColor,
      body: PageView(
        controller: _pageController,
        physics: const BouncingScrollPhysics(),
        onPageChanged: (index) {
          setState(() {
            _currentPage = index;
          });
        },
        children: _items
            .asMap()
            .entries
            .map((entry) => _buildPage(
              pageIndex: entry.key,
                  title: entry.value.title,
                  subtitle: entry.value.subtitle,
                  imagePath: entry.value.imagePath,
                  buttonText:
                      entry.key == _items.length - 1 ? 'Get Started' : 'Continue',
                ))
            .toList(),
      ),
    );
  }

  Widget _buildPage({
    required int pageIndex,
    required String title,
    required String subtitle,
    required String imagePath,
    required String buttonText,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: SafeArea(
            bottom: false,
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Stack(
                  children: [
                    if (pageIndex == 0)
                      const Positioned(
                        left: -146,
                        top: 383,
                        child: Opacity(
                          opacity: 1,
                          child: SizedBox(
                            width: 508,
                            height: 309,
                            child: _FirstScreenCarImage(),
                          ),
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(28, 44, 28, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            textAlign: TextAlign.left,
                            style: GoogleFonts.montserrat(
                              color: _headingColor,
                              fontSize: 42,
                              fontWeight: FontWeight.w800,
                              height: 1.04,
                            ),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            subtitle,
                            textAlign: TextAlign.left,
                            style: GoogleFonts.montserrat(
                              color: _subheadingColor,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              height: 1.5,
                            ),
                          ),
                          const Spacer(),
                          if (pageIndex != 0)
                            Center(
                              child: SizedBox(
                                width: MediaQuery.of(context).size.width * 0.9,
                                height: 220,
                                child: Image.asset(
                                  imagePath,
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),
                          const Spacer(),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(28, 0, 28, 30),
            child: Column(
              children: [
                SizedBox(
                  width: 350,
                  child: Image.asset(
                    _progressAssets[pageIndex],
                    height: 50,
                    fit: BoxFit.fill,
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _nextPage,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      buttonText,
                      style: GoogleFonts.montserrat(
                        color: Colors.black,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _OnboardingItem {
  final String title;
  final String subtitle;
  final String imagePath;

  const _OnboardingItem({
    required this.title,
    required this.subtitle,
    required this.imagePath,
  });
}

class _FirstScreenCarImage extends StatelessWidget {
  const _FirstScreenCarImage();

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      AppAssets.screen1Car,
      fit: BoxFit.contain,
    );
  }
}
