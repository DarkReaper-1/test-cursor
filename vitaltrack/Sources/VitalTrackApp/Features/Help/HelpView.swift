import SwiftUI

struct HelpView: View {
    private let faqs: [(String, String)] = [
        ("Can VitalTrack measure my blood pressure with my camera or finger?",
         "No. This app tracks blood pressure readings that you obtain from an FDA-cleared blood pressure monitor — no phone camera, fingerprint sensor, or built-in sensor can measure blood pressure. Anything claiming otherwise isn't accurate."),
        ("How accurate is the heart rate measurement?",
         "Camera-based pulse measurement (PPG) is generally accurate to within a few beats per minute of a chest strap when your finger placement is steady and you're not moving. The in-app signal-quality indicator tells you when a reading is trustworthy."),
        ("Why does the app ask for Bluetooth access?",
         "Only if you choose to connect a Bluetooth blood pressure monitor or scale in Devices. If you never open that screen, Bluetooth is never used."),
        ("Does VitalTrack sell or share my health data?",
         "No. There's no ad tracking and no data sale. Apple Health sync and iCloud sync are both off by default and only active if you turn them on."),
        ("What happens if my Bluetooth monitor disconnects mid-reading?",
         "The Devices screen shows what happened and a specific next step — for example, moving closer or turning the cuff back on — rather than a generic error."),
        ("How do I cancel my subscription?",
         "Through your Apple ID subscription settings (Settings app > your name > Subscriptions), the same as any App Store subscription. VitalTrack doesn't charge you directly or store payment details."),
    ]

    var body: some View {
        List {
            ForEach(faqs, id: \.0) { question, answer in
                DisclosureGroup(question) {
                    Text(answer).font(.subheadline).foregroundStyle(.secondary).padding(.top, 4)
                }
            }
        }
        .navigationTitle("Help & FAQ")
    }
}
