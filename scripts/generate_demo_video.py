#!/usr/bin/env python3
"""Generate a terminal-style demo MP4 from analysis pipeline output."""

import argparse
import math
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Terminal theme
BG = (13, 17, 23)
FG = (201, 209, 217)
GREEN = (63, 185, 80)
CYAN = (121, 192, 255)
YELLOW = (210, 153, 34)
RED = (248, 81, 73)
HEADER_BG = (22, 27, 34)
FONT_SIZE = 18
LINE_HEIGHT = 24
PADDING = 24
MAX_LINES = 38
FPS = 2  # seconds per frame chunk


def load_font(size: int):
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def colorize(line: str) -> tuple[str, tuple]:
    if line.startswith("[") and "]" in line:
        return line, CYAN
    if "Error" in line or "error" in line.lower():
        return line, RED
    if any(k in line for k in ("complete", "Done", "successfully", "Downloaded")):
        return line, GREEN
    if line.startswith("==="):
        return line, YELLOW
    if line.startswith("---"):
        return line, CYAN
    return line, FG


def wrap_lines(raw_lines: list[str], width: int = 110) -> list[tuple[str, tuple]]:
    out: list[tuple[str, tuple]] = []
    for raw in raw_lines:
        raw = raw.rstrip("\n")
        if not raw:
            out.append(("", FG))
            continue
        chunks = textwrap.wrap(raw, width=width) or [raw]
        for i, chunk in enumerate(chunks):
            text, color = colorize(chunk if i == 0 else f"  {chunk}")
            out.append((text, color))
    return out


def render_frame(lines: list[tuple[str, tuple]], title: str, font) -> Image.Image:
    w, h = 1280, 720
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, w, 52], fill=HEADER_BG)
    draw.text((PADDING, 14), title, fill=GREEN, font=font)

    y = 64
    for text, color in lines[:MAX_LINES]:
        draw.text((PADDING, y), text, fill=color, font=font)
        y += LINE_HEIGHT

    draw.text((PADDING, h - 30), "square-re demo | test-cursor", fill=(110, 118, 129), font=font)
    return img


def chunk_lines(lines: list[tuple[str, tuple]], chunk_size: int) -> list[list[tuple[str, tuple]]]:
    if len(lines) <= MAX_LINES:
        return [lines]
    chunks = []
    step = max(1, MAX_LINES - 4)
    for start in range(0, len(lines), step):
        chunk = lines[start : start + MAX_LINES]
        if chunk:
            chunks.append(chunk)
    return chunks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    raw = Path(args.input).read_text(encoding="utf-8", errors="replace").splitlines()
    styled = wrap_lines(raw)
    font = load_font(FONT_SIZE)

    frames_dir = Path(args.output).with_suffix("")
    frames_dir.mkdir(parents=True, exist_ok=True)

    chunks = chunk_lines(styled, MAX_LINES)
    frame_paths = []
    for i, chunk in enumerate(chunks):
        title = f"Square App Reverse Engineering Demo  ({i + 1}/{len(chunks)})"
        frame = render_frame(chunk, title, font)
        path = frames_dir / f"frame_{i:04d}.png"
        frame.save(path)
        frame_paths.append(path)

    # Build ffmpeg concat with duration per frame
    concat_file = frames_dir / "concat.txt"
    with concat_file.open("w") as f:
        for path in frame_paths:
            f.write(f"file '{path}'\n")
            f.write(f"duration {FPS}\n")
        if frame_paths:
            f.write(f"file '{frame_paths[-1]}'\n")

    import subprocess

    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_file),
            "-vf", "format=yuv420p",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            str(args.output),
        ],
        check=True,
        capture_output=True,
    )

    duration = len(frame_paths) * FPS
    print(f"Generated {args.output} ({duration}s, {len(frame_paths)} frames)")


if __name__ == "__main__":
    main()
