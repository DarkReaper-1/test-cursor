import SwiftUI

/// Comfort palette: higher contrast secondary text and clearer strokes for 40+ readers.
public enum VTColors {
    public static let canvas = Color(red: 0.969, green: 0.980, blue: 0.976) // #F7FAF9
    public static let elevated = Color.white
    public static let subtle = Color(red: 0.894, green: 0.937, blue: 0.925) // #E4EFEC
    public static let brandPrimary = Color(red: 0.039, green: 0.373, blue: 0.345) // #0A5F58
    public static let brandPrimaryPressed = Color(red: 0.031, green: 0.298, blue: 0.275)
    public static let brandDeep = Color(red: 0.031, green: 0.298, blue: 0.275) // #084C46
    public static let brandSecondary = Color(red: 0.086, green: 0.247, blue: 0.341) // #163F57
    public static let accentSoft = Color(red: 0.310, green: 0.839, blue: 0.761)
    public static let textPrimary = Color(red: 0.039, green: 0.094, blue: 0.086) // #0A1816
    public static let textSecondary = Color(red: 0.141, green: 0.243, blue: 0.224) // #243E39
    public static let textTertiary = Color(red: 0.227, green: 0.341, blue: 0.318) // #3A5751
    public static let stroke = Color(red: 0.624, green: 0.710, blue: 0.686) // #9FB5AF
    public static let success = Color(red: 0.122, green: 0.420, blue: 0.227)
    public static let warning = Color(red: 0.604, green: 0.384, blue: 0.063)
    public static let danger = Color(red: 0.608, green: 0.110, blue: 0.078)
    public static let info = Color(red: 0.043, green: 0.373, blue: 0.600)
    public static let disclaimerBackground = Color(red: 0.863, green: 0.925, blue: 0.906) // #DCECE7

    public static let canvasGradient = LinearGradient(
        colors: [canvas, subtle.opacity(0.95)],
        startPoint: .top,
        endPoint: .bottom
    )
}
