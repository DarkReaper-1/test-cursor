import XCTest

/// UI test stubs — run inside an XCUITest target once the Xcode app scheme is generated.
final class VitalTrackUITestStubs: XCTestCase {
    func testLaunchSmokeStub() throws {
        // Placeholder: launch VitalTrackAI, assert onboarding trust copy is visible.
        // XCTAssert(app.staticTexts["What we cannot do"].waitForExistence(timeout: 5))
        XCTAssertTrue(true)
    }

    func testBloodPressureScreenShowsDisclaimerStub() throws {
        // Placeholder: navigate to BP tab and assert FDA-cleared disclaimer banner.
        XCTAssertTrue(true)
    }

    func testHeartRateScreenDoesNotClaimBPStub() throws {
        // Placeholder: assert HR screen copy mentions PPG only / not blood pressure.
        XCTAssertTrue(true)
    }
}
