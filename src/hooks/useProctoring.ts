import { useEffect, useRef } from 'react'
import type { ProctorEvent } from '../types'

function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function logEvent(onEvent: (e: ProctorEvent) => void, msg: string) {
  const now = new Date()
  onEvent({
    timestamp: now.toISOString(),
    message: `Event Flagged: ${formatEventTime(now)} — ${msg}`,
  })
}

export function useProctoring(
  active: boolean,
  onEvent: (event: ProctorEvent) => void
): void {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!active) return

    const fire = (msg: string) => logEvent(onEventRef.current, msg)

    // Tab/window focus loss
    const handleBlur = () => fire('Tab focus lost (potential external look-up)')
    window.addEventListener('blur', handleBlur)

    // Copy / cut / paste
    const handleCopy = () => fire('Text copy attempted')
    const handleCut = () => fire('Text cut attempted')
    const handlePaste = () => fire('Paste attempted')
    document.addEventListener('copy', handleCopy)
    document.addEventListener('cut', handleCut)
    document.addEventListener('paste', handlePaste)

    // Right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      fire('Right-click / context menu attempted')
    }
    document.addEventListener('contextmenu', handleContextMenu)

    // Keyboard shortcuts — Ctrl/Meta+C, Ctrl/Meta+V, PrintScreen, etc.
    const handleKeydown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && (e.key === 'c' || e.key === 'C')) fire('Ctrl+C shortcut detected')
      else if (ctrl && (e.key === 'v' || e.key === 'V')) fire('Ctrl+V shortcut detected')
      else if (ctrl && (e.key === 'Tab')) fire('Ctrl+Tab (tab switch shortcut) detected')
      else if (e.key === 'PrintScreen') fire('PrintScreen key pressed')
      else if (e.altKey && e.key === 'Tab') fire('Alt+Tab (window switch shortcut) detected')
    }
    document.addEventListener('keydown', handleKeydown)

    // Window resize — large width drop may indicate DevTools opened on side
    let lastWidth = window.innerWidth
    const handleResize = () => {
      const diff = lastWidth - window.innerWidth
      if (diff > 200) fire(`Window resized significantly (possible DevTools opened: −${diff}px)`)
      lastWidth = window.innerWidth
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('resize', handleResize)
    }
  }, [active])
}
