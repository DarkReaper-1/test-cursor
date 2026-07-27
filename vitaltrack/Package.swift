// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "VitalTrack",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "VitalTrackCore", targets: ["VitalTrackCore"]),
        .library(name: "VitalTrackApp", targets: ["VitalTrackApp"]),
    ],
    targets: [
        .target(
            name: "VitalTrackCore",
            dependencies: [],
            path: "Sources/VitalTrackCore"
        ),
        .target(
            name: "VitalTrackApp",
            dependencies: ["VitalTrackCore"],
            path: "Sources/VitalTrackApp"
        ),
        .testTarget(
            name: "VitalTrackCoreTests",
            dependencies: ["VitalTrackCore"],
            path: "Tests/VitalTrackCoreTests"
        ),
    ]
)
