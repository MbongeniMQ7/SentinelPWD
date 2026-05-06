/**
 * useFaceDetection
 *
 * Camera + face/eye detection pipeline for the SentinelAI monitoring screen.
 *
 * Pipeline:
 *   1. Request camera (getUserMedia) and stream into a <video> ref.
 *   2. Initialize MediaPipe FaceLandmarker (WASM, GPU delegate when available).
 *   3. Run a throttled rAF loop (~20 FPS by default) that produces:
 *        - faceDetected (boolean)
 *        - faceBox      (normalized 0..1 + pixel space)
 *        - eyePositions (left/right center, normalized + pixel)
 *        - eyeState     ("open" | "closed") via blendshape probability
 *                       (eyeBlink*) with EAR fallback.
 *
 * The hook returns refs you wire to existing UI nodes — it does NOT render UI.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

// ---------- Types ----------

export type CameraStatus = "idle" | "loading" | "active" | "denied" | "error";
export type EyeState = "open" | "closed" | "unknown";

export interface NormalizedBox {
  x: number; // 0..1, top-left
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number; // 0..1
  y: number;
}

export interface EyePositions {
  left: Point | null;
  right: Point | null;
}

/** Head pose angles in degrees derived from face mesh landmarks. */
export interface HeadPose {
  /** Yaw: positive = turned right (away from camera left). Approx ±45°. */
  yaw: number;
  /** Pitch: positive = looking down. Approx ±30°. */
  pitch: number;
}

export interface FaceDetectionState {
  cameraStatus: CameraStatus;
  faceDetected: boolean;
  faceBox: NormalizedBox | null;
  eyePositions: EyePositions;
  eyeState: EyeState;
  /** Per-eye open probability in [0..1] (1 = fully open). null until first reading. */
  eyeOpenness: { left: number | null; right: number | null };
  /**
   * Head orientation estimated from facial landmarks.
   * Used for focus tracking — large yaw/pitch indicates the employee is
   * looking away from the screen/task.
   */
  headPose: HeadPose | null;
  /**
   * Fear/distress score in [0..1] derived from blendshape amplitudes:
   * wide eyes (eyeWideLeft/Right), raised inner brows (browInnerUp), jaw drop (jawOpen).
   * Heuristic MVP — can be replaced by a trained expression classifier.
   */
  fearScore: number | null;
  fps: number;
  error: string | null;
}

export interface UseFaceDetectionOptions {
  /** Target detection frequency. Default 20 FPS to balance accuracy and battery. */
  targetFps?: number;
  /** EAR threshold below which the eye is considered closed. Default 0.21. */
  earClosedThreshold?: number;
  /** Blendshape openness threshold below which eye is "open". Default 0.5
   *  (blendshape eyeBlink* > 0.5 means closing). */
  blinkClosedThreshold?: number;
}

// ---------- MediaPipe FaceMesh landmark indices for eyes ----------
// Reference: https://github.com/google/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py

const LEFT_EYE = {
  // 6 EAR points: [outer, topUp, topDown, inner, bottomDown, bottomUp]
  ear: [33, 160, 158, 133, 153, 144],
  center: [468], // iris center if refineLandmarks; fallback handled below
};

const RIGHT_EYE = {
  ear: [362, 385, 387, 263, 373, 380],
  center: [473],
};

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Eye Aspect Ratio per Soukupová & Čech (2016). */
function eyeAspectRatio(
  pts: Array<{ x: number; y: number }>,
  idx: number[],
): number {
  const [p1, p2, p3, p4, p5, p6] = idx.map((i) => pts[i]);
  if (!p1 || !p4) return 0;
  const horizontal = dist(p1, p4);
  if (horizontal === 0) return 0;
  return (dist(p2, p6) + dist(p3, p5)) / (2 * horizontal);
}

function eyeCenter(
  pts: Array<{ x: number; y: number }>,
  idx: number[],
): Point | null {
  const corners = [pts[idx[0]], pts[idx[3]]];
  if (!corners[0] || !corners[1]) return null;
  return {
    x: (corners[0].x + corners[1].x) / 2,
    y: (corners[0].y + corners[1].y) / 2,
  };
}

function bboxFromLandmarks(
  pts: Array<{ x: number; y: number }>,
): NormalizedBox | null {
  if (!pts.length) return null;
  let minX = 1,
    minY = 1,
    maxX = 0,
    maxY = 0;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  // Pad slightly so the box hugs the head, not just the mesh.
  const padX = (maxX - minX) * 0.08;
  const padY = (maxY - minY) * 0.12;
  return {
    x: Math.max(0, minX - padX),
    y: Math.max(0, minY - padY),
    width: Math.min(1, maxX - minX + padX * 2),
    height: Math.min(1, maxY - minY + padY * 2),
  };
}

// ---------- Singleton landmarker (avoid re-init across remounts) ----------

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

async function getLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm",
    );
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });
  })().catch((e) => {
    landmarkerPromise = null;
    throw e;
  });
  return landmarkerPromise;
}

// ---------- The hook ----------

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseFaceDetectionOptions = {},
) {
  const {
    targetFps = 20,
    earClosedThreshold = 0.21,
    blinkClosedThreshold = 0.5,
  } = options;

  const [state, setState] = useState<FaceDetectionState>({
    cameraStatus: "idle",
    faceDetected: false,
    faceBox: null,
    eyePositions: { left: null, right: null },
    eyeState: "unknown",
    eyeOpenness: { left: null, right: null },
    headPose: null,
    fearScore: null,
    fps: 0,
    error: null,
  });

  // Mutable refs for the loop — avoid re-rendering on every frame.
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const fpsAccumRef = useRef<{ frames: number; t0: number }>({
    frames: 0,
    t0: 0,
  });
  const cancelledRef = useRef(false);

  // ---------- Camera ----------

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState((s) => ({
        ...s,
        cameraStatus: "error",
        error: "Camera API not available in this browser",
      }));
      return;
    }
    setState((s) => ({ ...s, cameraStatus: "loading", error: null }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play().catch(() => {
        /* autoplay can throw on some browsers; the loop tolerates paused video */
      });
      setState((s) => ({ ...s, cameraStatus: "active" }));
    } catch (err) {
      const e = err as DOMException | Error;
      const denied =
        (e as DOMException).name === "NotAllowedError" ||
        (e as DOMException).name === "SecurityError";
      setState((s) => ({
        ...s,
        cameraStatus: denied ? "denied" : "error",
        error: e.message || "Failed to access camera",
      }));
    }
  }, [videoRef]);

  const stopCamera = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    setState((s) => ({ ...s, cameraStatus: "idle", faceDetected: false }));
  }, [videoRef]);

  // ---------- Detection loop ----------

  useEffect(() => {
    cancelledRef.current = false;
    let landmarker: FaceLandmarker | null = null;

    const minInterval = 1000 / targetFps;

    const tick = async (now: number) => {
      if (cancelledRef.current) return;
      rafRef.current = requestAnimationFrame(tick);

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) return;

      // Throttle to target FPS.
      if (now - lastTickRef.current < minInterval) return;
      lastTickRef.current = now;

      // Skip if frame hasn't advanced.
      if (video.currentTime === lastVideoTimeRef.current) return;
      lastVideoTimeRef.current = video.currentTime;

      try {
        if (!landmarker) landmarker = await getLandmarker();
        const result: FaceLandmarkerResult = landmarker.detectForVideo(
          video,
          performance.now(),
        );
        applyResult(result);
      } catch (err) {
        // Detection errors must not crash the stream — log and continue.
        // eslint-disable-next-line no-console
        console.warn("[useFaceDetection] detection failed", err);
      }
    };

    const applyResult = (result: FaceLandmarkerResult) => {
      const landmarks = result.faceLandmarks?.[0];
      const blendshapes = result.faceBlendshapes?.[0]?.categories;

      // FPS accumulator (updates ~once per second).
      const now = performance.now();
      const acc = fpsAccumRef.current;
      acc.frames += 1;
      if (now - acc.t0 >= 1000) {
        const fps = (acc.frames * 1000) / (now - acc.t0);
        acc.frames = 0;
        acc.t0 = now;
        setState((s) => (Math.abs(s.fps - fps) > 0.5 ? { ...s, fps } : s));
      }

      if (!landmarks || landmarks.length === 0) {
        setState((s) =>
          s.faceDetected || s.faceBox
            ? {
                ...s,
                faceDetected: false,
                faceBox: null,
                eyePositions: { left: null, right: null },
                eyeState: "unknown",
                eyeOpenness: { left: null, right: null },
                headPose: null,
                fearScore: null,
              }
            : s,
        );
        return;
      }

      const box = bboxFromLandmarks(landmarks);
      const left = eyeCenter(landmarks, LEFT_EYE.ear);
      const right = eyeCenter(landmarks, RIGHT_EYE.ear);

      // --- Eye state: prefer blendshapes, fallback to EAR ---
      let leftOpen: number | null = null;
      let rightOpen: number | null = null;
      let eyeState: EyeState = "unknown";

      if (blendshapes && blendshapes.length) {
        const get = (name: string) =>
          blendshapes.find((c) => c.categoryName === name)?.score ?? null;
        const blinkL = get("eyeBlinkLeft");
        const blinkR = get("eyeBlinkRight");
        if (blinkL != null) leftOpen = 1 - blinkL;
        if (blinkR != null) rightOpen = 1 - blinkR;
        if (blinkL != null && blinkR != null) {
          eyeState =
            blinkL > blinkClosedThreshold && blinkR > blinkClosedThreshold
              ? "closed"
              : "open";
        }
      }

      if (eyeState === "unknown") {
        // Geometric fallback via EAR.
        const earL = eyeAspectRatio(landmarks, LEFT_EYE.ear);
        const earR = eyeAspectRatio(landmarks, RIGHT_EYE.ear);
        leftOpen = leftOpen ?? Math.min(1, earL / 0.3);
        rightOpen = rightOpen ?? Math.min(1, earR / 0.3);
        eyeState =
          earL < earClosedThreshold && earR < earClosedThreshold
            ? "closed"
            : "open";
      }

      // --- Head pose from landmark geometry (no transformation matrix needed) ---
      // Uses the face oval + nose tip to approximate yaw (left-right) and
      // pitch (up-down). Structured so a trained pose model can replace this
      // block later by overriding `headPose` from `outputFacialTransformationMatrixes`.
      let headPose: HeadPose | null = null;
      if (landmarks.length > 454) {
        const noseTip    = landmarks[4];
        const leftCheek  = landmarks[234];
        const rightCheek = landmarks[454];
        const forehead   = landmarks[10];
        const chin       = landmarks[152];
        const leftInner  = landmarks[133];
        const rightInner = landmarks[362];
        if (noseTip && leftCheek && rightCheek && forehead && chin && leftInner && rightInner) {
          const faceWidth  = Math.max(0.001, rightCheek.x - leftCheek.x);
          const faceHeight = Math.max(0.001, chin.y - forehead.y);
          const faceMidX   = (leftCheek.x + rightCheek.x) / 2;
          const eyeMidY    = (leftInner.y + rightInner.y) / 2;
          // Scale to approximate degree range (±45° yaw, ±30° pitch).
          const yaw   = ((noseTip.x - faceMidX) / (faceWidth  / 2)) * 45;
          const pitch = ((noseTip.y - eyeMidY)  / (faceHeight * 0.5)) * 30;
          headPose = { yaw, pitch };
        }
      }

      // --- Fear / distress score from blendshapes ---
      // Heuristic MVP combining four expression channels associated with fear:
      //   eyeWideLeft + eyeWideRight  : wide-open eyes (surprise/fear)
      //   browInnerUp                 : raised inner brows (worry/fear)
      //   jawOpen                     : open mouth (shock/fear)
      // Weighted sum normalised to [0..1]. A trained classifier can replace
      // this computation later without changing the downstream interface.
      let fearScore: number | null = null;
      if (blendshapes && blendshapes.length) {
        const get = (name: string) =>
          blendshapes.find((c) => c.categoryName === name)?.score ?? 0;
        const eyeWideL = get("eyeWideLeft");
        const eyeWideR = get("eyeWideRight");
        const browUp   = get("browInnerUp");
        const jawOpen  = get("jawOpen");
        fearScore = Math.min(1, eyeWideL * 0.3 + eyeWideR * 0.3 + browUp * 0.25 + jawOpen * 0.15);
      }

      setState((s) => ({
        ...s,
        faceDetected: true,
        faceBox: box,
        eyePositions: { left, right },
        eyeState,
        eyeOpenness: { left: leftOpen, right: rightOpen },
        headPose,
        fearScore,
      }));
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelledRef.current = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [videoRef, targetFps, earClosedThreshold, blinkClosedThreshold]);

  // Cleanup camera on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return { ...state, startCamera, stopCamera };
}
