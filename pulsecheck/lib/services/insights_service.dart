import 'health_repository.dart';

enum InsightTone { neutral, positive, caution }

class Insight {
  final String text;
  final InsightTone tone;
  const Insight(this.text, this.tone);
}

/// Rule-based (not machine-learning, not cloud) pattern summaries over the
/// readings already saved locally. These are lifestyle observations —
/// "your readings have trended up this week" — never a diagnosis, and
/// every insight list carries that disclaimer.
class InsightsService {
  final HealthRepository _repository;

  InsightsService({HealthRepository? repository}) : _repository = repository ?? HealthRepository();

  Future<List<Insight>> buildInsights() async {
    final insights = <Insight>[];

    final hrInsight = await _heartRateTrendInsight();
    if (hrInsight != null) insights.add(hrInsight);

    final hrvInsight = await _hrvInsight();
    if (hrvInsight != null) insights.add(hrvInsight);

    final bpInsight = await _bloodPressureTrendInsight();
    if (bpInsight != null) insights.add(bpInsight);

    final bpCategoryInsight = await _bloodPressureCategoryInsight();
    if (bpCategoryInsight != null) insights.add(bpCategoryInsight);

    if (insights.isEmpty) {
      insights.add(const Insight(
        'Log a few more readings to start seeing trends here.',
        InsightTone.neutral,
      ));
    }

    return insights;
  }

  Future<Insight?> _heartRateTrendInsight() async {
    final now = DateTime.now();
    final thisWeek = await _repository.heartRateReadings(since: now.subtract(const Duration(days: 7)));
    final priorAll = await _repository.heartRateReadings(since: now.subtract(const Duration(days: 14)));
    final priorWeek = priorAll.where((r) => r.takenAt.isBefore(now.subtract(const Duration(days: 7))));

    if (thisWeek.length < 3 || priorWeek.length < 3) return null;

    final thisAvg = thisWeek.map((r) => r.bpm).reduce((a, b) => a + b) / thisWeek.length;
    final priorAvg = priorWeek.map((r) => r.bpm).reduce((a, b) => a + b) / priorWeek.length;
    final delta = thisAvg - priorAvg;

    if (delta.abs() < 3) {
      return Insight(
        'Your resting heart rate has been steady, averaging ${thisAvg.round()} bpm this week.',
        InsightTone.positive,
      );
    }
    final direction = delta > 0 ? 'up' : 'down';
    return Insight(
      'Your average heart rate is $direction ${delta.abs().round()} bpm this week '
      '(${thisAvg.round()} vs ${priorAvg.round()} bpm last week).',
      delta > 8 ? InsightTone.caution : InsightTone.neutral,
    );
  }

  Future<Insight?> _hrvInsight() async {
    final recent = await _repository.heartRateReadings(since: DateTime.now().subtract(const Duration(days: 7)));
    final hrvValues = recent.map((r) => r.rmssdMs).whereType<double>().toList();
    if (hrvValues.length < 3) return null;
    final avg = hrvValues.reduce((a, b) => a + b) / hrvValues.length;
    return Insight(
      'Your average HRV (RMSSD) this week is ${avg.round()} ms — a rough wellness '
      'indicator, not a clinical HRV measurement.',
      InsightTone.neutral,
    );
  }

  Future<Insight?> _bloodPressureTrendInsight() async {
    final now = DateTime.now();
    final thisWeek = await _repository.bloodPressureReadings(since: now.subtract(const Duration(days: 7)));
    final priorAll = await _repository.bloodPressureReadings(since: now.subtract(const Duration(days: 14)));
    final priorWeek = priorAll.where((r) => r.takenAt.isBefore(now.subtract(const Duration(days: 7))));

    if (thisWeek.length < 2 || priorWeek.length < 2) return null;

    final thisAvg = thisWeek.map((r) => r.systolic).reduce((a, b) => a + b) / thisWeek.length;
    final priorAvg = priorWeek.map((r) => r.systolic).reduce((a, b) => a + b) / priorWeek.length;
    final delta = thisAvg - priorAvg;

    if (delta.abs() < 4) {
      return Insight(
        'Your systolic blood pressure has been consistent, averaging ${thisAvg.round()} mmHg this week.',
        InsightTone.positive,
      );
    }
    final direction = delta > 0 ? 'higher' : 'lower';
    return Insight(
      'Your average systolic reading this week (${thisAvg.round()} mmHg) is '
      '${delta.abs().round()} mmHg $direction than last week.',
      delta > 10 ? InsightTone.caution : InsightTone.neutral,
    );
  }

  Future<Insight?> _bloodPressureCategoryInsight() async {
    final latest = await _repository.latestBloodPressure();
    if (latest == null) return null;
    return Insight(
      'Your latest reading (${latest.systolic}/${latest.diastolic} mmHg) falls in the '
      '"${latest.referenceCategory}" reference range. This is general information, '
      'not a diagnosis — talk to a clinician about what your numbers mean for you.',
      latest.referenceCategory == 'Normal range' ? InsightTone.positive : InsightTone.caution,
    );
  }
}
