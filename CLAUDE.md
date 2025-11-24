# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**vibe-toolkit** is a collection of interactive web experiences. Currently contains **palide**, a realistic Polaroid camera wall experience with webcam integration.

### palide: Interactive Polaroid Camera

A single-page HTML application (no build process) that simulates a physical Polaroid camera with:
- Live webcam preview displayed through a circular lens overlay on camera artwork
- Click-to-capture photos that "eject" from the camera with a development animation
- Drag-and-drop photo arrangement on a textured wall background
- Flash effects (both localized on camera and full-screen)

**Key implementation details:**
- Everything is in `palide/index.html`: HTML structure, CSS styling, and JavaScript logic inline
- Camera artwork: `Gemini_Generated_Image_kjbox3kjbox3kjbo.png`
- Lens positioning uses percentage-based absolute positioning (top: 59.1%, left: 54.1%, width: 41.6%) to align video with camera artwork
- Video stream is mirrored (`scaleX(-1)`) for natural preview
- Photo development effect: starts with `blur(20px) brightness(0.1) sepia(1)`, transitions over 5s to `blur(0) brightness(1) sepia(0.2)`

## Development Commands

**Local server** (required for camera permissions):
```bash
cd palide && python -m http.server 8000
```
Then visit `http://localhost:8000/index.html`

**Lens alignment tool** (Python helper):
```bash
cd palide
python detect_lens.py Gemini_Generated_Image_kjbox3kjbox3kjbo.png
```
Detects circular lens position in camera artwork and outputs CSS percentage values. Requires: `pip install opencv-python`

Optional parameters:
- `--min-radius`, `--max-radius`: Circle detection bounds (default: 120-260px)
- `--debug-overlay output.png`: Saves image with detected circle overlay

## Architecture & Code Organization

### File Structure
```
palide/
├── index.html                                    # Single-page app (HTML + CSS + JS)
├── Gemini_Generated_Image_kjbox3kjbox3kjbo.png  # Camera artwork
├── detect_lens.py                                # Lens alignment utility
└── [other .png files]                            # Artwork variations/tests
```

### HTML Structure (in index.html)
```
body
├── .screen-flash (full-screen flash overlay, z-index: 9999)
├── .camera-container (fixed bottom-left, z-index: 1000)
│   └── .camera-wrapper
│       ├── .flash-bulb (localized flash, z-index: 105)
│       ├── .lens-video-mask (circular video cutout, z-index: 101)
│       │   ├── video#camera-stream (webcam)
│       │   └── .lens-reflection (lens glare effect)
│       ├── img.camera-img (camera artwork, z-index: 100)
│       └── .shutter-trigger (transparent click area, z-index: 105)
└── [dynamically created .polaroid-photo elements]
```

**Z-index layering:**
- Photos start at z-index: 50 (behind camera during ejection)
- Camera image: 100
- Lens video mask: 101
- Interactive elements (shutter, flash): 105
- After ejection, photos move to 110+ (dragging sets to 2000)
- Screen flash: 9999

### Key JavaScript Functions

**`initCamera()`**: Requests webcam via `getUserMedia`, handles Safari permission errors, starts video stream

**`triggerFlash()`**: Animates both localized (.flash-bulb) and full-screen (.screen-flash) flash overlays

**`createAndEjectPhoto(imgUrl)`**:
1. Creates .polaroid-photo div with captured image
2. Positions behind camera (z-index: 50)
3. Animates upward ejection over 1.2s
4. After 1.3s: removes .developing, adds .developed (triggers 5s sepia/blur transition), enables dragging, sets z-index: 110

**`enableDrag(photo)`**:
- Mouse-based drag implementation (no touch support yet)
- On mousedown: captures initial position, removes transition for smooth dragging
- On mousemove: updates position via left/top
- On mouseup: restores transition, increments z-index to bring to front

### Visual Design System

**Colors & Textures:**
- Background: `#e8e0d5` (warm beige) with radial-gradient dot pattern (22px grid)
- Paper texture: 5px radial-gradient on photos
- Drop shadows on camera (10px 10px 20px) and photos (2px 2px 15px)

**Spacing & Dimensions:**
- Camera container: 320px wide, fixed bottom-left (30px margins)
- Photos: 200px wide × 240px tall with 12px side/top padding, 45px bottom padding
- Lens positioning: Relative to camera artwork dimensions via percentages

**Naming Conventions:**
- CSS: kebab-case (`.camera-container`, `.shutter-trigger`)
- JavaScript: camelCase (`initCamera`, `triggerFlash`)
- Indent: 4 spaces (no tabs)

## Testing

**No automated tests.** Manual testing checklist:
1. Start local server, grant camera permission
2. Click shutter button → verify localized flash, full-screen flash, photo ejection
3. Wait 5s → verify photo develops from dark/blurry to clear with warm sepia
4. Drag photos around → verify smooth movement, no jitter, proper z-index stacking
5. Check console for errors
6. Test on Safari (primary target) and Chrome

**When changing media handling:**
- Verify mirrored preview preserved
- Test camera permission flow (deny → allow)
- Confirm video sizing handles various webcam resolutions

**When changing camera artwork:**
- Run `detect_lens.py` on new image
- Update `.lens-video-mask` CSS (top, left, width percentages)
- Visually verify video aligns with lens in artwork
- May need to adjust `.shutter-trigger` and `.flash-bulb` positions

## Important Constraints

- **No dependencies:** Vanilla HTML/CSS/JS only
- **Browser requirements:** Modern browser with `getUserMedia` support (Safari, Chrome)
- **Localhost or HTTPS required** for camera permissions
- **Chinese language:** UI text and comments are in Chinese (zh-CN)
- **Desktop-focused:** Mouse-only drag implementation, no responsive mobile optimizations yet
