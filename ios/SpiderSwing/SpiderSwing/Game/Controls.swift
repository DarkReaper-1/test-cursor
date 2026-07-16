import UIKit

struct ControlState {
    var stick = CGPoint.zero
    var webHeld = false
    var aim = CGPoint.zero
    var jumpQueued = false
}

/// Dual-zone touch: left = move stick, right = web aim.
final class Controls {
    private(set) var state = ControlState()
    private var stickTouch: UITouch?
    private var webTouch: UITouch?
    private let stickRadius: CGFloat = 52

    var steer: Float {
        Float(state.stick.x / stickRadius).clamped(to: -1...1)
    }

    func began(_ touches: Set<UITouch>, in view: UIView) {
        for t in touches {
            let p = t.location(in: view)
            if p.x < view.bounds.width * 0.42 {
                stickTouch = t
                updateStick(t, in: view)
            } else {
                webTouch = t
                state.webHeld = true
                state.aim = p
            }
        }
    }

    func moved(_ touches: Set<UITouch>, in view: UIView) {
        for t in touches {
            if t === stickTouch { updateStick(t, in: view) }
            if t === webTouch { state.aim = t.location(in: view) }
        }
    }

    func ended(_ touches: Set<UITouch>) {
        for t in touches {
            if t === stickTouch {
                stickTouch = nil
                state.stick = .zero
            }
            if t === webTouch {
                webTouch = nil
                state.webHeld = false
            }
        }
    }

    func queueJump() { state.jumpQueued = true }

    func consumeJump() -> Bool {
        defer { state.jumpQueued = false }
        return state.jumpQueued
    }

    private func updateStick(_ t: UITouch, in view: UIView) {
        let center = CGPoint(x: 88, y: view.bounds.height - 115)
        var d = CGPoint(x: t.location(in: view).x - center.x,
                        y: t.location(in: view).y - center.y)
        let len = hypot(d.x, d.y)
        if len > stickRadius {
            d.x = d.x / len * stickRadius
            d.y = d.y / len * stickRadius
        }
        state.stick = d
    }
}

private extension Comparable {
    func clamped(to range: ClosedRange<Self>) -> Self {
        min(max(self, range.lowerBound), range.upperBound)
    }
}
