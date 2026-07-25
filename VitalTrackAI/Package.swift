// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "VitalTrackAI",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "VitalTrackCore", targets: ["VitalTrackCore"]),
        .library(name: "VitalTrackData", targets: ["VitalTrackData"]),
        .library(name: "VitalTrackHealthKit", targets: ["VitalTrackHealthKit"]),
        .library(name: "VitalTrackBluetooth", targets: ["VitalTrackBluetooth"]),
        .library(name: "VitalTrackAIInsights", targets: ["VitalTrackAIInsights"]),
        .library(name: "VitalTrackNotifications", targets: ["VitalTrackNotifications"]),
        .library(name: "VitalTrackExport", targets: ["VitalTrackExport"]),
        .library(name: "VitalTrackDesignSystem", targets: ["VitalTrackDesignSystem"]),
        .library(name: "VitalTrackFeatures", targets: ["VitalTrackFeatures"])
    ],
    targets: [
        .target(
            name: "VitalTrackCore",
            path: "Sources/VitalTrackCore"
        ),
        .target(
            name: "VitalTrackData",
            dependencies: ["VitalTrackCore"],
            path: "Sources/VitalTrackData"
        ),
        .target(
            name: "VitalTrackHealthKit",
            dependencies: ["VitalTrackCore"],
            path: "Sources/VitalTrackHealthKit"
        ),
        .target(
            name: "VitalTrackBluetooth",
            dependencies: ["VitalTrackCore"],
            path: "Sources/VitalTrackBluetooth"
        ),
        .target(
            name: "VitalTrackAIInsights",
            dependencies: ["VitalTrackCore"],
            path: "Sources/VitalTrackAIInsights"
        ),
        .target(
            name: "VitalTrackNotifications",
            dependencies: ["VitalTrackCore"],
            path: "Sources/VitalTrackNotifications"
        ),
        .target(
            name: "VitalTrackExport",
            dependencies: ["VitalTrackCore"],
            path: "Sources/VitalTrackExport"
        ),
        .target(
            name: "VitalTrackDesignSystem",
            dependencies: ["VitalTrackCore"],
            path: "Sources/VitalTrackDesignSystem"
        ),
        .target(
            name: "VitalTrackFeatures",
            dependencies: [
                "VitalTrackCore"
            ],
            path: "Sources/VitalTrackFeatures"
        ),
        .testTarget(
            name: "VitalTrackCoreTests",
            dependencies: ["VitalTrackCore"],
            path: "Tests/VitalTrackCoreTests"
        ),
        .testTarget(
            name: "VitalTrackAIInsightsTests",
            dependencies: ["VitalTrackAIInsights", "VitalTrackCore"],
            path: "Tests/VitalTrackAIInsightsTests"
        ),
        .testTarget(
            name: "VitalTrackDataTests",
            dependencies: ["VitalTrackData", "VitalTrackCore"],
            path: "Tests/VitalTrackDataTests"
        ),
        .testTarget(
            name: "VitalTrackExportTests",
            dependencies: ["VitalTrackExport", "VitalTrackCore"],
            path: "Tests/VitalTrackExportTests"
        )
    ]
)
