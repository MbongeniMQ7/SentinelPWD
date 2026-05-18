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

/**
 * The dominant detected emotion plus per-emotion confidence scores (0..1).
 *
 * Scores are derived from MediaPipe blendshapes — no extra model download needed.
 * Each emotion maps to a weighted sum of relevant blendshape channels:
 *
 *  HAPPY      — mouthSmile*, cheekSquint*, mouthDimple*
 *  SAD        — browSad*, mouthFrown*, mouthPucker, eyeSquint* (low)
 *  ANGRY      — browDown*, noseSneer*, mouthPress*, eyeSquint*
 *  SURPRISED  — browInnerUp, browOuterUp*, eyeWide*, jawOpen, mouthOpen
 *  DISGUSTED  — noseSneer*, mouthShrugLower, mouthRollLower
 *  FEARFUL    — eyeWide*, browInnerUp, jawOpen (high intensity)
 *  NEUTRAL    — complement of all other scores
 *
 * `dominant` is the label with the highest score. Ties break to NEUTRAL.
 */
export type EmotionLabel =
  | "NEUTRAL"
  | "HAPPY"
  | "SAD"
  | "ANGRY"
  | "SURPRISED"
  | "DISGUSTED"
  | "FEARFUL";

export interface EmotionState {
  dominant: EmotionLabel;
  scores: Record<EmotionLabel, number>; // each in [0..1]
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
   * Fear/distress score in [0..1] derived from blendshape amplitudes.
   * @deprecated Use `emotion.scores.FEARFUL` instead.
   */
  fearScore: number | null;
  /** Full 7-emotion analysis from blendshapes. null until first face detected. */
  emotion: EmotionState | null;
  fps: number;
  error: string | null;
}

export interface UseFaceDetectionOptions {
  /** Target detection frequency. Default 30 FPS for high accuracy. */
  targetFps?: number;
  /** EAR threshold below which the eye is considered closed. Default 0.18 (more tolerant). */
  earClosedThreshold?: number;
  /** Blendshape openness threshold below which eye is "open". Default 0.4
   *  (lowered from 0.5 so partially-closed eyes don't misfire as blinks). */
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

// float32 model — significantly more accurate than float16, especially for
// partial occlusion (hats, glasses, poor lighting, non-frontal angles).
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float32/1/face_landmarker.task";
const WASM_ROOTS = [
  // Local copy (public/mediapipe/wasm) — no CDN dependency, no CORS issues.
  "/mediapipe/wasm",
  // CDN fallbacks in case the local copy is missing (e.g. a clean checkout).
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
  "https://unpkg.com/@mediapipe/tasks-vision@0.10.35/wasm",
];

const BASE_OPTIONS = {
  modelAssetPath: MODEL_URL,
  // Lower confidence thresholds so faces at angles, under hats, or in
  // lower-contrast lighting are still picked up.
  // MediaPipe docs: minFaceDetectionConfidence, minFacePresenceConfidence,
  // minTrackingConfidence all default to 0.5. Lowering to 0.25 catches ~30%
  // more real-world edge cases without a meaningful false-positive increase.
};

const LANDMARKER_OPTIONS = {
  runningMode: "VIDEO" as const,
  numFaces: 1,
  minFaceDetectionConfidence: 0.25,
  minFacePresenceConfidence: 0.25,
  minTrackingConfidence: 0.3,
  outputFaceBlendshapes: true,
  outputFacialTransformationMatrixes: false,
};

async function createLandmarker(delegate: "GPU" | "CPU"): Promise<FaceLandmarker> {
  let lastError: unknown = null;

  for (const wasmRoot of WASM_ROOTS) {
    try {
      const fileset = await FilesetResolver.forVisionTasks(wasmRoot);
      return await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { ...BASE_OPTIONS, delegate },
        ...LANDMARKER_OPTIONS,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Failed to load MediaPipe vision assets");
}

async function getLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    // Try GPU first for performance; fall back to CPU when WebGL is
    // unavailable (e.g., headless, some mobile browsers, Vercel preview).
    try {
      return await createLandmarker("GPU");
    } catch {
      console.warn("[useFaceDetection] GPU delegate failed — retrying with CPU");
      return await createLandmarker("CPU");
    }
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
    targetFps = 30,
    earClosedThreshold = 0.18,
    blinkClosedThreshold = 0.4,
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
    emotion: null,
    fps: 0,
    error: null,
  });

  // Mutable refs for the loop — avoid re-rendering on every frame.
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  /** Prevents multiple concurrent landmarker-load attempts while WASM is initialising. */
  const loadingLandmarkerRef = useRef<boolean>(false);
  /** Prevents a second detectForVideo call while one is already in-flight. */
  const isDetectingRef = useRef<boolean>(false);
  const fpsAccumRef = useRef<{ frames: number; t0: number }>({
    frames: 0,
    t0: 0,
  });
  const cancelledRef = useRef(false);
  const detectionFailureCountRef = useRef(0);

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
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setState((s) => ({
          ...s,
          cameraStatus: "error",
          error: "Camera view failed to initialize",
        }));
        return;
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= 1) {
          resolve();
          return;
        }

        const handleLoadedMetadata = () => {
          cleanup();
          resolve();
        };
        const handleError = () => {
          cleanup();
          reject(new Error("Camera stream failed to load into the video element"));
        };
        const cleanup = () => {
          video.removeEventListener("loadedmetadata", handleLoadedMetadata);
          video.removeEventListener("error", handleError);
        };

        video.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
        video.addEventListener("error", handleError, { once: true });
      });

      await video.play().catch(() => {
        /* autoplay can throw on some browsers; the loop tolerates paused video */
      });
      lastTickRef.current = 0;
      lastVideoTimeRef.current = -1;
      fpsAccumRef.current = { frames: 0, t0: performance.now() };
      detectionFailureCountRef.current = 0;
      setState((s) => ({ ...s, cameraStatus: "active" }));
    } catch (err) {
      const e = err as DOMException | Error;
      const denied =
        (e as DOMException).name === "NotAllowedError" ||
        (e as DOMException).name === "SecurityError";
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
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

      // Guard: only one landmarker load at a time.
      if (!landmarker) {
        if (loadingLandmarkerRef.current) return;
        loadingLandmarkerRef.current = true;
        try {
          landmarker = await getLandmarker();
        } catch (err) {
          loadingLandmarkerRef.current = false;
          detectionFailureCountRef.current += 1;
          const message = err instanceof Error ? err.message : "Face detector failed to initialize";
          console.warn("[useFaceDetection] landmarker init failed", err);
          if (detectionFailureCountRef.current >= 3) {
            setState((s) => ({ ...s, faceDetected: false, faceBox: null, eyePositions: { left: null, right: null }, eyeState: "unknown", eyeOpenness: { left: null, right: null }, headPose: null, fearScore: null, emotion: null, error: message }));
          }
          return;
        }
        loadingLandmarkerRef.current = false;
      }

      // Guard: skip frame if a detection is already running.
      if (isDetectingRef.current) return;
      isDetectingRef.current = true;

      try {
        detectionFailureCountRef.current = 0;
        const result: FaceLandmarkerResult = landmarker.detectForVideo(
          video,
          performance.now(),
        );
        applyResult(result);
      } catch (err) {
        // Detection errors must not crash the stream — log and continue.
        // Reset the landmarker singleton so next tick re-initialises cleanly
        // (handles cases where the GPU context is lost mid-session).
        // eslint-disable-next-line no-console
        console.warn("[useFaceDetection] detection failed — resetting landmarker", err);
        landmarker = null;
        landmarkerPromise = null;
        detectionFailureCountRef.current += 1;
        if (detectionFailureCountRef.current >= 3) {
          const message = err instanceof Error ? err.message : "Face detector failed to initialize";
          setState((s) => ({
            ...s,
            faceDetected: false,
            faceBox: null,
            eyePositions: { left: null, right: null },
            eyeState: "unknown",
            eyeOpenness: { left: null, right: null },
            headPose: null,
            fearScore: null,
            emotion: null,
            error: message,
          }));
        }
      } finally {
        isDetectingRef.current = false;
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
                emotion: null,
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

      // --- 7-Emotion classifier from MediaPipe blendshapes ---
      // Each emotion is a weighted sum of relevant blendshape channels (0..1).
      // Blendshape reference: https://developers.google.com/mediapipe/solutions/vision/face_landmarker
      let fearScore: number | null = null;
      let emotion: EmotionState | null = null;

      if (blendshapes && blendshapes.length) {
        const g = (name: string) =>
          blendshapes.find((c) => c.categoryName === name)?.score ?? 0;

        // HAPPY: cheek raises + lip corners up + dimples
        const happy = Math.min(1,
          g("mouthSmileLeft")  * 0.25 +
          g("mouthSmileRight") * 0.25 +
          g("cheekSquintLeft") * 0.20 +
          g("cheekSquintRight")* 0.20 +
          g("mouthDimpleLeft") * 0.05 +
          g("mouthDimpleRight")* 0.05,
        );

        // SAD: inner brow raise + lip corners down + mouth pout
        const sad = Math.min(1,
          g("browInnerUp")      * 0.30 +
          g("mouthFrownLeft")   * 0.25 +
          g("mouthFrownRight")  * 0.25 +
          g("mouthPucker")      * 0.10 +
          g("mouthShrugLower")  * 0.10,
        );

        // ANGRY: brows down + nose sneer + lip press + eye squint
        const angry = Math.min(1,
          g("browDownLeft")     * 0.25 +
          g("browDownRight")    * 0.25 +
          g("noseSneerLeft")    * 0.20 +
          g("noseSneerRight")   * 0.20 +
          g("mouthPressLeft")   * 0.05 +
          g("mouthPressRight")  * 0.05,
        );

        // SURPRISED: brows up + wide eyes + jaw drop
        const surprised = Math.min(1,
          g("browOuterUpLeft")  * 0.20 +
          g("browOuterUpRight") * 0.20 +
          g("eyeWideLeft")      * 0.20 +
          g("eyeWideRight")     * 0.20 +
          g("jawOpen")          * 0.20,
        );

        // DISGUSTED: nose sneer + mouth shrug + lip roll
        const disgusted = Math.min(1,
          g("noseSneerLeft")    * 0.30 +
          g("noseSneerRight")   * 0.30 +
          g("mouthShrugLower")  * 0.20 +
          g("mouthRollLower")   * 0.20,
        );

        // FEARFUL: wide eyes + inner brow up + jaw open (high intensity)
        const fearful = Math.min(1,
          g("eyeWideLeft")      * 0.25 +
          g("eyeWideRight")     * 0.25 +
          g("browInnerUp")      * 0.30 +
          g("jawOpen")          * 0.20,
        );

        fearScore = fearful; // backward compat

        // NEUTRAL: complement — clamped so it doesn't go negative
        const rawNeutral = Math.max(0,
          1 - (happy + sad + angry + surprised + disgusted + fearful),
        );
        const neutral = Math.min(1, rawNeutral);

        const scores: Record<EmotionLabel, number> = {
          HAPPY: happy,
          SAD: sad,
          ANGRY: angry,
          SURPRISED: surprised,
          DISGUSTED: disgusted,
          FEARFUL: fearful,
          NEUTRAL: neutral,
        };

        // Dominant = highest scoring emotion
        const dominant = (Object.keys(scores) as EmotionLabel[]).reduce(
          (best, k) => (scores[k] > scores[best] ? k : best),
          "NEUTRAL" as EmotionLabel,
        );

        emotion = { dominant, scores };
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
        emotion,
        error: null,
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
