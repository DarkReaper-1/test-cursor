# Spider Swing 3D — iOS

A native **3D Spider-Man web-swinging game** for iOS, built with **Swift + SceneKit**.

## Requirements

- Xcode 15+
- iOS 16.0+ (iPhone & iPad)
- Metal-capable device

## Open & Run

1. Open `SpiderSwing3D.xcodeproj` in Xcode
2. Select your iPhone or iPad simulator / device
3. Set your **Development Team** in Signing & Capabilities
4. Press **Run** (⌘R)

> **Note:** Landscape orientation only — rotate simulator with ⌘← / ⌘→

## Controls

| Input | Action |
|-------|--------|
| **Left joystick** | Move left / right |
| **↑ Jump button** | Jump (wall-jump when on building side) |
| **Hold right side of screen** | Aim & shoot web at nearest building |
| **Release** | Let go of web |

## Features

- **3D procedural city** — buildings with lit windows and distant skyline
- **Spider-Man character** — built from SceneKit primitives (red/blue suit, mask)
- **Web-swing physics** — pendulum rope constraint with momentum
- **Third-person camera** — follows player, pulls back while swinging
- **Touch HUD** — joystick, jump button, crosshair, swing counter, speed meter
- **Auto-respawn** — fall off the map and respawn on the first rooftop

## Project Structure

```
SpiderSwing3D/
├── App/                  App & Scene delegates
├── Game/
│   ├── GameViewController.swift   Main view + render loop
│   ├── GameScene.swift            Scene setup & physics tick
│   ├── PlayerNode.swift           3D Spider-Man character
│   ├── WebController.swift        Web line + swing physics
│   ├── CityGenerator.swift        Procedural 3D buildings
│   ├── CameraController.swift     Third-person follow cam
│   ├── TouchInputManager.swift    iOS touch handling
│   └── PhysicsCategories.swift
├── UI/
│   └── GameHUD.swift              On-screen controls overlay
└── Resources/
    ├── Info.plist
    ├── LaunchScreen.storyboard
    └── Assets.xcassets
```

## Web Preview Demo

A browser-based 3D preview (mirrors iOS gameplay) lives in `/demo/`. Use it to preview mechanics without a Mac:

```bash
python3 -m http.server 8080
# → http://localhost:8080/demo/
```

The preview uses Three.js with an iPhone landscape frame and identical HUD layout.
