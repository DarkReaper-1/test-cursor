import 'package:health/health.dart';

/// Thin, opt-in wrapper around Apple Health (iOS) / Health Connect
/// (Android) via the `health` plugin.
///
/// This is off by default. It only ever *writes* the readings you already
/// took in PulseCheck into Apple's/Google's own on-device health store —
/// it never reads your existing health history, and nothing here talks to
/// a PulseCheck server, because there is no PulseCheck server.
class HealthKitService {
  final Health _health = Health();

  static const _types = [
    HealthDataType.HEART_RATE,
    HealthDataType.BLOOD_PRESSURE_SYSTOLIC,
    HealthDataType.BLOOD_PRESSURE_DIASTOLIC,
  ];

  static const _permissions = [
    HealthDataAccess.WRITE,
    HealthDataAccess.WRITE,
    HealthDataAccess.WRITE,
  ];

  Future<bool> requestAuthorization() async {
    try {
      await _health.configure();
      final granted = await _health.hasPermissions(_types, permissions: _permissions) ?? false;
      if (granted) return true;
      return _health.requestAuthorization(_types, permissions: _permissions);
    } catch (_) {
      return false;
    }
  }

  Future<bool> writeHeartRate({required int bpm, required DateTime takenAt}) async {
    try {
      return await _health.writeHealthData(
        value: bpm.toDouble(),
        type: HealthDataType.HEART_RATE,
        startTime: takenAt,
        endTime: takenAt,
      );
    } catch (_) {
      return false;
    }
  }

  Future<bool> writeBloodPressure({
    required int systolic,
    required int diastolic,
    required DateTime takenAt,
  }) async {
    try {
      final systolicOk = await _health.writeHealthData(
        value: systolic.toDouble(),
        type: HealthDataType.BLOOD_PRESSURE_SYSTOLIC,
        startTime: takenAt,
        endTime: takenAt,
      );
      final diastolicOk = await _health.writeHealthData(
        value: diastolic.toDouble(),
        type: HealthDataType.BLOOD_PRESSURE_DIASTOLIC,
        startTime: takenAt,
        endTime: takenAt,
      );
      return systolicOk && diastolicOk;
    } catch (_) {
      return false;
    }
  }
}
