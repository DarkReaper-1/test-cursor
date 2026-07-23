import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';

/// Thin wrapper around the `camera` plugin that:
///  - opens the rear camera at the lowest usable resolution (we only need
///    average brightness, not a picture — this keeps CPU/battery/APK
///    runtime footprint small),
///  - turns the torch on for the duration of a measurement,
///  - streams each frame's mean luminance (from the YUV Y-plane, which
///    tracks how much flash light is being absorbed/reflected by the
///    fingertip) to a callback.
///
/// No frames or images are ever saved, uploaded, or persisted — only the
/// derived brightness numbers are kept, in memory, for the current session.
class CameraPpgService {
  CameraController? _controller;
  bool _streaming = false;

  Future<void> initialize() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) {
      throw CameraException('no_camera', 'No camera available on this device.');
    }
    final rearCamera = cameras.firstWhere(
      (c) => c.lensDirection == CameraLensDirection.back,
      orElse: () => cameras.first,
    );

    final controller = CameraController(
      rearCamera,
      ResolutionPreset.low,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.yuv420,
    );
    await controller.initialize();
    _controller = controller;
  }

  bool get isInitialized => _controller?.value.isInitialized ?? false;

  Future<void> startMeasuring(void Function(double timestampMs, double luminance) onSample) async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    if (_streaming) return;

    try {
      await controller.setFlashMode(FlashMode.torch);
    } catch (_) {
      // Some devices/emulators lack a torch; measurement still runs, but
      // quality will suffer without contact + light. The UI surfaces this
      // via the signal-quality indicator rather than a scary error.
    }

    _streaming = true;
    await controller.startImageStream((CameraImage image) {
      if (!_streaming) return;
      final luminance = _meanLuminance(image);
      final timestampMs = DateTime.now().millisecondsSinceEpoch.toDouble();
      onSample(timestampMs, luminance);
    });
  }

  Future<void> stopMeasuring() async {
    _streaming = false;
    final controller = _controller;
    if (controller == null) return;
    if (controller.value.isStreamingImages) {
      await controller.stopImageStream();
    }
    try {
      await controller.setFlashMode(FlashMode.off);
    } catch (_) {}
  }

  double _meanLuminance(CameraImage image) {
    final yPlane = image.planes.first.bytes;
    // Sampling every 4th byte is enough for a stable mean and keeps this
    // hot path cheap on low-end phones.
    var sum = 0;
    var count = 0;
    for (var i = 0; i < yPlane.length; i += 4) {
      sum += yPlane[i];
      count++;
    }
    return count == 0 ? 0 : sum / count;
  }

  Future<void> dispose() async {
    await stopMeasuring();
    await _controller?.dispose();
    _controller = null;
  }

  @visibleForTesting
  CameraController? get debugController => _controller;
}
