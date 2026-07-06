# Spider-Man Web Swing

A basic browser-based Spider-Man web-swinging game built with HTML5 Canvas.

## Play

Open `index.html` in a browser, or run a local server:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

## Controls

| Input | Action |
|-------|--------|
| **A / D** or **← / →** | Move left / right |
| **Space** | Jump (also wall-jump when on a building side) |
| **Click** | Shoot web at a building and start swinging |
| **Release click** | Let go of the web |

## Features

- Procedural city skyline with lit windows
- Web-swing physics (pendulum-style rope constraint)
- Wall climbing and rooftop landing
- Side-scrolling camera that follows Spider-Man
- Auto-respawn if you fall off the map

Swing from building to building and see how far you can go!
