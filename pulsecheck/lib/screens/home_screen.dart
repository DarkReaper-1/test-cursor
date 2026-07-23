
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

import '../services/camera_ppg_service.dart';
import '../services/history_store.dart';
import '../services/ppg_processor.dart';
import '../theme/app_theme.dart';
import '../widgets/disclaimer_dialog.dart';
import '../widgets/quality_badge.dart';
import '../widgets/waveform_painter.dart';
import 'about_screen.dart';
import 'history_screen.dart';

enum _MeasureState { idle, requestingPermission, measuring, cameraUnavailable, done }

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final _camera = CameraPpgService();
  final _processor = PpgProcessor();
  final _historyStore = HistoryStore();

  _MeasureState _state = _MeasureState.idle;
  PpgReading? _reading;
  String? _errorMessage;

  static const _minMeasurementDuration = Duration(seconds: 15);
  static const _maxMeasurementDuration = Duration(seconds: 45);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeShowDisclaimer());
  }

  Future<void> _maybeShowDisclaimer() async {
    final acknowledged = await _historyStore.hasAcknowledgedDisclaimer();
    if (!acknowledged && mounted) {
      await DisclaimerDialog.showIfNeeded(
        context,
        onAcknowledged: _historyStore.setAcknowledgedDisclaimer,
      );
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) {
      _stopMeasuring();
    }
  }

  Future<void> _startMeasuring() async {
    setState(() {
      _state = _MeasureState.requestingPermission;
      _errorMessage = null;
      _reading = null;
    });

    try {
      if (!_camera.isInitialized) {
        await _camera.initialize();
      }
      _processor.reset();
      setState(() => _state = _MeasureState.measuring);

      await _camera.startMeasuring((timestampMs, luminance) {
        if (!mounted) return;
        final reading = _processor.addSample(timestampMs, luminance);
        setState(() => _reading = reading);

        if (reading.elapsed >= _maxMeasurementDuration) {
          _finishMeasuring();
        }
      });
    } on CameraException catch (e) {
      setState(() {
        _state = _MeasureState.cameraUnavailable;
        _errorMessage = e.description ?? 'Camera permission is needed to measure your pulse.';
      });
    } catch (e) {
      setState(() {
        _state = _MeasureState.cameraUnavailable;
        _errorMessage = 'Something went wrong starting the camera. Please try again.';
      });
    }
  }

  Future<void> _finishMeasuring() async {
    await _camera.stopMeasuring();
    if (!mounted) return;

    final reading = _reading;
    if (reading != null && reading.bpm != null) {
      await _historyStore.add(ReadingRecord(
        takenAt: DateTime.now(),
        bpm: reading.bpm!,
        rmssdMs: reading.rmssdMs,
      ));
    }
    setState(() => _state = _MeasureState.done);
  }

  Future<void> _stopMeasuring() async {
    await _camera.stopMeasuring();
    if (mounted) {
      setState(() => _state = _MeasureState.idle);
    }
  }

  bool get _canFinishEarly {
    final reading = _reading;
    return _state == _MeasureState.measuring &&
        reading != null &&
        reading.bpm != null &&
        reading.elapsed >= _minMeasurementDuration;
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _camera.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PulseCheck'),
        actions: [
          IconButton(
            tooltip: 'History',
            icon: const Icon(Icons.history),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const HistoryScreen()),
            ),
          ),
          IconButton(
            tooltip: 'About & disclaimer',
            icon: const Icon(Icons.info_outline),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const AboutScreen()),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _buildBody(),
        ),
      ),
    );
  }

  Widget _buildBody() {
    switch (_state) {
      case _MeasureState.idle:
        return _IdleView(onStart: _startMeasuring);
      case _MeasureState.requestingPermission:
        return const Center(child: CircularProgressIndicator());
      case _MeasureState.measuring:
        return _MeasuringView(
          reading: _reading,
          fingerDetected: _processor.looksLikeFingerPresent,
          canFinishEarly: _canFinishEarly,
          onCancel: _stopMeasuring,
          onFinish: _finishMeasuring,
        );
      case _MeasureState.cameraUnavailable:
        return _ErrorView(message: _errorMessage ?? 'Camera unavailable.', onRetry: _startMeasuring);
      case _MeasureState.done:
        return _ResultView(reading: _reading, onMeasureAgain: () {
          setState(() => _state = _MeasureState.idle);
        });
    }
  }
}

class _IdleView extends StatelessWidget {
  final VoidCallback onStart;
  const _IdleView({required this.onStart});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.favorite, size: 96, color: AppTheme.primary),
        const SizedBox(height: 24),
        Text(
          'Check your pulse',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 16),
        const Text(
          'Cover the rear camera and flash gently with your fingertip, '
          'then hold still for about 20 seconds.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, height: 1.4),
        ),
        const SizedBox(height: 40),
        ElevatedButton.icon(
          onPressed: onStart,
          icon: const Icon(Icons.play_arrow),
          label: const Text('Start'),
        ),
      ],
    );
  }
}

class _MeasuringView extends StatelessWidget {
  final PpgReading? reading;
  final bool fingerDetected;
  final bool canFinishEarly;
  final VoidCallback onCancel;
  final VoidCallback onFinish;

  const _MeasuringView({
    required this.reading,
    required this.fingerDetected,
    required this.canFinishEarly,
    required this.onCancel,
    required this.onFinish,
  });

  @override
  Widget build(BuildContext context) {
    final bpm = reading?.bpm;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        QualityBadge(quality: reading?.quality ?? SignalQuality.none, fingerDetected: fingerDetected),
        const SizedBox(height: 32),
        Text(
          bpm != null ? '$bpm' : '--',
          style: const TextStyle(fontSize: 96, fontWeight: FontWeight.bold, color: AppTheme.primary),
        ),
        const Text('beats per minute', style: TextStyle(fontSize: 18)),
        const SizedBox(height: 24),
        WaveformView(samples: reading?.waveform ?? const [], color: AppTheme.primary),
        const SizedBox(height: 32),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            OutlinedButton(onPressed: onCancel, child: const Text('Cancel')),
            const SizedBox(width: 16),
            if (canFinishEarly)
              ElevatedButton(onPressed: onFinish, child: const Text('Done')),
          ],
        ),
      ],
    );
  }
}

class _ResultView extends StatelessWidget {
  final PpgReading? reading;
  final VoidCallback onMeasureAgain;

  const _ResultView({required this.reading, required this.onMeasureAgain});

  @override
  Widget build(BuildContext context) {
    final bpm = reading?.bpm;
    final rmssd = reading?.rmssdMs;

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (bpm != null) ...[
          Text(
            '$bpm',
            style: const TextStyle(fontSize: 96, fontWeight: FontWeight.bold, color: AppTheme.primary),
          ),
          const Text('beats per minute', style: TextStyle(fontSize: 20)),
          const SizedBox(height: 16),
          if (rmssd != null)
            Text(
              'HRV (RMSSD): ${rmssd.toStringAsFixed(0)} ms — rough estimate, informational only',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 15, color: Colors.grey),
            ),
        ] else ...[
          const Icon(Icons.sentiment_dissatisfied, size: 72, color: Colors.orange),
          const SizedBox(height: 16),
          const Text(
            "Couldn't get a steady reading. Try again with gentle, "
            'even pressure and stay still.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 18),
          ),
        ],
        const SizedBox(height: 40),
        ElevatedButton(onPressed: onMeasureAgain, child: const Text('Measure again')),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.camera_alt_outlined, size: 72, color: Colors.grey),
        const SizedBox(height: 16),
        Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 18)),
        const SizedBox(height: 8),
        const Text(
          'PulseCheck only ever uses the camera to measure light through '
          'your fingertip — nothing is recorded or shared.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, color: Colors.grey),
        ),
        const SizedBox(height: 32),
        ElevatedButton(onPressed: onRetry, child: const Text('Try again')),
      ],
    );
  }
}
