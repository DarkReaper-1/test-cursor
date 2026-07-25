import XCTest
@testable import VitalTrackCore

final class TrustPolicyTests: XCTestCase {
    func testCameraNeverAllowedForBP() {
        XCTAssertFalse(TrustPolicy.isCameraAllowedForBloodPressure())
    }

    func testDisclaimersPresent() {
        XCTAssertTrue(TrustPolicy.medicalDisclaimer.lowercased().contains("not medical advice"))
        XCTAssertEqual(
            TrustPolicy.bloodPressureSourceDisclaimer,
            "This app tracks blood pressure readings that you obtain from an FDA-cleared blood pressure monitor."
        )
        XCTAssertTrue(TrustPolicy.heartRatePPGDisclaimer.contains("PPG"))
    }
}
