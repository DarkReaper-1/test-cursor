import XCTest
@testable import VitalTrackCore

final class TrustPolicyTests: XCTestCase {
    func testCameraNeverAllowedForBP() {
        XCTAssertFalse(TrustPolicy.isCameraAllowedForBloodPressure())
    }

    func testDisclaimersPresent() {
        XCTAssertTrue(TrustPolicy.medicalDisclaimer.lowercased().contains("not medical advice"))
        XCTAssertTrue(TrustPolicy.bloodPressureSourceDisclaimer.contains("FDA-cleared"))
        XCTAssertTrue(TrustPolicy.heartRatePPGDisclaimer.contains("PPG"))
    }
}
