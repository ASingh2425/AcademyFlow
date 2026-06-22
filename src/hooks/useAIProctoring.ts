import { useEffect, useRef } from 'react'
import { getFaceDetector } from '../lib/faceDetector'
import type { ProctorEvent } from '../types'

export type GazeDirection = 'center' | 'left' | 'right' | 'up' | 'unknown'

export interface AIProctorStatus {
  facesDetected: number
  facePresence: boolean
  attentionFocused: boolean
  multiplePeople: boolean
  suspicious: string[]
  confidence: number
  modelReady: boolean
  modelError: string | null
  // Gaze tracking
  lookingAway: boolean
  gazeDirection: GazeDirection
}

function logEvent(onEvent: (event: ProctorEvent) => void, message: string) {
  onEvent({
    timestamp: new Date().toISOString(),
    message: `ML Proctor: ${message}`,
  })
}

/**
 * Estimate gaze direction from BlazeFace keypoints.
 *
 * BlazeFace returns 6 keypoints (all normalized 0-1):
 *   [0] subject's right eye  (appears on camera-LEFT  → smaller x)
 *   [1] subject's left eye   (appears on camera-RIGHT → larger x)
 *   [2] nose tip
 *   [3] mouth centre
 *   [4] right ear tragion
 *   [5] left ear tragion
 *
 * YAW  (left / right): When the head turns right the subject's left eye
 *   closes in on the nose, so (nose.x − rightEye.x) grows while
 *   (leftEye.x − nose.x) shrinks.  We express this as an asymmetry ratio:
 *     yawAsymmetry = leftSpan / (leftSpan + rightSpan)   ≈ 0.5 when centred
 *     < 0.30 → looking to subject's LEFT
 *     > 0.70 → looking to subject's RIGHT
 *
 * PITCH (up): When the head tilts back the nose rises above the eye-mouth span.
 *     pitchRatio = (nose.y − eyeMid.y) / (mouth.y − eyeMid.y)
 *     < 0.15 → looking strongly UP (rare during an exam but still useful)
 */
function estimateGaze(
  keypoints: Array<{ x: number; y: number }> | undefined
): { direction: GazeDirection; yawAsymmetry: number; pitchRatio: number } {
  const unknown = { direction: 'unknown' as GazeDirection, yawAsymmetry: 0.5, pitchRatio: 0.5 }
  if (!keypoints || keypoints.length < 4) return unknown

  const rightEye = keypoints[0] // subject's right, camera-left
  const leftEye  = keypoints[1] // subject's left,  camera-right
  const nose     = keypoints[2]
  const mouth    = keypoints[3]

  const leftSpan  = nose.x - rightEye.x  // nose → right-eye distance
  const rightSpan = leftEye.x - nose.x   // left-eye → nose distance
  const totalSpan = leftSpan + rightSpan

  if (totalSpan < 0.01) return unknown // face too small / degenerate

  const yawAsymmetry = leftSpan / totalSpan // ~0.5 when centred

  const eyeMidY = (rightEye.y + leftEye.y) / 2
  const vertSpan = mouth.y - eyeMidY
  const pitchRatio = vertSpan > 0.01 ? (nose.y - eyeMidY) / vertSpan : 0.5

  let direction: GazeDirection = 'center'

  if (yawAsymmetry < 0.30) {
    direction = 'left'   // subject looking to their left
  } else if (yawAsymmetry > 0.70) {
    direction = 'right'  // subject looking to their right
  } else if (pitchRatio < 0.15) {
    direction = 'up'     // head tilted strongly back
  }

  return { direction, yawAsymmetry, pitchRatio }
}

export function useAIProctoring(
  videoElementRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  onEvent: (event: ProctorEvent) => void,
  onStatusUpdate: (status: AIProctorStatus) => void
): void {
  const onEventRef = useRef(onEvent)
  const onStatusRef = useRef(onStatusUpdate)
  onEventRef.current = onEvent
  onStatusRef.current = onStatusUpdate

  useEffect(() => {
    if (!active) return

    let disposed = false
    let animationFrame: number | null = null
    let lastAnalysisTime = 0
    const conditionStartedAt: Record<string, number> = {}
    const lastLoggedAt: Record<string, number> = {}
    const ANALYSIS_INTERVAL_MS = 250
    const CONDITION_GRACE_MS   = 1500   // must persist for 1.5 s before flagging
    const EVENT_COOLDOWN_MS    = 10_000 // don't spam same event within 10 s

    const initialStatus: AIProctorStatus = {
      facesDetected: 0,
      facePresence: false,
      attentionFocused: false,
      multiplePeople: false,
      suspicious: [],
      confidence: 0,
      modelReady: false,
      modelError: null,
      lookingAway: false,
      gazeDirection: 'unknown',
    }
    onStatusRef.current(initialStatus)

    const recordSustainedCondition = (
      key: string,
      activeCondition: boolean,
      message: string,
      now: number
    ) => {
      if (!activeCondition) {
        delete conditionStartedAt[key]
        return
      }
      conditionStartedAt[key] ??= now
      const sustained  = now - conditionStartedAt[key] >= CONDITION_GRACE_MS
      const cooledDown = now - (lastLoggedAt[key] ?? 0) >= EVENT_COOLDOWN_MS
      if (sustained && cooledDown) {
        logEvent(onEventRef.current, message)
        lastLoggedAt[key] = now
      }
    }

    getFaceDetector()
      .then((detector) => {
        if (disposed) return

        const analyzeFrame = (frameTime: number) => {
          if (disposed) return
          const video = videoElementRef.current
          if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            animationFrame = requestAnimationFrame(analyzeFrame)
            return
          }
          if (frameTime - lastAnalysisTime < ANALYSIS_INTERVAL_MS) {
            animationFrame = requestAnimationFrame(analyzeFrame)
            return
          }
          lastAnalysisTime = frameTime

          try {
            const detections    = detector.detectForVideo(video, performance.now()).detections
            const facesDetected = detections.length
            const facePresence  = facesDetected > 0
            const multiplePeople = facesDetected > 1
            const primary       = detections[0]
            const box           = primary?.boundingBox

            // ── Bounding-box attention (face centred & large enough) ──────
            const centerX = box ? (box.originX + box.width  / 2) / video.videoWidth  : 0
            const centerY = box ? (box.originY + box.height / 2) / video.videoHeight : 0
            const faceArea = box
              ? (box.width * box.height) / (video.videoWidth * video.videoHeight)
              : 0
            const attentionFocused =
              facePresence && !multiplePeople &&
              centerX >= 0.2 && centerX <= 0.8 &&
              centerY >= 0.15 && centerY <= 0.85 &&
              faceArea >= 0.025

            // ── Gaze estimation from keypoints ────────────────────────────
            const { direction, yawAsymmetry } = estimateGaze(primary?.keypoints as Array<{ x: number; y: number }> | undefined)
            const lookingAway =
              facePresence &&
              !multiplePeople &&
              direction !== 'center' &&
              direction !== 'unknown'

            // ── Confidence ────────────────────────────────────────────────
            const confidence = Math.round(
              Math.max(0, ...detections.map((d) => d.categories[0]?.score ?? 0)) * 100
            )

            // ── Suspicious flags ──────────────────────────────────────────
            const suspicious: string[] = []
            if (!facePresence) suspicious.push('Face not detected')
            if (multiplePeople) suspicious.push('Multiple people detected')
            if (facePresence && !multiplePeople && !attentionFocused) suspicious.push('Face outside focus area')
            if (lookingAway) {
              const label =
                direction === 'left'  ? 'Looking LEFT (away from screen)' :
                direction === 'right' ? 'Looking RIGHT (away from screen)' :
                direction === 'up'    ? 'Looking UP (away from screen)' :
                                        'Looking away from screen'
              suspicious.push(label)
            }

            // ── Sustained-condition events ────────────────────────────────
            const now = Date.now()
            recordSustainedCondition('noFace', !facePresence, 'Face absent for more than 1.5 seconds', now)
            recordSustainedCondition('multiplePeople', multiplePeople, 'Multiple people detected', now)
            recordSustainedCondition(
              'outsideFocus',
              facePresence && !multiplePeople && !attentionFocused,
              'Candidate moved outside the camera focus area',
              now
            )
            recordSustainedCondition(
              'lookingAway',
              lookingAway,
              `Candidate looked away from the screen (gaze: ${direction}, yaw ratio: ${yawAsymmetry.toFixed(2)})`,
              now
            )

            onStatusRef.current({
              facesDetected,
              facePresence,
              attentionFocused,
              multiplePeople,
              suspicious,
              confidence,
              modelReady: true,
              modelError: null,
              lookingAway,
              gazeDirection: facePresence ? direction : 'unknown',
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Face analysis failed'
            onStatusRef.current({ ...initialStatus, modelReady: true, modelError: message })
          }
          animationFrame = requestAnimationFrame(analyzeFrame)
        }

        animationFrame = requestAnimationFrame(analyzeFrame)
      })
      .catch((error) => {
        if (disposed) return
        const message = error instanceof Error ? error.message : 'ML model could not be loaded'
        onStatusRef.current({ ...initialStatus, modelError: message })
        logEvent(onEventRef.current, `Model unavailable: ${message}`)
      })

    return () => {
      disposed = true
      if (animationFrame !== null) cancelAnimationFrame(animationFrame)
    }
  }, [active, videoElementRef])
}
