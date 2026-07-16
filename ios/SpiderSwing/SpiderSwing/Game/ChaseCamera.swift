import SceneKit

final class ChaseCamera {
    let node = SCNNode()
    private let cam = SCNCamera()

    init() {
        cam.fieldOfView = 62
        cam.zNear = 0.1
        cam.zFar = 450
        cam.wantsHDR = true
        node.camera = cam
        node.position = SCNVector3(0, 9, 15)
    }

    func track(hero: SpiderHero, dt: Float, swinging: Bool) {
        let lookAhead = swinging ? 16 : 12
        let height: Float = swinging ? 7.5 : 5.5
        let desired = SCNVector3(
            hero.position.x - 2.5,
            hero.position.y + height,
            hero.position.z + Float(lookAhead)
        )
        let t = min(1, 5.5 * dt)
        node.position = SCNVector3(
            node.position.x + (desired.x - node.position.x) * t,
            node.position.y + (desired.y - node.position.y) * t,
            node.position.z + (desired.z - node.position.z) * t
        )
        let look = SCNVector3(
            hero.position.x + hero.velocity.x * 0.25,
            hero.position.y + 1.1,
            hero.position.z + hero.velocity.z * 0.25
        )
        node.look(at: look, up: SCNVector3(0, 1, 0), localFront: SCNVector3(0, 0, -1))
    }
}
