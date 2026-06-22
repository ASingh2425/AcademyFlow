import { useEffect, useRef } from 'react'
import { getFaceDetector } from '../lib/faceDetector'
import type { ProctorEvent } from '../types'

export interface AIProctorStatus {
  facesDetected: number
  facePresence: boolean
  attentionFocused: boolean
  multiplePeople: boolean
  suspicious: string[]
  confidence: number
  modelReady: boolean
  modelError: string | null
}

function logEvent(onEvent: (event: ProctorEvent) => void, message: string) {
  onEvent({
    timestamp: new Date().toISOString(),
    message: `ML Proctor: ${message}`,
  })
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
    const CONDITION_GRACE_MS = 1500
    const EVENT_COOLDOWN_MS = 10_000

    const initialStatus: AIProctorStatus = {
      facesDetected: 0,
      facePresence: false,
      attentionFocused: false,
      multiplePeople: false,
      suspicious: [],
      confidence: 0,
      modelReady: false,
      modelError: null,
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
      const sustained = now - conditionStartedAt[key] >= CONDITION_GRACE_MS
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
            const detections = detector.detectForVideo(video, performance.now()).detections
            const facesDetected = detections.length
            const facePresence = facesDetected > 0
            const multiplePeople = facesDetected > 1
            const primary = detections[0]
            const box = primary?.boundingBox
            const centerX = box ? (box.originX + box.width / 2) / video.videoWidth : 0
            const centerY = box ? (box.originY + box.height / 2) / video.videoHeight : 0
            const faceArea = box ? (box.width * box.height) / (video.videoWidth * video.videoHeight) : 0
            const attentionFocused = facePresence && !multiplePeople &&
              centerX >= 0.2 && centerX <= 0.8 && centerY >= 0.15 && centerY <= 0.85 &&
              faceArea >= 0.025
            const confidence = Math.round(
              Math.max(0, ...detections.map((detection) => detection.categories[0]?.score ?? 0)) * 100
            )
            const suspicious: string[] = []
            if (!facePresence) suspicious.push('Face not detected')
            if (multiplePeople) suspicious.push('Multiple people detected')
            if (facePresence && !multiplePeople && !attentionFocused) suspicious.push('Face outside focus area')

            const now = Date.now()
            recordSustainedCondition('noFace', !facePresence, 'Face absent for more than 1.5 seconds', now)
            recordSustainedCondition('multiplePeople', multiplePeople, 'Multiple people detected', now)
            recordSustainedCondition(
              'outsideFocus',
              facePresence && !multiplePeople && !attentionFocused,
              'Candidate moved outside the camera focus area',
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
