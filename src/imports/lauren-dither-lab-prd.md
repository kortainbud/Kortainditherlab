PRODUCT REQUIREMENTS DOCUMENT
Product Name: Lauren Dither Lab
Version: v1
Owner: Quadri
Type: Web-based Visual Processing Tool
1. Product Overview

Lauren Dither Lab is a web-based image processing tool that allows users to:

Upload an image

Apply advanced dithering algorithms

Apply CRT / VHS / Retro display effects

Customize pixel density, color modes, and distortion

Export the processed image

This product does NOT include ASCII character generation.
It focuses purely on image-based dithering and retro display simulation.

2. Design System Requirements (Very Important)

The developer must follow the design language shown in the attached screenshots.

We are replicating the visual style, not the content.

2.1 Visual Aesthetic

Background: Deep black (#000000 or near-black)

UI Panels: Very dark gray (#0e0e0e – #151515)

Borders: Thin 1px subtle gray lines (#1f1f1f range)

Typography: Inter font family

Uppercase tab labels

Minimal spacing

Compact, high-density control layout

Monospace-like technical feel

Flat UI (no heavy shadows, no neumorphism)

Sliders thin + minimal

Toggle switches small and subtle

Tables / lists in stacked rows with separators

Highlighted active tab = subtle outlined state (not filled bright)

2.2 Layout Structure

Fullscreen canvas (center/left)

Right-side vertical control panel

Top horizontal tab navigation

No bright colors

Effects appear technical and modular

This is a tool interface, not a marketing website.

3. Core Feature Set (v1 Scope)
3.1 Image Upload

Users must be able to:

Drag & drop image

Click to upload

Supported formats:

JPG

PNG

WEBP

After upload:

Image renders centered on canvas

Automatically scaled to fit viewport

4. Main Navigation Tabs

Top navigation should include:

SHAPE (hidden/disabled for now)

VISUAL (primary tab)

AUDIO (disabled placeholder)

EXPORT

Only VISUAL and EXPORT are functional in v1.

5. VISUAL TAB – Functional Requirements
5.1 Background Modes

These background overlays should be selectable:

Void (pure black)

Noise

Grid

Plasma

Stars

These appear behind transparent portions of the image.

5.2 Dithering Engine (Core Feature)

Apply dithering to uploaded image in real time.

Supported algorithms:

Bayer 2x2

Bayer 4x4

Bayer 8x8

Halftone Dot

Halftone Line

Floyd–Steinberg

Atkinson

Blue Noise

Threshold

White Noise

Requirements:

Real-time processing (WebGL preferred)

Smooth slider updates

No page refresh

Toggle dithering ON/OFF

5.3 Pixel Controls

Pixel Scale slider

Controls block resolution size

Range: 1 – 50

Default: 2

5.4 Color Controls

Foreground color picker

Background color picker

Mode dropdown:

Mono

Duotone

Full grayscale

All changes apply in real time.

6. CRT / PVM Effects

Each effect must include:

Toggle switch

Amount slider (0–100)

Effects:

Scanlines

Shadow Mask

Phosphor Glow

Curvature

Chroma Aberration

Bloom

Interlace

Static Noise

Pixelate

RGB Shift

These stack on top of dithering.

7. VHS / Tape Effects

Include:

Tracking Error

Distortion amount slider

Optional future:

Vertical jitter

Horizontal tearing

8. Rendering & Technical Requirements
Preferred Stack:

WebGL or Three.js

Shader-based processing (fragment shaders preferred)

Canvas-based rendering acceptable if performant

Performance Requirements:

Real-time interaction at 60fps for 1080px images

GPU accelerated where possible

Avoid CPU-heavy loops for dithering

9. Export Tab

Users must be able to:

Export as PNG

Export at:

Original resolution

Current scaled resolution

Preserve applied effects

Optional:

Transparent background toggle

10. Non-Goals (Out of Scope for v1)

ASCII character generation

3D models

Audio reactivity

3D shape primitives

Model importing

This is strictly:

Upload image → Apply dithering + retro effects → Export

11. Interaction Rules

Sliders update instantly

No page reload

State persists until refresh

UI must feel like a creative tool (not a form)

12. Deliverables

Developer must deliver:

Working web app

Fully responsive

Dark UI matching reference style

Clean modular code

Effects separated into reusable shader modules

13. Success Criteria

Upload works instantly

All dithering algorithms visibly distinct

CRT effects stack correctly

UI visually matches reference aesthetic

Export produces accurate output

Smooth performance