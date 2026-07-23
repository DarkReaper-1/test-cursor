import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:pulsecheck/services/ppg_processor.dart';

void main() {
  group('PpgProcessor', () {
    test('recovers BPM from a clean synthetic 72 bpm pulse signal', () {
      final processor = PpgProcessor();
      const targetBpm = 72.0;
      const sampleRateHz = 30.0;
      const durationSeconds = 15;
      final freqHz = targetBpm / 60.0;

      PpgReading? lastReading;
      final totalSamples = (durationSeconds * sampleRateHz).round();
      for (var i = 0; i < totalSamples; i++) {
        final tMs = (i * (1000 / sampleRateHz));
        // Baseline "DC" brightness (finger + flash) plus a small periodic
        // "AC" pulse component, matching real PPG waveform shape.
        final value = 150 + 8 * math.sin(2 * math.pi * freqHz * (tMs / 1000));
        lastReading = processor.addSample(tMs, value);
      }

      expect(lastReading, isNotNull);
      expect(lastReading!.bpm, isNotNull);
      expect(lastReading!.bpm!, inInclusiveRange(66, 78));
    });

    test('reports no confident BPM for pure noise', () {
      final processor = PpgProcessor();
      final random = math.Random(42);
      PpgReading? lastReading;
      for (var i = 0; i < 300; i++) {
        final tMs = i * (1000 / 30.0);
        lastReading = processor.addSample(tMs, 150 + random.nextDouble() * 4 - 2);
      }
      expect(lastReading!.quality, isNot(SignalQuality.good));
    });

    test('looksLikeFingerPresent is false with no samples and true once bright & steady', () {
      final processor = PpgProcessor();
      expect(processor.looksLikeFingerPresent, isFalse);

      for (var i = 0; i < 20; i++) {
        processor.addSample(i * 33.0, 140);
      }
      expect(processor.looksLikeFingerPresent, isTrue);
    });

    test('reset clears prior state', () {
      final processor = PpgProcessor();
      for (var i = 0; i < 60; i++) {
        processor.addSample(i * 33.0, 140 + (i % 2));
      }
      processor.reset();
      expect(processor.looksLikeFingerPresent, isFalse);
    });
  });
}
