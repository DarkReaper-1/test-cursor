import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// A single on-device SQLite database. There is no server component —
/// this file is the entire "Health Data Database" layer, and it never
/// leaves the phone unless the user explicitly exports or shares it.
class AppDatabase {
  AppDatabase._();
  static final AppDatabase instance = AppDatabase._();

  Database? _db;

  Future<Database> get database async {
    final existing = _db;
    if (existing != null) return existing;
    final opened = await _open();
    _db = opened;
    return opened;
  }

  Future<Database> _open() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, 'pulsecheck.db');
    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE heart_rate_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            taken_at TEXT NOT NULL,
            bpm INTEGER NOT NULL,
            rmssd_ms REAL,
            source TEXT NOT NULL DEFAULT 'camera'
          )
        ''');
        await db.execute('''
          CREATE TABLE blood_pressure_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            taken_at TEXT NOT NULL,
            systolic INTEGER NOT NULL,
            diastolic INTEGER NOT NULL,
            pulse INTEGER,
            notes TEXT
          )
        ''');
        await db.execute('CREATE INDEX idx_hr_taken_at ON heart_rate_readings(taken_at)');
        await db.execute('CREATE INDEX idx_bp_taken_at ON blood_pressure_readings(taken_at)');
      },
    );
  }

  Future<void> close() async {
    await _db?.close();
    _db = null;
  }
}
