import SwiftUI
import VitalTrackDesignSystem

/// WidgetKit placeholders (Lock Screen / Home Screen). Ship as descriptions until a Widget extension target is added.
struct LatestBPWidgetPlaceholderView: View {
    var systolic: Int = 118
    var diastolic: Int = 76

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("VitalTrack AI")
                .font(.caption.weight(.semibold))
                .foregroundStyle(VTColors.brandPrimary)
            Text("\(systolic)/\(diastolic)")
                .font(.title.monospacedDigit().weight(.bold))
            Text("mmHg · external monitor")
                .font(.caption2)
                .foregroundStyle(VTColors.textSecondary)
            Text("Not camera-estimated")
                .font(.caption2)
                .foregroundStyle(VTColors.textTertiary)
        }
        .padding()
        .containerRelativeFrame([.horizontal, .vertical])
        .background(VTColors.subtle)
        .accessibilityLabel("Latest blood pressure \(systolic) over \(diastolic) from an external monitor")
    }
}

struct LatestHRWidgetPlaceholderView: View {
    var bpm: Int = 72

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Heart rate")
                .font(.caption.weight(.semibold))
            Text("\(bpm) BPM")
                .font(.title.monospacedDigit().weight(.bold))
            Text("PPG / Health · not BP")
                .font(.caption2)
                .foregroundStyle(VTColors.textSecondary)
        }
        .padding()
        .background(VTColors.canvas)
    }
}

#Preview("BP Widget") {
    LatestBPWidgetPlaceholderView()
}

#Preview("HR Widget") {
    LatestHRWidgetPlaceholderView()
}
