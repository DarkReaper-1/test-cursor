import 'package:flutter/material.dart';

import '../models/blood_pressure_reading.dart';
import '../models/heart_rate_reading.dart';
import '../services/health_repository.dart';
import '../services/settings_store.dart';
import '../theme/app_theme.dart';
import '../widgets/disclaimer_dialog.dart';
import 'blood_pressure_log_screen.dart';
import 'heart_rate_measure_screen.dart';

/// The dashboard: latest readings at a glance, and one-tap access to the
/// two ways data gets into the app (measure heart rate with the camera,
/// or log a blood pressure reading from an external cuff).
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _repository = HealthRepository();
  final _settings = SettingsStore();

  HeartRateReading? _latestHr;
  BloodPressureReading? _latestBp;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeShowDisclaimer());
  }

  Future<void> _maybeShowDisclaimer() async {
    final acknowledged = await _settings.hasAcknowledgedDisclaimer();
    if (!acknowledged && mounted) {
      await DisclaimerDialog.showIfNeeded(context, onAcknowledged: _settings.setAcknowledgedDisclaimer);
    }
  }

  Future<void> _load() async {
    final hr = await _repository.latestHeartRate();
    final bp = await _repository.latestBloodPressure();
    if (!mounted) return;
    setState(() {
      _latestHr = hr;
      _latestBp = bp;
      _loading = false;
    });
  }

  Future<void> _openHeartRateMeasure() async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const HeartRateMeasureScreen()),
    );
    if (saved == true) _load();
  }

  Future<void> _openBloodPressureLog() async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const BloodPressureLogScreen()),
    );
    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('PulseCheck')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    _ReadingCard(
                      icon: Icons.favorite,
                      color: AppTheme.primary,
                      title: 'Heart rate',
                      value: _latestHr != null ? '${_latestHr!.bpm} bpm' : 'No readings yet',
                      subtitle: _latestHr != null ? _relativeTime(_latestHr!.takenAt) : null,
                    ),
                    const SizedBox(height: 16),
                    _ReadingCard(
                      icon: Icons.monitor_heart_outlined,
                      color: Colors.indigo,
                      title: 'Blood pressure',
                      value: _latestBp != null
                          ? '${_latestBp!.systolic}/${_latestBp!.diastolic} mmHg'
                          : 'No readings yet',
                      subtitle: _latestBp != null ? _relativeTime(_latestBp!.takenAt) : null,
                    ),
                    const SizedBox(height: 32),
                    ElevatedButton.icon(
                      onPressed: _openHeartRateMeasure,
                      icon: const Icon(Icons.camera_alt),
                      label: const Text('Measure heart rate'),
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: _openBloodPressureLog,
                      icon: const Icon(Icons.edit_note),
                      label: const Text('Log blood pressure'),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24) return '${diff.inHours} hr ago';
    return '${diff.inDays} day${diff.inDays == 1 ? '' : 's'} ago';
  }
}

class _ReadingCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String value;
  final String? subtitle;

  const _ReadingCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.value,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Icon(icon, size: 40, color: color),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 15, color: Colors.grey)),
                  Text(value, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
                  if (subtitle != null)
                    Text(subtitle!, style: const TextStyle(fontSize: 13, color: Colors.grey)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
