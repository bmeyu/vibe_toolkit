#!/usr/bin/env python3
"""
Quick helper to detect the lens circle center/size from the camera artwork.
Outputs pixel values and percentages you can drop into the HTML (top/left/width).
Requires: pip install opencv-python pillow (Pillow only if you want to inspect formats).
"""

import argparse
import sys

import cv2
import numpy as np


def detect_circle(image_path: str, args):
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 5)

    circles = cv2.HoughCircles(
        gray,
        cv2.HOUGH_GRADIENT,
        dp=args.dp,
        minDist=args.min_dist,
        param1=args.param1,
        param2=args.param2,
        minRadius=args.min_radius,
        maxRadius=args.max_radius,
    )

    h, w = gray.shape[:2]
    if circles is None:
        return None, (w, h), img

    x, y, r = circles[0][0]
    return (x, y, r), (w, h), img


def main():
    parser = argparse.ArgumentParser(description="Detect lens circle center/size from a camera artwork.")
    parser.add_argument("image", help="Path to the camera image (e.g., polaroid.jpg)")
    parser.add_argument("--min-radius", type=int, default=120, help="Minimum circle radius (px)")
    parser.add_argument("--max-radius", type=int, default=260, help="Maximum circle radius (px)")
    parser.add_argument("--min-dist", type=int, default=200, help="Minimum distance between detected circles")
    parser.add_argument("--dp", type=float, default=1.2, help="Inverse ratio of accumulator resolution to image resolution")
    parser.add_argument("--param1", type=float, default=80, help="Higher threshold for Canny edge detector")
    parser.add_argument("--param2", type=float, default=30, help="Accumulator threshold for circle detection")
    parser.add_argument("--debug-overlay", help="Optional path to save an overlay image with detected circle")
    args = parser.parse_args()

    try:
        circle, size, img = detect_circle(args.image, args)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)

    w, h = size
    if circle is None:
        print("No circle detected. Try adjusting --min-radius/--max-radius/--param2.", file=sys.stderr)
        sys.exit(2)

    x, y, r = circle
    left_pct = x / w * 100
    top_pct = y / h * 100
    width_pct = (2 * r) / w * 100

    print(f"Image size: {w}x{h}px")
    print(f"Circle px: center=({x:.2f}, {y:.2f}), radius={r:.2f}")
    print(f"Percents: left={left_pct:.2f}%, top={top_pct:.2f}%, width={width_pct:.2f}%")
    print("Use left/top for translate(-50%, -50%) anchors; width for lens-video-mask width.")

    if args.debug_overlay:
        overlay = img.copy()
        cv2.circle(overlay, (int(x), int(y)), int(r), (0, 255, 0), 3)
        cv2.circle(overlay, (int(x), int(y)), 4, (0, 0, 255), -1)
        cv2.imwrite(args.debug_overlay, overlay)
        print(f"Saved overlay to: {args.debug_overlay}")


if __name__ == "__main__":
    main()
