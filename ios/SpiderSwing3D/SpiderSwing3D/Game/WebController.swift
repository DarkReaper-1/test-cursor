import SceneKit

final class WebController {
    private(set) var isActive = false
    private(set) var anchor = SCNVector3Zero
    private(set) var ropeLength: Float = 0
    private(set) var swingCount = 0

    let webLineNode = SCNNode()

    init() {
        let cylinder = SCNCylinder(radius: 0.03, height: 1)
        cylinder.firstMaterial?.diffuse.contents = UIColor(white: 0.92, alpha: 0.85)
        cylinder.firstMaterial?.emission.contents = UIColor(white: 0.5, alpha: 0.3)
        webLineNode.geometry = cylinder
        webLineNode.isHidden = true
    }

    func attach(to anchorPoint: SCNVector3, from playerPoint: SCNVector3) {
        anchor = anchorPoint
        let dx = playerPoint.x - anchor.x
        let dy = playerPoint.y - anchor.y
        let dz = playerPoint.z - anchor.z
        ropeLength = sqrt(dx * dx + dy * dy + dz * dz)
        isActive = true
        swingCount += 1
        webLineNode.isHidden = false
    }

    func release() {
        isActive = false
        webLineNode.isHidden = true
    }

    func updateLine(from playerPoint: SCNVector3) {
        guard isActive else { return }

        let mid = SCNVector3(
            (playerPoint.x + anchor.x) * 0.5,
            (playerPoint.y + anchor.y) * 0.5,
            (playerPoint.z + anchor.z) * 0.5
        )
        webLineNode.position = mid

        let dx = playerPoint.x - anchor.x
        let dy = playerPoint.y - anchor.y
        let dz = playerPoint.z - anchor.z
        let length = sqrt(dx * dx + dy * dy + dz * dz)

        webLineNode.scale = SCNVector3(1, length, 1)
        webLineNode.look(at: anchor, up: SCNVector3(0, 1, 0), localFront: SCNVector3(0, 1, 0))
    }

    func applySwingPhysics(
        player: PlayerNode,
        deltaTime: Float,
        inputDirection: Float
    ) {
        guard isActive else { return }

        let gravity: Float = -18
        player.velocity.y += gravity * deltaTime * 0.85

        var pos = player.position
        pos.x += player.velocity.x * deltaTime
        pos.y += player.velocity.y * deltaTime
        pos.z += player.velocity.z * deltaTime

        let attach = player.webAttachPoint
        let dx = attach.x - anchor.x
        let dy = attach.y - anchor.y
        let dz = attach.z - anchor.z
        let dist = sqrt(dx * dx + dy * dy + dz * dz)

        if dist > ropeLength {
            let nx = dx / dist
            let ny = dy / dist
            let nz = dz / dist

            let correctedAttach = SCNVector3(
                anchor.x + nx * ropeLength,
                anchor.y + ny * ropeLength,
                anchor.z + nz * ropeLength
            )
            pos = SCNVector3(
                correctedAttach.x,
                correctedAttach.y - 0.75,
                correctedAttach.z
            )

            let vDotN = player.velocity.x * nx + player.velocity.y * ny + player.velocity.z * nz
            if vDotN > 0 {
                player.velocity.x -= vDotN * nx
                player.velocity.y -= vDotN * ny
                player.velocity.z -= vDotN * nz
            }

            let tx = -nz
            let ty: Float = 0
            let tz = nx
            if abs(inputDirection) > 0.1 {
                player.velocity.x += tx * inputDirection * 6 * deltaTime
                player.velocity.z += tz * inputDirection * 6 * deltaTime
            }

            player.animateSwing(intensity: inputDirection)
        }

        player.velocity.x *= 0.998
        player.velocity.y *= 0.998
        player.velocity.z *= 0.998
        player.position = pos
        updateLine(from: player.webAttachPoint)
    }
}
