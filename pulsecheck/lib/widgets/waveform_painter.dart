import 'package:flutter/material.dart';

/// Live pulse waveform, so the user gets instant visual feedback on signal
/// quality instead of staring at a spinner for a minute (a top complaint
/// about existing camera heart-rate apps).
class WaveformView extends StatelessWidget {
  final List<double> samples;
  final Color color;

  const WaveformView({super.key, required this.samples, required this.color});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(double.infinity, 120),
      painter: _WaveformPainter(samples: samples, color: color),
    );
  }
}

class _WaveformPainter extends CustomPainter {
  final List<double> samples;
  final Color color;

  _WaveformPainter({required this.samples, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    if (samples.length < 2) return;

    final maxVal = samples.reduce((a, b) => a > b ? a : b);
    final minVal = samples.reduce((a, b) => a < b ? a : b);
    final range = (maxVal - minVal).abs() < 0.001 ? 1.0 : (maxVal - minVal);

    final path = Path();
    final dx = size.width / (samples.length - 1);

    for (var i = 0; i < samples.length; i++) {
      final normalized = (samples[i] - minVal) / range;
      final x = i * dx;
      final y = size.height - (normalized * size.height * 0.8) - size.height * 0.1;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    final paint = Paint()
      ..color = color
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _WaveformPainter oldDelegate) => true;
}
