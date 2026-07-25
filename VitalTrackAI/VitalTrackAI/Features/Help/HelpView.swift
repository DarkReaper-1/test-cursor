import SwiftUI
import VitalTrackDesignSystem

struct HelpView: View {
    var body: some View {
        List {
            Section("Getting started") {
                Text(TrustCopy.shortBPBanner)
                Text("Supported BP inputs: manual entry, Bluetooth cuff, Apple Health, or CSV.")
                Text("Use camera PPG or Apple Watch/Health for heart rate only.")
                NavigationLink("FAQ") { FAQView() }
            }
            Section("Trust & safety") {
                Text(TrustCopy.whatWeCannotDo)
                Text(TrustCopy.medicalDisclaimer)
            }
            Section("Support") {
                Text("For medical emergencies, call your local emergency number. VitalTrack AI is not an emergency service.")
            }
        }
        .scrollContentBackground(.hidden)
        .background(VTColors.canvasGradient.ignoresSafeArea())
        .navigationTitle("Help")
    }
}
