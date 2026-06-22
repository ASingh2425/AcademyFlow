import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

let detectorPromise: Promise<FaceDetector> | null = null

function assetPath(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/?$/, '/')}${path.replace(/^\//, '')}`
}

async function createDetector(): Promise<FaceDetector> {
  const vision = await FilesetResolver.forVisionTasks(assetPath('mediapipe'))
  const options = {
    baseOptions: { modelAssetPath: assetPath('models/blaze_face_short_range.tflite') },
    runningMode: 'VIDEO' as const,
    minDetectionConfidence: 0.65,
    minSuppressionThreshold: 0.3,
  }

  try {
    return await FaceDetector.createFromOptions(vision, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'GPU' },
    })
  } catch {
    return FaceDetector.createFromOptions(vision, options)
  }
}

export function getFaceDetector(): Promise<FaceDetector> {
  detectorPromise ??= createDetector().catch((error) => {
    detectorPromise = null
    throw error
  })
  return detectorPromise
}

