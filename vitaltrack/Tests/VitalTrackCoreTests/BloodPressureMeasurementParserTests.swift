import XCTest
@testable import VitalTrackCore

final class IEEE11073SFloatTests: XCTestCase {
    func testDecodesSimpleIntegerValue() {
        // mantissa 120, exponent 0 -> 120.0
        let raw: UInt16 = 0x0078
        XCTAssertEqual(IEEE11073SFloat.decode(raw), .value(120.0))
    }

    func testDecodesNegativeExponentValue() {
        // mantissa 1200, exponent -1 -> 120.0
        let raw: UInt16 = 0xF4B0
        XCTAssertEqual(IEEE11073SFloat.decode(raw), .value(120.0))
    }

    func testDecodesSpecialValues() {
        XCTAssertEqual(IEEE11073SFloat.decode(0x07FF), .notANumber)
        XCTAssertEqual(IEEE11073SFloat.decode(0x0800), .notAtThisResolution)
        XCTAssertEqual(IEEE11073SFloat.decode(0x07FE), .positiveInfinity)
        XCTAssertEqual(IEEE11073SFloat.decode(0x0802), .negativeInfinity)
    }
}

final class BloodPressureMeasurementParserTests: XCTestCase {
    /// Builds a spec-shaped Blood Pressure Measurement payload: flags with
    /// timestamp + pulse rate present, mmHg units, systolic 120 / diastolic
    /// 80 / MAP 93 / pulse 72, timestamped 2026-07-24 10:15:00.
    private func sampleMeasurementBytes() -> Data {
        var bytes: [UInt8] = []
        bytes.append(0b0000_0110) // flags: timestamp + pulse rate present, mmHg
        bytes.append(contentsOf: [0x78, 0x00]) // systolic 120
        bytes.append(contentsOf: [0x50, 0x00]) // diastolic 80
        bytes.append(contentsOf: [0x5D, 0x00]) // MAP 93
        bytes.append(contentsOf: [0xEA, 0x07]) // year 2026 (little-endian)
        bytes.append(7)  // month
        bytes.append(24) // day
        bytes.append(10) // hour
        bytes.append(15) // minute
        bytes.append(0)  // second
        bytes.append(contentsOf: [0x48, 0x00]) // pulse 72
        return Data(bytes)
    }

    func testParsesFullMeasurement() throws {
        let parsed = try BloodPressureMeasurementParser.parse(sampleMeasurementBytes())
        XCTAssertEqual(parsed.systolic, 120)
        XCTAssertEqual(parsed.diastolic, 80)
        XCTAssertEqual(parsed.meanArterialPressure, 93)
        XCTAssertEqual(parsed.pulseRateBpm, 72)
        XCTAssertEqual(parsed.unit, .mmHg)

        let components = Calendar(identifier: .gregorian).dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: try XCTUnwrap(parsed.timestamp)
        )
        XCTAssertEqual(components.year, 2026)
        XCTAssertEqual(components.month, 7)
        XCTAssertEqual(components.day, 24)
        XCTAssertEqual(components.hour, 10)
        XCTAssertEqual(components.minute, 15)
    }

    func testParsesMinimalMeasurementWithoutOptionalFields() throws {
        var bytes: [UInt8] = [0b0000_0000] // no optional fields, mmHg
        bytes.append(contentsOf: [0x78, 0x00]) // systolic 120
        bytes.append(contentsOf: [0x50, 0x00]) // diastolic 80
        bytes.append(contentsOf: [0x5D, 0x00]) // MAP 93

        let parsed = try BloodPressureMeasurementParser.parse(Data(bytes))
        XCTAssertEqual(parsed.systolic, 120)
        XCTAssertEqual(parsed.diastolic, 80)
        XCTAssertNil(parsed.timestamp)
        XCTAssertNil(parsed.pulseRateBpm)
    }

    func testThrowsOnTruncatedPayload() {
        let bytes = Data([0b0000_0000, 0x78]) // cut off mid-systolic
        XCTAssertThrowsError(try BloodPressureMeasurementParser.parse(bytes))
    }

    func testConvertsKPaToMmHg() throws {
        var bytes: [UInt8] = [0b0000_0001] // kPa unit flag set
        bytes.append(contentsOf: [0x78, 0x00]) // 120 kPa (nonsensical value, just testing conversion math)
        bytes.append(contentsOf: [0x50, 0x00]) // 80 kPa
        bytes.append(contentsOf: [0x5D, 0x00])

        let parsed = try BloodPressureMeasurementParser.parse(Data(bytes))
        let mmHg = BloodPressureMeasurementParser.mmHg(from: parsed)
        XCTAssertEqual(mmHg.systolic, Int((120.0 * 7.50062).rounded()))
        XCTAssertEqual(mmHg.diastolic, Int((80.0 * 7.50062).rounded()))
    }
}
