import XCTest
@testable import VitalTrackCore

final class BPCategoryTests: XCTestCase {
    func testNormalClassification() {
        XCTAssertEqual(BPCategory.classify(systolic: 115, diastolic: 75), .normal)
    }

    func testElevated() {
        XCTAssertEqual(BPCategory.classify(systolic: 125, diastolic: 75), .elevated)
    }

    func testStage1() {
        XCTAssertEqual(BPCategory.classify(systolic: 132, diastolic: 82), .hypertensionStage1)
    }

    func testCrisis() {
        XCTAssertEqual(BPCategory.classify(systolic: 185, diastolic: 110), .hypertensiveCrisis)
    }

    func testCameraRejectedAsBPSource() {
        XCTAssertFalse(MeasurementSource.cameraPPG.isValidBloodPressureSource)
        XCTAssertFalse(MeasurementSource.appleWatch.isValidBloodPressureSource)
        XCTAssertThrowsError(try BloodPressureReading.validateSource(.cameraPPG))
    }

    func testValidBPSources() {
        XCTAssertTrue(MeasurementSource.manual.isValidBloodPressureSource)
        XCTAssertTrue(MeasurementSource.bluetoothCuff.isValidBloodPressureSource)
        XCTAssertTrue(MeasurementSource.healthKit.isValidBloodPressureSource)
        XCTAssertTrue(MeasurementSource.csvImport.isValidBloodPressureSource)
    }

    func testErrorRecoverySuggestionMentionsFDACleared() {
        let error = VitalTrackError.invalidBloodPressureSource(.cameraPPG)
        XCTAssertTrue(error.recoverySuggestion?.contains("FDA-cleared") == true)
    }
}
