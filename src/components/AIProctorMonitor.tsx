import { useState } from 'react'
import { AlertTriangle, CheckCircle, Eye, Users, Zap } from 'lucide-react'
import { useAIProctoring, type AIProctorStatus } from '../hooks/useAIProctoring'
import type { ProctorEvent } from '../types'

interface AIProctorMonitorProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  active: boolean
  onProctorEvent: (event: ProctorEvent) => void
}

export function AIProctorMonitor({
  videoRef,
  active,
  onProctorEvent,
}: AIProctorMonitorProps) {
  const [aiStatus, setAiStatus] = useState<AIProctorStatus>({
    facesDetected: 0,
    facePresence: false,
    attentionFocused: false,
    multiplePeople: false,
    suspicious: [],
    confidence: 0,
    modelReady: false,
    modelError: null,
  })

  useAIProctoring(videoRef, active, onProctorEvent, setAiStatus)

  const riskLevel =
    aiStatus.suspicious.length === 0
      ? 'low'
      : aiStatus.suspicious.length === 1
        ? 'medium'
        : 'high'

  const riskColor = {
    low: 'border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30',
    medium: 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30',
    high: 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-950/30',
  }

  const riskTextColor = {
    low: 'text-emerald-700 dark:text-emerald-300',
    medium: 'text-amber-700 dark:text-amber-300',
    high: 'text-red-700 dark:text-red-300',
  }

  const riskBadgeColor = {
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-red-500',
  }

  return (
    <div className="space-y-3">
      {/* Risk Level */}
      <div className={`rounded-lg border-2 p-3 ${riskColor[riskLevel]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${riskBadgeColor[riskLevel]} animate-pulse`}
            />
            <span className={`text-xs font-bold uppercase tracking-wider ${riskTextColor[riskLevel]}`}>
              {riskLevel === 'low' && '✓ Low Risk'}
              {riskLevel === 'medium' && '⚠ Medium Risk'}
              {riskLevel === 'high' && '🚨 High Risk'}
            </span>
          </div>
          <span className={`text-xs font-mono font-semibold ${riskTextColor[riskLevel]}`}>
            {aiStatus.modelReady ? `${aiStatus.confidence}% detection confidence` : 'Loading model…'}
          </span>
        </div>
      </div>

      {/* AI Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Face Detection */}
        <div
          className={`rounded-lg border p-3 transition-all ${
            aiStatus.facePresence
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30'
              : 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-950/30'
          }`}
        >
          <div className="flex items-start gap-2">
            <CheckCircle
              className={`h-4 w-4 shrink-0 ${
                aiStatus.facePresence
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Face Detection
              </p>
              <p
                className={`text-xs font-mono ${
                  aiStatus.facePresence
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {aiStatus.facePresence ? 'Detected' : 'Missing'}
              </p>
            </div>
          </div>
        </div>

        {/* Eye Contact */}
        <div
          className={`rounded-lg border p-3 transition-all ${
            aiStatus.attentionFocused && aiStatus.facePresence
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30'
              : 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30'
          }`}
        >
          <div className="flex items-start gap-2">
            <Eye
              className={`h-4 w-4 shrink-0 ${
                aiStatus.attentionFocused && aiStatus.facePresence
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Face Position
              </p>
              <p
                className={`text-xs font-mono ${
                  aiStatus.attentionFocused && aiStatus.facePresence
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-amber-700 dark:text-amber-300'
                }`}
              >
                {aiStatus.attentionFocused && aiStatus.facePresence
                  ? 'In Focus'
                  : 'Outside Focus'}
              </p>
            </div>
          </div>
        </div>

        {/* People Count */}
        <div
          className={`rounded-lg border p-3 transition-all ${
            !aiStatus.multiplePeople
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30'
              : 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-950/30'
          }`}
        >
          <div className="flex items-start gap-2">
            <Users
              className={`h-4 w-4 shrink-0 ${
                !aiStatus.multiplePeople
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                People Detected
              </p>
              <p
                className={`text-xs font-mono font-bold ${
                  !aiStatus.multiplePeople
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {aiStatus.facesDetected}
                {aiStatus.multiplePeople ? ' (⚠ Multiple)' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Threat Level */}
        <div
          className={`rounded-lg border p-3 transition-all ${
            aiStatus.suspicious.length === 0
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30'
              : 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-950/30'
          }`}
        >
          <div className="flex items-start gap-2">
            <Zap
              className={`h-4 w-4 shrink-0 ${
                aiStatus.suspicious.length === 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Threat Level
              </p>
              <p
                className={`text-xs font-mono font-bold ${
                  aiStatus.suspicious.length === 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {aiStatus.suspicious.length === 0 ? 'Safe' : `${aiStatus.suspicious.length} alerts`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Suspicious Activities */}
      {aiStatus.modelError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          ML model error: {aiStatus.modelError}
        </div>
      )}
      {aiStatus.suspicious.length > 0 && (
        <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-600 dark:bg-red-950/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-xs font-semibold text-red-700 dark:text-red-300">
              Flagged Activities
            </p>
          </div>
          <ul className="space-y-1">
            {aiStatus.suspicious.map((flag, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Info */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-2 dark:border-indigo-600 dark:bg-indigo-950/20">
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          🤖 <span className="font-semibold">AI Proctor</span> — Real-time face & behavior analysis. All monitoring is browser-based and private.
        </p>
      </div>
    </div>
  )
}
