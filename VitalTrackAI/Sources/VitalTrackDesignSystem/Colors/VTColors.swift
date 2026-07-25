import SwiftUI

public enum VTColors {
    public static let canvas = Color(red: 0.953, green: 0.969, blue: 0.965) // #F3F7F6
    public static let elevated = Color.white
    public static let subtle = Color(red: 0.906, green: 0.945, blue: 0.937) // #E7F1EF
    public static let brandPrimary = Color(red: 0.059, green: 0.463, blue: 0.431) // #0F766E
    public static let brandPrimaryPressed = Color(red: 0.043, green: 0.373, blue: 0.345)
    public static let brandSecondary = Color(red: 0.114, green: 0.306, blue: 0.420) // #1D4E6B
    public static let accentSoft = Color(red: 0.369, green: 0.918, blue: 0.831)
    public static let textPrimary = Color(red: 0.063, green: 0.133, blue: 0.122)
    public static let textSecondary = Color(red: 0.239, green: 0.353, blue: 0.333)
    public static let textTertiary = Color(red: 0.420, green: 0.522, blue: 0.498)
    public static let stroke = Color(red: 0.788, green: 0.851, blue: 0.835)
    public static let success = Color(red: 0.184, green: 0.490, blue: 0.290)
    public static let warning = Color(red: 0.718, green: 0.475, blue: 0.122)
    public static let danger = Color(red: 0.706, green: 0.137, blue: 0.094)
    public static let info = Color(red: 0.090, green: 0.412, blue: 0.667)
    public static let disclaimerBackground = Color(red: 0.910, green: 0.941, blue: 0.933)

    public static let canvasGradient = LinearGradient(
        colors: [canvas, subtle.opacity(0.9)],
        startPoint: .top,
        endPoint: .bottom
    )
}
