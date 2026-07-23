import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../models/blood_pressure_reading.dart';
import '../models/heart_rate_reading.dart';
import '../services/analytics_service.dart';
import '../theme/app_theme.dart';

enum _Range { week, month, quarter }

extension on _Range {
  Duration get duration => switch (this) {
        _Range.week => const Duration(days: 7),
        _Range.month => const Duration(days: 30),
        _Range.quarter => const Duration(days: 90),
      };

  String get label => switch (this) {
        _Range.week => '7d',
        _Range.month => '30d',
        _Range.quarter => '90d',
      };
}

class ChartsScreen extends StatefulWidget {
  const ChartsScreen({super.key});

  @override
  State<ChartsScreen> createState() => _ChartsScreenState();
}

class _ChartsScreenState extends State<ChartsScreen> {
  final _analytics = AnalyticsService();
  _Range _range = _Range.week;

  List<HeartRateReading> _hr = [];
  List<BloodPressureReading> _bp = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final hr = await _analytics.heartRateSince(_range.duration);
    final bp = await _analytics.bloodPressureSince(_range.duration);
    if (!mounted) return;
    setState(() {
      // Reverse to chronological order for left-to-right charting.
      _hr = hr.reversed.toList();
      _bp = bp.reversed.toList();
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trends')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _RangeSelector(
                    selected: _range,
                    onChanged: (r) {
                      setState(() => _range = r);
                      _load();
                    },
                  ),
                  const SizedBox(height: 24),
                  Text('Heart rate', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 220,
                    child: _hr.length < 2
                        ? const _EmptyChartMessage(message: 'Log a few more heart rate readings to see a trend.')
                        : _HeartRateChart(readings: _hr),
                  ),
                  const SizedBox(height: 32),
                  Text('Blood pressure', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 220,
                    child: _bp.length < 2
                        ? const _EmptyChartMessage(message: 'Log a few more blood pressure readings to see a trend.')
                        : _BloodPressureChart(readings: _bp),
                  ),
                ],
              ),
      ),
    );
  }
}

class _RangeSelector extends StatelessWidget {
  final _Range selected;
  final ValueChanged<_Range> onChanged;
  const _RangeSelector({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<_Range>(
      segments: _Range.values
          .map((r) => ButtonSegment(value: r, label: Text(r.label)))
          .toList(),
      selected: {selected},
      onSelectionChanged: (set) => onChanged(set.first),
    );
  }
}

class _EmptyChartMessage extends StatelessWidget {
  final String message;
  const _EmptyChartMessage({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey)),
    );
  }
}

class _HeartRateChart extends StatelessWidget {
  final List<HeartRateReading> readings;
  const _HeartRateChart({required this.readings});

  @override
  Widget build(BuildContext context) {
    final spots = <FlSpot>[
      for (var i = 0; i < readings.length; i++) FlSpot(i.toDouble(), readings[i].bpm.toDouble()),
    ];
    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: true, drawVerticalLine: false),
        titlesData: const FlTitlesData(
          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: AppTheme.primary,
            barWidth: 3,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(show: true, color: AppTheme.primary.withValues(alpha: 0.12)),
          ),
        ],
      ),
    );
  }
}

class _BloodPressureChart extends StatelessWidget {
  final List<BloodPressureReading> readings;
  const _BloodPressureChart({required this.readings});

  @override
  Widget build(BuildContext context) {
    final systolicSpots = <FlSpot>[
      for (var i = 0; i < readings.length; i++) FlSpot(i.toDouble(), readings[i].systolic.toDouble()),
    ];
    final diastolicSpots = <FlSpot>[
      for (var i = 0; i < readings.length; i++) FlSpot(i.toDouble(), readings[i].diastolic.toDouble()),
    ];
    return Column(
      children: [
        Expanded(
          child: LineChart(
            LineChartData(
              gridData: const FlGridData(show: true, drawVerticalLine: false),
              titlesData: const FlTitlesData(
                topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: [
                LineChartBarData(
                  spots: systolicSpots,
                  isCurved: true,
                  color: Colors.indigo,
                  barWidth: 3,
                  dotData: const FlDotData(show: false),
                ),
                LineChartBarData(
                  spots: diastolicSpots,
                  isCurved: true,
                  color: Colors.indigo.shade200,
                  barWidth: 3,
                  dotData: const FlDotData(show: false),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _LegendDot(color: Colors.indigo, label: 'Systolic'),
            const SizedBox(width: 16),
            _LegendDot(color: Colors.indigo.shade200, label: 'Diastolic'),
          ],
        ),
      ],
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
      ],
    );
  }
}
