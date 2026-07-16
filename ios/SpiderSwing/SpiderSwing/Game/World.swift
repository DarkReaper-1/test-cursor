import SceneKit
import UIKit

protocol WorldDelegate: AnyObject {
    func worldUpdated(swings: Int, speed: Float, status: String)
}

/// Core gameplay loop: city + hero + web + camera.
final class World: SCNScene {
    weak var delegate: WorldDelegate?

    let hero = SpiderHero()
    let city = CityBuilder()
    let web = WebShooter()
    let camera = ChaseCamera()

    private var lastTime: TimeInterval = 0
    private var steer: Float = 0
    private var wantShoot = false
    private var wantRelease = false
    private var wantJump = false
    private var aimWorld = SCNVector3(20, 20, 0)

    override init() {
        super.init()
        lighting()
        city.build()
        rootNode.addChildNode(city.root)
        rootNode.addChildNode(hero)
        rootNode.addChildNode(web.lineNode)
        rootNode.addChildNode(camera.node)

        let spawnY = city.roofAt(x: 8, z: 0) + 1.3
        hero.position = SCNVector3(8, spawnY, 0)
        background.contents = UIColor(red: 0.035, green: 0.05, blue: 0.12, alpha: 1)
        physicsWorld.gravity = SCNVector3(0, -18, 0)
    }

    required init?(coder: NSCoder) { fatalError() }

    func feed(steer: Float, webHeld: Bool, aim: CGPoint, viewSize: CGSize, jump: Bool) {
        self.steer = steer
        wantJump = jump
        if webHeld && !web.active {
            wantShoot = true
            let ndcX = (Float(aim.x) / Float(viewSize.width)) * 2 - 1
            let ndcY = 1 - (Float(aim.y) / Float(viewSize.height)) * 2
            aimWorld = SCNVector3(
                hero.position.x + 25 + ndcX * 12,
                hero.position.y + 8 + ndcY * 10,
                hero.position.z
            )
        } else if !webHeld && web.active {
            wantRelease = true
        }
    }

    func tick(at time: TimeInterval) {
        let dt = lastTime == 0 ? 0.016 : Float(min(time - lastTime, 0.05))
        lastTime = time

        if wantShoot {
            if let a = city.bestAnchor(near: hero.webHand, aim: aimWorld) {
                web.attach(to: a, from: hero.webHand)
            }
            wantShoot = false
        }
        if wantRelease {
            web.release()
            wantRelease = false
        }

        if web.active {
            web.swing(hero: hero, dt: dt, steer: steer)
        } else {
            freeMove(dt: dt)
        }

        hero.face(toward: abs(steer) > 0.1 ? steer : hero.velocity.x)

        if hero.position.y < -12 { respawn() }

        camera.track(hero: hero, dt: dt, swinging: web.active)

        let speed = hero.velocity.length()
        let status: String
        if web.active { status = "Swinging!" }
        else if hero.grounded { status = "Ready to swing" }
        else { status = "Airborne" }
        delegate?.worldUpdated(swings: web.swings, speed: speed, status: status)
    }

    private func freeMove(dt: Float) {
        hero.velocity.y += -18 * dt
        if abs(steer) > 0.1 {
            hero.velocity.x += steer * 16 * dt
            hero.velocity.z += steer * 3.5 * dt
        }
        hero.velocity.x *= 0.90
        hero.velocity.z *= 0.90

        var p = hero.position
        p.x += hero.velocity.x * dt
        p.y += hero.velocity.y * dt
        p.z += hero.velocity.z * dt

        let roof = city.roofAt(x: p.x, z: p.z)
        hero.grounded = false
        if p.y <= roof + 1.15 {
            p.y = roof + 1.15
            hero.velocity.y = 0
            hero.grounded = true
        }

        if wantJump && hero.grounded {
            hero.velocity.y = 11
            hero.velocity.x += hero.facing * 3.5
            hero.grounded = false
            wantJump = false
        }

        hero.position = p
    }

    private func respawn() {
        hero.position = SCNVector3(8, city.roofAt(x: 8, z: 0) + 1.3, 0)
        hero.velocity = SCNVector3Zero
        web.release()
    }

    private func lighting() {
        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.color = UIColor(white: 0.32, alpha: 1)
        rootNode.addChildNode(ambient)

        let sun = SCNNode()
        sun.light = SCNLight()
        sun.light?.type = .directional
        sun.light?.color = UIColor(red: 1, green: 0.94, blue: 0.84, alpha: 1)
        sun.light?.intensity = 950
        sun.light?.castsShadow = true
        sun.eulerAngles = SCNVector3(-0.55, 0.35, 0)
        rootNode.addChildNode(sun)

        let fill = SCNNode()
        fill.light = SCNLight()
        fill.light?.type = .directional
        fill.light?.color = UIColor(red: 0.35, green: 0.45, blue: 0.75, alpha: 1)
        fill.light?.intensity = 280
        fill.eulerAngles = SCNVector3(-0.25, -1.1, 0)
        rootNode.addChildNode(fill)
    }
}
