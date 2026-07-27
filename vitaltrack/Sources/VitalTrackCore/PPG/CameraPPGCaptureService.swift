import AVFoundation
import Foundation

public enum CameraPPGError: Error, LocalizedError {
    case permissionDenied
    case noCameraAvailable
    case configurationFailed(String)

    public var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "VitalTrack needs camera access to measure your pulse. Enable it in Settings > Privacy & Security > Camera."
        case .noCameraAvailable:
            return "No usable camera was found on this device."
        case .configurationFailed(let reason):
            return "Couldn't start the camera: \(reason)"
        }
    }
}

/// Streams the mean luminance of each rear-camera frame while the torch is
/// on, for the `PPGProcessor` to turn into a pulse. Only a per-frame
/// brightness number ever leaves this class — no image or video frame is
/// stored, copied, or exposed anywhere else in the app.
@MainActor
public final class CameraPPGCaptureService: NSObject {
    private let session = AVCaptureSession()
    private let videoQueue = DispatchQueue(label: "vitaltrack.ppg.videoQueue")
    private var device: AVCaptureDevice?
    private var onSample: ((Double, Double) -> Void)?

    public func requestPermissionIfNeeded() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: return true
        case .notDetermined: return await AVCaptureDevice.requestAccess(for: .video)
        default: return false
        }
    }

    public func startMeasuring(onSample: @escaping (Double, Double) -> Void) async throws {
        guard await requestPermissionIfNeeded() else { throw CameraPPGError.permissionDenied }
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            throw CameraPPGError.noCameraAvailable
        }
        self.device = camera
        self.onSample = onSample

        session.beginConfiguration()
        session.sessionPreset = .low

        do {
            let input = try AVCaptureDeviceInput(device: camera)
            if session.canAddInput(input) { session.addInput(input) }
        } catch {
            session.commitConfiguration()
            throw CameraPPGError.configurationFailed(error.localizedDescription)
        }

        let output = AVCaptureVideoDataOutput()
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
        output.setSampleBufferDelegate(self, queue: videoQueue)
        output.alwaysDiscardsLateVideoFrames = true
        if session.canAddOutput(output) { session.addOutput(output) }

        session.commitConfiguration()

        do {
            try camera.lockForConfiguration()
            if camera.hasTorch {
                try camera.setTorchModeOn(level: 1.0)
            }
            camera.unlockForConfiguration()
        } catch {
            // A torch failure shouldn't block measurement entirely; the
            // signal-quality indicator in the UI will reflect the weaker
            // (no-flash) signal rather than a hard failure here.
        }

        session.startRunning()
    }

    public func stopMeasuring() {
        onSample = nil
        session.stopRunning()
        if let device, device.hasTorch, device.torchMode != .off {
            try? device.lockForConfiguration()
            device.torchMode = .off
            device.unlockForConfiguration()
        }
    }
}

extension CameraPPGCaptureService: AVCaptureVideoDataOutputSampleBufferDelegate {
    public nonisolated func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let luminance = Self.meanLuminance(of: pixelBuffer)
        let timestampMs = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer)) * 1000

        Task { @MainActor [weak self] in
            self?.onSample?(timestampMs, luminance)
        }
    }

    /// Mean of the Y (luma) plane, sampling every 4th pixel — cheap enough
    /// to run every frame on low-end hardware while staying stable enough
    /// for peak detection.
    nonisolated private static func meanLuminance(of pixelBuffer: CVPixelBuffer) -> Double {
        CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

        guard let base = CVPixelBufferGetBaseAddressOfPlane(pixelBuffer, 0) else { return 0 }
        let width = CVPixelBufferGetWidthOfPlane(pixelBuffer, 0)
        let height = CVPixelBufferGetHeightOfPlane(pixelBuffer, 0)
        let bytesPerRow = CVPixelBufferGetBytesPerRowOfPlane(pixelBuffer, 0)
        let buffer = base.assumingMemoryBound(to: UInt8.self)

        var sum: Int = 0
        var count: Int = 0
        var row = 0
        while row < height {
            var col = 0
            let rowStart = row * bytesPerRow
            while col < width {
                sum += Int(buffer[rowStart + col])
                count += 1
                col += 4
            }
            row += 2
        }
        return count == 0 ? 0 : Double(sum) / Double(count)
    }
}
