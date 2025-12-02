# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Environment

Set `GEMINI_API_KEY` in `.env.local` (though this app doesn't currently use the Gemini API).

## Architecture

This is a React + p5.js generative art application that renders a rain effect over text using WebGL shaders. The rain simulation is inspired by "One Hundred Years of Solitude" (Macondo).

### Core Components

- **App.tsx** - Root component with UI overlay (title, credits)
- **components/RainyCanvas.tsx** - Main p5.js canvas wrapper using instance mode. Creates an off-screen graphics buffer with text paragraphs, then applies the rain shader to distort it
- **shaders.ts** - GLSL shaders:
  - Vertex shader for standard p5.js geometry mapping
  - Fragment shader implementing procedural rain drops with physics simulation, trail effects, refraction distortion, specular highlights, and vignette

### Rendering Pipeline

1. `RainyCanvas` creates an off-screen `p5.Graphics` buffer with Macondo-themed text
2. The rain fragment shader receives this as `u_texture`
3. Multiple rain layers are composited using the `layer()` function with different scales/speeds
4. Drop distortion vectors warp the UV coordinates for refraction effect
5. Post-processing adds specular highlights, color grading, and vignette
