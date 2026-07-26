import Foundation

/// Plain-language learning articles for adults 40+. Informational only.
public enum LearningCatalog {
    public static let articles: [LearningArticle] = [
        LearningArticle(
            topic: .understandingBP,
            title: "What do the two numbers mean?",
            summary: "Systolic and diastolic explained in everyday words.",
            body: """
            Blood pressure is written as two numbers, like 120/80.

            The top number (systolic) is the pressure when your heart squeezes.
            The bottom number (diastolic) is the pressure when your heart rests between beats.

            Both matter. Categories you see in apps are reference ranges only — not a diagnosis. Your clinician interprets what your numbers mean for you.
            """,
            minutesToRead: 2
        ),
        LearningArticle(
            topic: .understandingBP,
            title: "How to measure at home",
            summary: "A calm, step-by-step cuff routine.",
            body: """
            1. Sit quietly for 5 minutes with feet flat on the floor.
            2. Rest your arm on a table at heart level.
            3. Use an FDA-cleared upper-arm cuff that fits.
            4. Take 2 readings, one minute apart, and note both.
            5. Avoid caffeine and exercise for 30 minutes beforehand when possible.

            Phone cameras cannot measure blood pressure. Always use an external monitor.
            """,
            minutesToRead: 3
        ),
        LearningArticle(
            topic: .heartBasics,
            title: "Heart health basics for adults 40+",
            summary: "Sleep, movement, and calm routines matter over years.",
            body: """
            Healthy habits that often support heart wellness include regular walking, steady sleep, managing stress, not smoking, and eating more whole foods with less salt.

            Trends over weeks matter more than one reading. Share patterns with your clinician. This app does not diagnose or treat heart disease.
            """,
            minutesToRead: 3
        ),
        LearningArticle(
            topic: .medication,
            title: "Working with blood pressure medication",
            summary: "Reminders help; never change doses on your own.",
            body: """
            Many people take daily medication for blood pressure. Logging doses and before/after readings can help conversations with your clinician.

            Do not start, stop, or change medication based on an app. If you miss a dose, follow the instructions your clinician or pharmacist gave you.
            """,
            minutesToRead: 2
        ),
        LearningArticle(
            topic: .healthyEating,
            title: "Eating patterns that often help",
            summary: "Less sodium, more plants — without scare tactics.",
            body: """
            Eating patterns similar to DASH-style diets emphasize vegetables, fruit, whole grains, lean proteins, and less ultra-processed salty food.

            You do not need a perfect day. Small swaps — less restaurant salt, more home-cooked meals — add up. Personal nutrition plans belong with your clinician or dietitian.
            """,
            minutesToRead: 3
        ),
        LearningArticle(
            topic: .exercise,
            title: "Movement that fits real life",
            summary: "Walking counts. Start where you are.",
            body: """
            Many adults benefit from about 150 minutes of moderate activity per week, such as brisk walking — but any safe movement is a start.

            If you have heart disease, joint pain, or new symptoms with exercise, ask your clinician what is safe for you before increasing intensity.
            """,
            minutesToRead: 2
        ),
        LearningArticle(
            topic: .stress,
            title: "Calming stress without overwhelm",
            summary: "Slow breathing and short breaks help many people.",
            body: """
            Stress can raise blood pressure for some people. Simple tools include slow breathing (in for 4, out for 6), a short walk, or calling a friend.

            Persistent anxiety or panic deserves professional support. Apps can coach habits; they do not replace therapy or medical care.
            """,
            minutesToRead: 2
        ),
        LearningArticle(
            topic: .stress,
            title: "What stress & anxiety scores mean",
            summary: "1–10 self-ratings for patterns — not a diagnosis.",
            body: """
            VitalTrack AI’s Measure stress screen asks how stressed and how anxious you feel right now, each from 1 to 10.

            These numbers are your words in number form. They help you notice patterns with sleep, pulse, and blood pressure. They are not a clinical anxiety test and do not diagnose an anxiety disorder.

            If scores stay high, panic feels overwhelming, or daily life is hard, talk with a clinician or counselor. Use emergency services for thoughts of self-harm or a medical emergency.
            """,
            minutesToRead: 2
        ),
        LearningArticle(
            topic: .sleep,
            title: "Sleep and blood pressure",
            summary: "Rest supports healthier day-to-day readings for many people.",
            body: """
            Aim for a steady bedtime and enough hours for you. Poor sleep can coincide with higher readings for some people.

            If you snore loudly, gasp at night, or feel very sleepy by day, mention it to a clinician — sleep apnea can affect blood pressure.
            """,
            minutesToRead: 2
        ),
        LearningArticle(
            topic: .faq,
            title: "Can a phone camera measure blood pressure?",
            summary: "No — and VitalTrack AI will never claim that.",
            body: """
            Camera and Watch light sensors can estimate heart rate (pulse). They cannot measure blood pressure.

            VitalTrack AI only tracks BP readings you enter from an FDA-cleared blood pressure monitor (manual, Bluetooth cuff, Apple Health import, or CSV).
            """,
            minutesToRead: 1
        ),
        LearningArticle(
            topic: .faq,
            title: "When should I seek urgent help?",
            summary: "Stay calm. Know the difference between logging and emergencies.",
            body: """
            If you have chest pain, trouble breathing, sudden weakness, confusion, or the worst headache of your life — call local emergency services.

            Very high readings without symptoms still deserve a calm call to your clinician or advice nurse. An app cannot decide emergencies for you.
            """,
            minutesToRead: 2
        )
    ]

    public static func articles(for topic: LearningTopic) -> [LearningArticle] {
        articles.filter { $0.topic == topic }
    }
}
