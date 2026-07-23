import '../db/app_database.dart';
import '../models/blood_pressure_reading.dart';
import '../models/heart_rate_reading.dart';

/// All reads/writes to the local health database go through here — the
/// rest of the app never touches SQL directly.
class HealthRepository {
  final AppDatabase _db = AppDatabase.instance;

  Future<int> addHeartRate(HeartRateReading reading) async {
    final db = await _db.database;
    return db.insert('heart_rate_readings', reading.toMap());
  }

  Future<int> addBloodPressure(BloodPressureReading reading) async {
    final db = await _db.database;
    return db.insert('blood_pressure_readings', reading.toMap());
  }

  Future<void> deleteHeartRate(int id) async {
    final db = await _db.database;
    await db.delete('heart_rate_readings', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> deleteBloodPressure(int id) async {
    final db = await _db.database;
    await db.delete('blood_pressure_readings', where: 'id = ?', whereArgs: [id]);
  }

  Future<List<HeartRateReading>> heartRateReadings({DateTime? since}) async {
    final db = await _db.database;
    final rows = await db.query(
      'heart_rate_readings',
      where: since != null ? 'taken_at >= ?' : null,
      whereArgs: since != null ? [since.toIso8601String()] : null,
      orderBy: 'taken_at DESC',
    );
    return rows.map(HeartRateReading.fromMap).toList();
  }

  Future<List<BloodPressureReading>> bloodPressureReadings({DateTime? since}) async {
    final db = await _db.database;
    final rows = await db.query(
      'blood_pressure_readings',
      where: since != null ? 'taken_at >= ?' : null,
      whereArgs: since != null ? [since.toIso8601String()] : null,
      orderBy: 'taken_at DESC',
    );
    return rows.map(BloodPressureReading.fromMap).toList();
  }

  Future<HeartRateReading?> latestHeartRate() async {
    final rows = await heartRateReadings();
    return rows.isEmpty ? null : rows.first;
  }

  Future<BloodPressureReading?> latestBloodPressure() async {
    final rows = await bloodPressureReadings();
    return rows.isEmpty ? null : rows.first;
  }

  Future<void> clearAll() async {
    final db = await _db.database;
    await db.delete('heart_rate_readings');
    await db.delete('blood_pressure_readings');
  }
}
