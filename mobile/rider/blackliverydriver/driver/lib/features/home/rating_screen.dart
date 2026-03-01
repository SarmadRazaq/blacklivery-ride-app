import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/providers/auth_provider.dart';
import '../earnings/providers/earnings_provider.dart';
import '../../core/theme/app_theme.dart';

/// Self-rating screen — shows driver's own average rating, rating distribution,
/// and recent rider feedback.
class RatingScreen extends StatefulWidget {
  const RatingScreen({super.key});

  @override
  State<RatingScreen> createState() => _RatingScreenState();
}

class _RatingScreenState extends State<RatingScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ep = context.read<EarningsProvider>();
      ep.loadEarningsData();
      ep.loadRatingDistribution();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: Colors.white, size: 28),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'My Rating',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: Consumer2<EarningsProvider, AuthProvider>(
        builder: (context, earnings, auth, _) {
          // Use real data from rating distribution API if available, fall back to earnings data
          final ratingData = earnings.ratingData;
          final rating = (ratingData['averageRating'] as num?)?.toDouble()
              ?? (earnings.earningsData['rating'] as num?)?.toDouble()
              ?? 0.0;
          final totalRides = (ratingData['totalRides'] as num?)?.toInt()
              ?? (earnings.earningsData['ridesCount'] as num?)?.toInt()
              ?? 0;

          // Use real distribution from API
          final rawDist = ratingData['distribution'] as Map<String, dynamic>?;
          final distribution = <int, int>{};
          if (rawDist != null) {
            for (final entry in rawDist.entries) {
              final key = int.tryParse(entry.key);
              if (key != null) distribution[key] = (entry.value as num?)?.toInt() ?? 0;
            }
          }
          // Ensure all 5 star levels exist
          for (int i = 1; i <= 5; i++) {
            distribution.putIfAbsent(i, () => 0);
          }

          // Use real feedback from API
          final recentFeedback = (ratingData['recentFeedback'] as List<dynamic>?) ?? [];

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const SizedBox(height: 20),

                // Big rating display
                Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primary.withValues(alpha: 0.3),
                        AppColors.primary.withValues(alpha: 0.1),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.5),
                      width: 3,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        rating > 0 ? rating.toStringAsFixed(1) : '—',
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 42,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: List.generate(5, (i) {
                          return Icon(
                            i < rating.round()
                                ? Icons.star
                                : Icons.star_border,
                            color: AppColors.primary,
                            size: 16,
                          );
                        }),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),
                Text(
                  'Based on $totalRides rides',
                  style: TextStyle(
                    color: Colors.grey[400],
                    fontSize: 13,
                  ),
                ),

                const SizedBox(height: 8),
                _buildRatingBadge(rating),

                const SizedBox(height: 32),

                // Rating distribution
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.cardBackground,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Rating Distribution',
                        style: TextStyle(
                          color: AppColors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ...List.generate(5, (i) {
                        final stars = 5 - i;
                        final count = distribution[stars] ?? 0;
                        final pct =
                            totalRides > 0 ? count / totalRides : 0.0;
                        return _buildDistributionBar(stars, count, pct);
                      }),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Tips to improve
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.lightbulb_outline,
                              color: AppColors.primary, size: 18),
                          const SizedBox(width: 8),
                          const Text(
                            'Tips to Improve Your Rating',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      _buildTipItem('Keep your vehicle clean and comfortable'),
                      _buildTipItem('Follow navigation and take efficient routes'),
                      _buildTipItem('Be courteous and professional'),
                      _buildTipItem('Arrive promptly at pickup location'),
                      _buildTipItem('Help with luggage when possible'),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Recent feedback
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.cardBackground,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Recent Feedback',
                        style: TextStyle(
                          color: AppColors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 14),
                      if (recentFeedback.isEmpty && totalRides == 0)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Center(
                            child: Text(
                              'No feedback yet. Complete rides to receive ratings.',
                              style: TextStyle(
                                color: AppColors.grey,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        )
                      else if (recentFeedback.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Center(
                            child: Text(
                              'No written feedback yet.',
                              style: TextStyle(
                                color: AppColors.grey,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        )
                      else
                        ...recentFeedback.map((fb) {
                          final fbMap = fb as Map<String, dynamic>;
                          return _buildFeedbackItem(
                            (fbMap['rating'] as num?)?.toInt() ?? 5,
                            fbMap['feedback'] as String? ?? '',
                          );
                        }),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildRatingBadge(double rating) {
    String label;
    Color color;

    if (rating >= 4.8) {
      label = 'Excellent';
      color = AppColors.primary;
    } else if (rating >= 4.5) {
      label = 'Great';
      color = Colors.green;
    } else if (rating >= 4.0) {
      label = 'Good';
      color = Colors.orange;
    } else if (rating > 0) {
      label = 'Needs Improvement';
      color = Colors.red;
    } else {
      label = 'No Rating Yet';
      color = AppColors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
      ),
    );
  }

  Widget _buildDistributionBar(int stars, int count, double pct) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 20,
            child: Text(
              '$stars',
              style: const TextStyle(color: AppColors.white, fontSize: 13),
            ),
          ),
          const Icon(Icons.star, color: AppColors.primary, size: 14),
          const SizedBox(width: 8),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: pct,
                minHeight: 6,
                backgroundColor: AppColors.inputBackground,
                valueColor:
                    const AlwaysStoppedAnimation(AppColors.primary),
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 30,
            child: Text(
              '$count',
              textAlign: TextAlign.right,
              style: TextStyle(color: Colors.grey[400], fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTipItem(String tip) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('•  ',
              style: TextStyle(color: AppColors.primary, fontSize: 14)),
          Expanded(
            child: Text(
              tip,
              style: TextStyle(
                color: Colors.grey[300],
                fontSize: 12,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeedbackItem(int stars, String text) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.inputBackground,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ...List.generate(
                5,
                (i) => Icon(
                  i < stars ? Icons.star : Icons.star_border,
                  color: AppColors.primary,
                  size: 14,
                ),
              ),
              const Spacer(),
              Text(
                'Recent',
                style: TextStyle(color: Colors.grey[500], fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            text,
            style: TextStyle(
              color: Colors.grey[300],
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
