import 'dart:collection';
import 'dart:math' as math;

/// A single brightness sample pulled from the camera preview while a
/// fingertip covers the lens + flash.
class PpgSample {
  final double timestampMs;
  final double value; // mean luminance of the frame
  const PpgSample(this.timestampMs, this.value);
}

/// Result of one detected heartbeat (a peak in the filtered PPG waveform).
class BeatEvent {
  final double timestampMs;
  const BeatEvent(this.timestampMs);
}

enum SignalQuality { none, poor, fair, good }

class PpgReading {
  final int? bpm;
  final double? rmssdMs; // HRV: root mean square of successive RR differences
  final SignalQuality quality;
  final List<double> waveform; // recent filtered samples, for the UI chart
  final Duration elapsed;

  const PpgReading({
    required this.bpm,
    required this.rmssdMs,
    required this.quality,
    required this.waveform,
    required this.elapsed,
  });
}

/// Turns a stream of raw camera-brightness samples into a heart rate and a
/// rough HRV estimate.
///
/// Pipeline: raw luminance -> DC removal (subtract a slow moving average,
/// i.e. a simple high-pass) -> light smoothing (simple low-pass) -> adaptive
/// peak detection with a physiological refractory period -> BPM from the
/// mean of recent RR intervals -> RMSSD from successive RR differences.
///
/// This is intentionally simple (no FFT, no external DSP package) so the
/// app stays dependency-light, but every step mirrors published fingertip
/// PPG methodology.
class PpgProcessor {
  PpgProcessor({
    this.sampleWindow = const Duration(seconds: 12),
    this.minBpm = 40,
    this.maxBpm = 200,
  });

  final Duration sampleWindow;
  final int minBpm;
  final int maxBpm;

  final ListQueue<PpgSample> _raw = ListQueue<PpgSample>();
  final ListQueue<double> _filtered = ListQueue<double>();
  final ListQueue<BeatEvent> _beats = ListQueue<BeatEvent>();

  double? _slowAvg; // tracks the DC baseline (finger + flash brightness)
  double? _fastAvg; // light smoothing of the high-passed signal
  double _lastValue = 0;
  double _lastSlope = 0;
  double? _lastPeakMs;
  DateTime? _startedAt;

  /// Minimum time between two accepted heartbeats, derived from [maxBpm].
  double get _refractoryMs => 60000 / maxBpm;

  void reset() {
    _raw.clear();
    _filtered.clear();
    _beats.clear();
    _slowAvg = null;
    _fastAvg = null;
    _lastPeakMs = null;
    _startedAt = null;
  }

  PpgReading addSample(double timestampMs, double luminance) {
    _startedAt ??= DateTime.fromMillisecondsSinceEpoch(timestampMs.toInt());
    _raw.add(PpgSample(timestampMs, luminance));

    // Slow moving average acts as the "DC" baseline; subtracting it is a
    // crude but effective high-pass filter that removes ambient-light /
    // finger-pressure drift while keeping the ~1 Hz pulse component.
    const slowAlpha = 0.03;
    _slowAvg = _slowAvg == null ? luminance : _slowAvg! + slowAlpha * (luminance - _slowAvg!);
    final highPassed = luminance - _slowAvg!;

    // Fast moving average smooths sensor/quantization noise (low-pass).
    const fastAlpha = 0.35;
    _fastAvg = _fastAvg == null ? highPassed : _fastAvg! + fastAlpha * (highPassed - _fastAvg!);
    final filteredValue = _fastAvg!;

    _filtered.add(filteredValue);

    _detectPeak(timestampMs, filteredValue);

    _trimToWindow(timestampMs);

    return _buildReading(timestampMs);
  }

  void _detectPeak(double timestampMs, double value) {
    final slope = value - _lastValue;

    // A peak is where the signal stops rising and starts falling.
    if (_lastSlope > 0 && slope <= 0) {
      final isFarEnoughFromLastPeak =
          _lastPeakMs == null || (timestampMs - _lastPeakMs!) >= _refractoryMs;
      final isAboveNoiseFloor = value > _adaptiveThreshold();

      if (isFarEnoughFromLastPeak && isAboveNoiseFloor) {
        _beats.add(BeatEvent(timestampMs));
        _lastPeakMs = timestampMs;
      }
    }

    _lastValue = value;
    _lastSlope = slope;
  }

  /// Threshold scales with recent signal amplitude so it adapts to different
  /// finger pressures / skin tones instead of using one fixed magic number.
  double _adaptiveThreshold() {
    if (_filtered.length < 10) return double.infinity;
    final recent = _filtered.toList().reversed.take(90).toList();
    final maxVal = recent.reduce(math.max);
    final minVal = recent.reduce(math.min);
    final amplitude = maxVal - minVal;
    return minVal + amplitude * 0.35;
  }

  void _trimToWindow(double nowMs) {
    final cutoff = nowMs - sampleWindow.inMilliseconds;
    while (_raw.isNotEmpty && _raw.first.timestampMs < cutoff) {
      _raw.removeFirst();
    }
    while (_filtered.length > 300) {
      _filtered.removeFirst();
    }
    while (_beats.isNotEmpty && _beats.first.timestampMs < cutoff) {
      _beats.removeFirst();
    }
  }

  PpgReading _buildReading(double nowMs) {
    final elapsed = _startedAt == null
        ? Duration.zero
        : Duration(milliseconds: nowMs.toInt() - _startedAt!.millisecondsSinceEpoch);

    final rrIntervals = _rrIntervalsMs();
    final quality = _estimateQuality(rrIntervals);

    int? bpm;
    if (rrIntervals.length >= 4 && quality != SignalQuality.none) {
      final meanRr = rrIntervals.reduce((a, b) => a + b) / rrIntervals.length;
      final candidate = (60000 / meanRr).round();
      if (candidate >= minBpm && candidate <= maxBpm) {
        bpm = candidate;
      }
    }

    double? rmssd;
    if (rrIntervals.length >= 5 && quality == SignalQuality.good) {
      rmssd = _rmssd(rrIntervals);
    }

    return PpgReading(
      bpm: bpm,
      rmssdMs: rmssd,
      quality: quality,
      waveform: _filtered.toList(),
      elapsed: elapsed,
    );
  }

  List<double> _rrIntervalsMs() {
    final beats = _beats.toList();
    final intervals = <double>[];
    for (var i = 1; i < beats.length; i++) {
      intervals.add(beats[i].timestampMs - beats[i - 1].timestampMs);
    }
    return intervals;
  }

  double _rmssd(List<double> rr) {
    var sumSq = 0.0;
    for (var i = 1; i < rr.length; i++) {
      final diff = rr[i] - rr[i - 1];
      sumSq += diff * diff;
    }
    return math.sqrt(sumSq / (rr.length - 1));
  }

  /// A rough "how much should I trust this reading" signal, based on how
  /// consistent recent RR intervals are (real pulses are fairly regular
  /// beat-to-beat; motion artifacts and finger slips are not) and how many
  /// beats we've actually captured.
  SignalQuality _estimateQuality(List<double> rrIntervals) {
    if (_raw.length < 60) return SignalQuality.none;
    if (rrIntervals.length < 3) return SignalQuality.poor;

    final mean = rrIntervals.reduce((a, b) => a + b) / rrIntervals.length;
    if (mean <= 0) return SignalQuality.poor;

    var variance = 0.0;
    for (final rr in rrIntervals) {
      variance += (rr - mean) * (rr - mean);
    }
    variance /= rrIntervals.length;
    final coefficientOfVariation = math.sqrt(variance) / mean;

    if (rrIntervals.length >= 6 && coefficientOfVariation < 0.12) {
      return SignalQuality.good;
    } else if (rrIntervals.length >= 4 && coefficientOfVariation < 0.25) {
      return SignalQuality.fair;
    }
    return SignalQuality.poor;
  }

  /// Whether the raw brightness looks like a finger is actually covering the
  /// lens + flash (vs. an empty camera view, which is far dimmer, or a
  /// blown-out frame, which is far brighter). Used to prompt the user
  /// immediately instead of letting them wait minutes for a reading that
  /// will never arrive, a top complaint about existing apps.
  bool get looksLikeFingerPresent {
    if (_raw.isEmpty) return false;
    final recent = _raw.toList().reversed.take(15).map((s) => s.value);
    final avg = recent.reduce((a, b) => a + b) / recent.length;
    return avg > 40 && avg < 250;
  }
}
