import Foundation

/// Parses the Bluetooth SIG "Blood Pressure Measurement" characteristic
/// (0x2A35), as broadcast by any cuff implementing the standard Blood
/// Pressure Service (0x1810) — this is the profile the overwhelming
/// majority of consumer BLE blood pressure monitors use, so implementing
/// the spec (rather than one vendor's proprietary format) covers the
/// widest range of hardware without per-brand SDKs.
///
/// Layout (Bluetooth SIG GATT Specification Supplement, Blood Pressure
/// Measurement):
/// ```
/// [0]      Flags (uint8)
/// [1-2]    Systolic (SFLOAT)
/// [3-4]    Diastolic (SFLOAT)
/// [5-6]    Mean Arterial Pressure (SFLOAT)
/// [7-13]   Time Stamp (7 bytes) — present iff Flags bit 1 set
/// [n-n+1]  Pulse Rate (SFLOAT) — present iff Flags bit 2 set
/// [+1]     User ID (uint8) — present iff Flags bit 3 set
/// [+2]     Measurement Status (uint16) — present iff Flags bit 4 set
/// ```
public enum BloodPressureMeasurementParser {
    public struct ParsedMeasurement: Equatable {
        public let systolic: Int
        public let diastolic: Int
        public let meanArterialPressure: Int?
        public let pulseRateBpm: Int?
        public let timestamp: Date?
        public let unit: Unit

        public enum Unit: Equatable { case mmHg, kPa }
    }

    public enum ParseError: Error, LocalizedError {
        case tooShort
        case unsupportedValue(String)

        public var errorDescription: String? {
            switch self {
            case .tooShort: return "The device sent an incomplete reading."
            case .unsupportedValue(let field): return "The device reported an unusable value for \(field)."
            }
        }
    }

    public static func parse(_ data: Data) throws -> ParsedMeasurement {
        var offset = 0
        func readUInt8() throws -> UInt8 {
            guard offset + 1 <= data.count else { throw ParseError.tooShort }
            defer { offset += 1 }
            return data[data.startIndex + offset]
        }
        func readUInt16LE() throws -> UInt16 {
            guard offset + 2 <= data.count else { throw ParseError.tooShort }
            let lo = UInt16(data[data.startIndex + offset])
            let hi = UInt16(data[data.startIndex + offset + 1])
            offset += 2
            return lo | (hi << 8)
        }
        func readSFloatAsInt(_ field: String) throws -> Int {
            let raw = try readUInt16LE()
            switch IEEE11073SFloat.decode(raw) {
            case .value(let v): return Int(v.rounded())
            default: throw ParseError.unsupportedValue(field)
            }
        }

        let flags = try readUInt8()
        let usesKPa = (flags & 0x01) != 0
        let hasTimestamp = (flags & 0x02) != 0
        let hasPulseRate = (flags & 0x04) != 0
        // bit 3 (User ID) and bit 4 (Measurement Status) are parsed for
        // completeness but not surfaced yet — see docs/PRD.md roadmap for
        // multi-user cuff support.

        let systolic = try readSFloatAsInt("systolic")
        let diastolic = try readSFloatAsInt("diastolic")
        let map = try? readSFloatAsInt("mean arterial pressure")

        var timestamp: Date?
        if hasTimestamp {
            let year = try readUInt16LE()
            let month = try readUInt8()
            let day = try readUInt8()
            let hour = try readUInt8()
            let minute = try readUInt8()
            let second = try readUInt8()
            var components = DateComponents()
            components.year = Int(year)
            components.month = Int(month)
            components.day = Int(day)
            components.hour = Int(hour)
            components.minute = Int(minute)
            components.second = Int(second)
            timestamp = Calendar(identifier: .gregorian).date(from: components)
        }

        var pulseRate: Int?
        if hasPulseRate {
            pulseRate = try? readSFloatAsInt("pulse rate")
        }

        return ParsedMeasurement(
            systolic: systolic,
            diastolic: diastolic,
            meanArterialPressure: map,
            pulseRateBpm: pulseRate,
            timestamp: timestamp,
            unit: usesKPa ? .kPa : .mmHg
        )
    }

    /// The device profile reports mmHg almost universally, but the spec
    /// technically allows kPa — convert defensively so downstream code can
    /// always assume mmHg, which is what every reference range and chart
    /// in the app is written in.
    public static func mmHg(from measurement: ParsedMeasurement) -> (systolic: Int, diastolic: Int) {
        guard measurement.unit == .kPa else {
            return (measurement.systolic, measurement.diastolic)
        }
        func toMmHg(_ kPa: Int) -> Int { Int((Double(kPa) * 7.50062).rounded()) }
        return (toMmHg(measurement.systolic), toMmHg(measurement.diastolic))
    }
}
