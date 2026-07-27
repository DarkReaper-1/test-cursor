import Foundation

/// Decodes the IEEE 11073-20601 16-bit SFLOAT format used throughout the
/// Bluetooth SIG health device profiles (Blood Pressure, Weight Scale,
/// Glucose, ...): a 4-bit signed exponent and a 12-bit signed mantissa,
/// `value = mantissa * 10^exponent`, plus a handful of reserved bit
/// patterns for NaN/±Infinity/"not at this resolution".
public enum IEEE11073SFloat {
    public enum DecodedValue: Equatable {
        case value(Double)
        case notANumber
        case notAtThisResolution
        case positiveInfinity
        case negativeInfinity
        case reserved
    }

    public static func decode(_ raw: UInt16) -> DecodedValue {
        let mantissaRaw = raw & 0x0FFF
        let exponentRaw = UInt8((raw >> 12) & 0x0F)

        switch mantissaRaw {
        case 0x07FF: return .notANumber
        case 0x0800: return .notAtThisResolution
        case 0x07FE: return .positiveInfinity
        case 0x0802: return .negativeInfinity
        case 0x0801: return .reserved
        default: break
        }

        let mantissa: Int = mantissaRaw > 0x07FF ? Int(mantissaRaw) - 4096 : Int(mantissaRaw)
        let exponent: Int = exponentRaw > 7 ? Int(exponentRaw) - 16 : Int(exponentRaw)

        return .value(Double(mantissa) * pow(10.0, Double(exponent)))
    }
}
