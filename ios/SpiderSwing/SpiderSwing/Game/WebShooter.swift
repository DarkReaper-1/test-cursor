import SceneKit
import UIKit

/// Web line + pendulum swing constraint.
final class WebShooter {
    private(set) var active = false
    private(set) var anchor = SCNVector3Zero
    private(set) var length: Float = 0
    private(set) var swings = 0

    let lineNode = SCNNode()

    init() {
        let cyl = SCNCylinder(radius: 0.028, height: 1)
        cyl.firstMaterial?.diffuse.contents = UIColor(white: 0.94, alpha: 0.9)
        cyl.firstMaterial?.emission.contents = UIColor(white: 0.45, alpha: 0.25)
        lineNode.geometry = cyl
        lineNode.isHidden = true
    }

    func attach(to point: SCNVector3, from hand: SCNVector3) {
        anchor = point
        let dx = hand.x - point.x
        let dy = hand.y - point.y
        let dz = hand.z - point.z
        length = sqrt(dx * dx + dy * dy + dz * dz)
        active = true
        swings += 1
        lineNode.isHidden = false
        redraw(from: hand)
    }

    func release() {
        active = false
        lineNode.isHidden = true
    }

    func redraw(from hand: SCNVector3) {
        guard active else { return }
        let mid = SCNVector3(
            (hand.x + anchor.x) * 0.5,
            (hand.y + anchor.y) * 0.5,
            (hand.z + anchor.z) * 0.5
        )
        lineNode.position = mid
        let dx = hand.x - anchor.x
        let dy = hand.y - anchor.y
        let dz = hand.z - anchor.z
        let dist = sqrt(dx * dx + dy * dy + dz * dz)
        lineNode.scale = SCNVector3(1, dist, 1)
        lineNode.look(at: anchor, up: SCNVector3(0, 1, 0), localFront: SCNVector3(0, 1, 0))
    }

    /// Apply gravity + rope constraint for one frame.
    func swing(hero: SpiderHero, dt: Float, steer: Float) {
        guard active else { return }

        hero.velocity.y += -18 * dt * 0.88

        var p = hero.position
        p.x += hero.velocity.x * dt
        p.y += hero.velocity.y * dt
        p.z += hero.velocity.z * dt
        hero.position = p

        let hand = hero.webHand
        let toHand = SCNVector3(hand.x - anchor.x, hand.y - anchor.y, hand.z - anchor.z)
        let dist = toHand.length()

        if dist > length {
            let n = toHand.normalized()
            let corrected = SCNVector3(
                anchor.x + n.x * length,
                anchor.y + n.y * length,
                anchor.z + n.z * length
            )
            hero.position = SCNVector3(corrected.x, corrected.y - 0.8, corrected.z)

            let vDot = hero.velocity.dot(n)
            if vDot > 0 {
                hero.velocity.x -= vDot * n.x
                hero.velocity.y -= vDot * n.y
                hero.velocity.z -= vDot * n.z
            }

            // Lateral boost while swinging
            if abs(steer) > 0.1 {
                let tangent = SCNVector3(-n.z, 0, n.x)
                hero.velocity.x += tangent.x * steer * 7 * dt
                hero.velocity.z += tangent.z * steer * 7 * dt
            }
        }

        hero.velocity.x *= 0.997
        hero.velocity.y *= 0.997
        hero.velocity.z *= 0.997
        redraw(from: hero.webHand)
    }
}
