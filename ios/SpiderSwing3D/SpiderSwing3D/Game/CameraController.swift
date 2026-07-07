import SceneKit

final class CameraController {
    let node = SCNNode()
    private let camera = SCNCamera()

    private var targetPosition = SCNVector3Zero
    private var smoothness: Float = 6

    init() {
        camera.fieldOfView = 65
        camera.zNear = 0.1
        camera.zFar = 500
        camera.wantsHDR = true
        camera.wantsExposureAdaptation = true
        node.camera = camera
        node.position = SCNVector3(0, 8, 14)
        node.eulerAngles = SCNVector3(-0.35, 0, 0)
    }

    func follow(player: PlayerNode, deltaTime: Float, isSwinging: Bool) {
        let offsetZ: Float = isSwinging ? 16 : 12
        let offsetY: Float = isSwinging ? 7 : 5
        let offsetX: Float = -3

        targetPosition = SCNVector3(
            player.position.x + offsetX,
            player.position.y + offsetY,
            player.position.z + offsetZ
        )

        let t = min(1, smoothness * deltaTime)
        node.position = SCNVector3(
            node.position.x + (targetPosition.x - node.position.x) * t,
            node.position.y + (targetPosition.y - node.position.y) * t,
            node.position.z + (targetPosition.z - node.position.z) * t
        )

        let lookTarget = SCNVector3(
            player.position.x + player.velocity.x * 0.3,
            player.position.y + 1.2,
            player.position.z + player.velocity.z * 0.3
        )
        node.look(at: lookTarget, up: SCNVector3(0, 1, 0), localFront: SCNVector3(0, 0, -1))
    }
}
