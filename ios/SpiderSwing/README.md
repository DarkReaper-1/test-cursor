# Spider Swing — iOS (3D)

Native **3D Spider-Man web-swing** game for iPhone & iPad. Built from scratch with **Swift + SceneKit**.

## Run

1. Open `SpiderSwing.xcodeproj` in Xcode 15+
2. Set your Development Team under Signing & Capabilities
3. Run on a simulator or device (landscape only — ⌘← / ⌘→)

## Controls

| Touch | Action |
|-------|--------|
| Left stick | Move |
| ↑ button | Jump |
| Hold right side | Shoot web & swing |
| Release | Drop web |

## What’s inside

- Procedural 3D city (lit windows, roof ledges, distant skyline)
- Spider-Man hero from SceneKit primitives
- Pendulum web-swing physics with aim-biased anchors
- Chase camera that pulls back while swinging
- Touch HUD: stick, jump, crosshair, swings, speed

```
SpiderSwing/
├── App/          AppDelegate, SceneDelegate
├── Game/         World, Hero, Web, City, Camera, Controls
├── UI/           HUDView
└── Resources/    Info.plist, LaunchScreen, Assets
```
