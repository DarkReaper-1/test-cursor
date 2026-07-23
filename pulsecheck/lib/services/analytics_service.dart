import '../models/blood_pressure_reading.dart';
import '../models/heart_rate_reading.dart';
import 'health_repository.dart';

class HeartRateStats {
  final double? average;
  final int? min;
  final int? max;
  final double? weeklyAverage;
  final double? monthlyAverage;
  final double? averageHrv;
  final int sampleCount;

  const HeartRateStats({
    this.average,
    this.min,
    this.max,
    this.weeklyAverage,
    this.monthlyAverage,
    this.averageHrv,
    required this.sampleCount,
  });
}

class BloodPressureStats {
  final double? averageSystolic;
  final double? averageDiastolic;
  final int? minSystolic;
  final int? maxSystolic;
  final double? weeklyAverageSystolic;
  final double? weeklyAverageDiastolic;
  final int sampleCount;

  const BloodPressureStats({
    this.averageSystolic,
    this.averageDiastolic,
    this.minSystolic,
    this.maxSystolic,
    this.weeklyAverageSystolic,
    this.weeklyAverageDiastolic,
    required this.sampleCount,
  });
}

/// Turns raw reading history into the summary numbers a dashboard/insights
/// screen actually wants — no cloud computation, everything runs on-device
/// over whatever is already in the local database.
class AnalyticsService {
  final HealthRepository _repository;

  AnalyticsService({HealthRepository? repository}) : _repository = repository ?? HealthRepository();

  Future<HeartRateStats> heartRateStats() async {
    final all = await _repository.heartRateReadings();
    if (all.isEmpty) return const HeartRateStats(sampleCount: 0);

    final now = DateTime.now();
    final weekAgo = now.subtract(const Duration(days: 7));
    final monthAgo = now.subtract(const Duration(days: 30));

    final bpms = all.map((r) => r.bpm).toList();
    final weekly = all.where((r) => r.takenAt.isAfter(weekAgo)).map((r) => r.bpm).toList();
    final monthly = all.where((r) => r.takenAt.isAfter(monthAgo)).map((r) => r.bpm).toList();
    final hrvValues = all.map((r) => r.rmssdMs).whereType<double>().toList();

    return HeartRateStats(
      average: _avg(bpms),
      min: bpms.reduce((a, b) => a < b ? a : b),
      max: bpms.reduce((a, b) => a > b ? a : b),
      weeklyAverage: weekly.isEmpty ? null : _avg(weekly),
      monthlyAverage: monthly.isEmpty ? null : _avg(monthly),
      averageHrv: hrvValues.isEmpty ? null : _avgDouble(hrvValues),
      sampleCount: all.length,
    );
  }

  Future<BloodPressureStats> bloodPressureStats() async {
    final all = await _repository.bloodPressureReadings();
    if (all.isEmpty) return const BloodPressureStats(sampleCount: 0);

    final now = DateTime.now();
    final weekAgo = now.subtract(const Duration(days: 7));

    final systolics = all.map((r) => r.systolic).toList();
    final diastolics = all.map((r) => r.diastolic).toList();
    final weekly = all.where((r) => r.takenAt.isAfter(weekAgo)).toList();

    return BloodPressureStats(
      averageSystolic: _avg(systolics),
      averageDiastolic: _avg(diastolics),
      minSystolic: systolics.reduce((a, b) => a < b ? a : b),
      maxSystolic: systolics.reduce((a, b) => a > b ? a : b),
      weeklyAverageSystolic: weekly.isEmpty ? null : _avg(weekly.map((r) => r.systolic).toList()),
      weeklyAverageDiastolic: weekly.isEmpty ? null : _avg(weekly.map((r) => r.diastolic).toList()),
      sampleCount: all.length,
    );
  }

  Future<List<HeartRateReading>> heartRateSince(Duration range) =>
      _repository.heartRateReadings(since: DateTime.now().subtract(range));

  Future<List<BloodPressureReading>> bloodPressureSince(Duration range) =>
      _repository.bloodPressureReadings(since: DateTime.now().subtract(range));

  double _avg(List<int> values) => values.reduce((a, b) => a + b) / values.length;
  double _avgDouble(List<double> values) => values.reduce((a, b) => a + b) / values.length;
}
