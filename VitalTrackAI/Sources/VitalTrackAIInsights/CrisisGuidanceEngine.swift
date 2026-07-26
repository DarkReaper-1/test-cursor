import Foundation
import VitalTrackCore

/// Calm guidance for concerning BP ranges. Never panics. Never diagnoses.
public struct CrisisGuidanceEngine: CrisisGuidanceComputing {
    private let safety = InsightSafetyFilter()

    public init() {}

    public func severity(for reading: BloodPressureReading) -> CrisisSeverity {
        switch reading.category {
        case .hypertensiveCrisis: return .crisisRange
        case .hypertensionStage2: return .elevatedAttention
        default: return .none
        }
    }

    public func guidance(for reading: BloodPressureReading) -> CrisisGuidance? {
        switch severity(for: reading) {
        case .none:
            return nil
        case .elevatedAttention:
            return sanitize(stage2Guidance(reading))
        case .crisisRange:
            return sanitize(crisisGuidance(reading))
        }
    }

    private func stage2Guidance(_ reading: BloodPressureReading) -> CrisisGuidance {
        CrisisGuidance(
            title: "This reading is higher than usual ranges",
            calmSummary: "You logged \(reading.displayValue) mmHg. Stay seated and breathe slowly. One reading is not a diagnosis.",
            whatThisMayMean: "Published adult reference ranges label values like this as Stage 2. Your clinician decides what it means for you — apps only show educational labels.",
            urgentSymptoms: [
                "Chest pain or pressure",
                "Trouble breathing",
                "Sudden weakness, numbness, or confusion",
                "The worst headache of your life",
                "Vision changes or difficulty speaking"
            ],
            whenToCallEmergency: "If any urgent symptoms above appear, call local emergency services right away. Do not wait for another app reading.",
            whenToContactDoctor: "If you feel okay but readings stay high, contact your clinician or advice nurse today — especially if this is new for you or you take blood pressure medication.",
            whatToDoNow: [
                "Sit quietly for 5 minutes and recheck with your FDA-cleared cuff.",
                "Write down both readings and how you feel.",
                "Take medication only as your clinician prescribed — do not double a dose unless told.",
                "Share today’s numbers with your care team if they asked you to report high readings."
            ],
            disclaimer: TrustPolicy.medicalDisclaimer
        )
    }

    private func crisisGuidance(_ reading: BloodPressureReading) -> CrisisGuidance {
        CrisisGuidance(
            title: "Please pause and check how you feel",
            calmSummary: "You logged \(reading.displayValue) mmHg, which is in a published “crisis range.” Stay calm. Focus on symptoms and contacting real people for care — not on the app.",
            whatThisMayMean: "Very high numbers can be serious for some people, especially with symptoms. This label is educational only. Only emergency services and clinicians can evaluate you.",
            urgentSymptoms: [
                "Chest pain or pressure",
                "Shortness of breath",
                "Sudden weakness, numbness, or confusion",
                "Severe headache",
                "Vision changes or difficulty speaking",
                "Back pain with nausea or feeling very unwell"
            ],
            whenToCallEmergency: "If you have any urgent symptoms — or you feel seriously unwell — call local emergency services now. An app cannot replace emergency care.",
            whenToContactDoctor: "If you have no urgent symptoms, call your clinician, on-call nurse, or urgent care promptly for guidance. Recheck once after resting if it is safe to do so.",
            whatToDoNow: [
                "Stop and notice symptoms. If urgent symptoms are present, seek emergency help.",
                "Sit upright, rest, and breathe slowly.",
                "If safe, recheck with your FDA-cleared cuff after 5 minutes and write both results down.",
                "Do not change medication on your own based on this screen."
            ],
            disclaimer: TrustPolicy.medicalDisclaimer
        )
    }

    private func sanitize(_ guidance: CrisisGuidance) -> CrisisGuidance {
        CrisisGuidance(
            title: safety.sanitizeText(guidance.title),
            calmSummary: safety.sanitizeText(guidance.calmSummary),
            whatThisMayMean: safety.sanitizeText(guidance.whatThisMayMean),
            urgentSymptoms: guidance.urgentSymptoms.map { safety.sanitizeText($0) },
            whenToCallEmergency: safety.sanitizeText(guidance.whenToCallEmergency),
            whenToContactDoctor: safety.sanitizeText(guidance.whenToContactDoctor),
            whatToDoNow: guidance.whatToDoNow.map { safety.sanitizeText($0) },
            disclaimer: guidance.disclaimer
        )
    }
}
