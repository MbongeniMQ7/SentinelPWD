/**
 * FaceDetectionOverlay
 *
 * Pure presentational overlay used inside the existing monitoring panel.
 * Renders the live <video>, a bbox rectangle, and two eye markers.
 * The wrapper element preserves the existing aspect-ratio container — this
 * component only fills it (absolute inset-0) and never adds layout chrome.
 */

import { forwardRef } from "react";
import type { NormalizedBox, EyePositions, EyeState } from "@/hooks/useFaceDetection";

interface Props {
  faceBox: NormalizedBox | null;
  eyePositions: EyePositions;
  eyeState: EyeState;
  /** Whether the source is mirrored (front camera). Affects overlay coords. */
  mirrored?: boolean;
}

export const FaceDetectionOverlay = forwardRef<HTMLVideoElement, Props>(
  function FaceDetectionOverlay({ faceBox, eyePositions, eyeState, mirrored = true }, ref) {
    // Convert normalized [0..1] box to CSS percent strings.
    const box = faceBox
      ? {
          left: `${(mirrored ? 1 - faceBox.x - faceBox.width : faceBox.x) * 100}%`,
          top: `${faceBox.y * 100}%`,
          width: `${faceBox.width * 100}%`,
          height: `${faceBox.height * 100}%`,
        }
      : null;

    const eyeColor =
      eyeState === "closed"
        ? "oklch(0.65 0.2 25)" // red-ish for closed
        : "oklch(0.85 0.15 145)"; // green-ish for open

    const renderEye = (p: { x: number; y: number } | null, key: string) => {
      if (!p) return null;
      return (
        <span
          key={key}
          className="absolute -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full ring-2 ring-white/80"
          style={{
            left: `${(mirrored ? 1 - p.x : p.x) * 100}%`,
            top: `${p.y * 100}%`,
            background: eyeColor,
            boxShadow: `0 0 8px ${eyeColor}`,
          }}
        />
      );
    };

    return (
      <>
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
        />
        {box && (
          <div
            className="absolute pointer-events-none border-2 border-gold rounded-md transition-[left,top,width,height] duration-100"
            style={box}
          />
        )}
        {renderEye(eyePositions.left, "left")}
        {renderEye(eyePositions.right, "right")}
      </>
    );
  },
);
