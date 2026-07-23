import 'package:flutter/material.dart';
import '../services/ppg_processor.dart';

class QualityBadge extends StatelessWidget {
  final SignalQuality quality;
  final bool fingerDetected;

  const QualityBadge({super.key, required this.quality, required this.fingerDetected});

  @override
  Widget build(BuildContext context) {
    final (label, color, icon) = _config();
    return Semantics(
      label: 'Signal quality: $label',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: color, width: 1.5),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }

  (String, Color, IconData) _config() {
    if (!fingerDetected) {
      return ('Place your finger on the camera & flash', Colors.grey, Icons.touch_app);
    }
    switch (quality) {
      case SignalQuality.none:
        return ('Hold still, starting...', Colors.grey, Icons.hourglass_top);
      case SignalQuality.poor:
        return ('Weak signal — press gently, stay still', Colors.orange, Icons.warning_amber);
      case SignalQuality.fair:
        return ('Reading steadying...', Colors.amber.shade800, Icons.timelapse);
      case SignalQuality.good:
        return ('Good signal', Colors.green.shade700, Icons.check_circle);
    }
  }
}
