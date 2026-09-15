import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MIN_SCALE = 1
const MAX_SCALE = 5
const DOUBLE_TAP_SCALE = 2.5

type DragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

type PinchState = {
  pointerIdA: number
  pointerIdB: number
  startDist: number
  startScale: number
  centerX: number
  centerY: number
  originX: number
  originY: number
}

type PhotoViewerProps = {
  src: string
  alt: string
  onClose: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export default function PhotoViewer({ src, alt, onClose }: PhotoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const pinchRef = useRef<PinchState | null>(null)
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>())
  const lastTapRef = useRef(0)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [loaded, setLoaded] = useState(false)

  // Clamp the offset so the image never leaves a gap at its edges when zoomed.
  const clampOffset = useCallback((nextScale: number, x: number, y: number) => {
    const container = containerRef.current
    const img = imgRef.current
    if (!container || !img) return { x: 0, y: 0 }
    const rect = container.getBoundingClientRect()
    const scaledW = img.clientWidth * nextScale
    const scaledH = img.clientHeight * nextScale
    const maxX = Math.max(0, (scaledW - rect.width) / 2)
    const maxY = Math.max(0, (scaledH - rect.height) / 2)
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) }
  }, [])

  // Zoom keeping the given viewport point (client coords) anchored in place.
  const zoomAt = useCallback(
    (nextScale: number, clientX: number, clientY: number) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      setScale((prevScale) => {
        const target = clamp(nextScale, MIN_SCALE, MAX_SCALE)
        if (target === prevScale) return prevScale
        setOffset((prev) => {
          // Point in image-centered coordinates at the current scale.
          const px = clientX - cx - prev.x
          const py = clientY - cy - prev.y
          const ratio = target / prevScale
          return clampOffset(target, px * ratio, py * ratio)
        })
        return target
      })
    },
    [clampOffset],
  )

  const reset = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  // Reset zoom/pan whenever a different photo is opened.
  useEffect(() => {
    reset()
  }, [src, reset])

  const onPointerDown = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointersRef.current.size === 2) {
      // Second pointer down: switch from dragging to pinching.
      dragRef.current = null
      const [a, b] = [...activePointersRef.current.values()]
      pinchRef.current = {
        pointerIdA: [...activePointersRef.current.keys()][0],
        pointerIdB: [...activePointersRef.current.keys()][1],
        startDist: Math.hypot(a.x - b.x, a.y - b.y),
        startScale: scale,
        centerX: (a.x + b.x) / 2,
        centerY: (a.y + b.y) / 2,
        originX: offset.x,
        originY: offset.y,
      }
    } else if (activePointersRef.current.size === 1) {
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: offset.x,
        originY: offset.y,
      }
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pinch = pinchRef.current
    if (pinch && activePointersRef.current.size === 2) {
      const a = activePointersRef.current.get(pinch.pointerIdA)
      const b = activePointersRef.current.get(pinch.pointerIdB)
      if (!a || !b) return
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const centerX = (a.x + b.x) / 2
      const centerY = (a.y + b.y) / 2
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const target = clamp(pinch.startScale * (dist / pinch.startDist), MIN_SCALE, MAX_SCALE)
      const ratio = target / pinch.startScale
      // Zoom around the pinch midpoint and follow its movement.
      const px = pinch.centerX - (rect.left + rect.width / 2) - pinch.originX
      const py = pinch.centerY - (rect.top + rect.height / 2) - pinch.originY
      setScale(target)
      setOffset(clampOffset(target, px * ratio + (centerX - pinch.centerX), py * ratio + (centerY - pinch.centerY)))
      return
    }
    const drag = dragRef.current
    if (drag && drag.pointerId === e.pointerId && scale > 1) {
      setOffset(clampOffset(scale, drag.originX + (e.clientX - drag.startX), drag.originY + (e.clientY - drag.startY)))
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId)
    if (pinchRef.current && activePointersRef.current.size < 2) {
      pinchRef.current = null
      // If one finger remains after a pinch, restart a drag from it so panning continues smoothly.
      const remaining = [...activePointersRef.current.values()][0]
      if (remaining) {
        dragRef.current = {
          pointerId: [...activePointersRef.current.keys()][0],
          startX: remaining.x,
          startY: remaining.y,
          originX: offset.x,
          originY: offset.y,
        }
      }
      return
    }
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      const moved = Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY)
      dragRef.current = null
      if (moved < 6 && scale === 1) {
        // Treat as a tap: detect double-tap to zoom in.
        const now = Date.now()
        if (now - lastTapRef.current < 300) {
          lastTapRef.current = 0
          zoomAt(DOUBLE_TAP_SCALE, e.clientX, e.clientY)
        } else {
          lastTapRef.current = now
        }
      }
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const direction = e.deltaY > 0 ? -1 : 1
    zoomAt(scale * (1 + direction * 0.25), e.clientX, e.clientY)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    if (scale === 1) {
      zoomAt(DOUBLE_TAP_SCALE, e.clientX, e.clientY)
    } else {
      reset()
    }
  }

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 touch-none select-none"
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={`max-h-full max-w-full transition-transform duration-150 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transitionProperty: dragRef.current || pinchRef.current ? 'opacity' : 'transform, opacity',
        }}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo viewer"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-white">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={scale <= MIN_SCALE}
          onClick={() => zoomAt(scale / 1.5, window.innerWidth / 2, window.innerHeight / 2)}
          className="rounded-full p-1.5 hover:bg-white/20 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M8 11h6" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          onClick={reset}
          disabled={scale === MIN_SCALE}
          className="rounded-full p-1.5 hover:bg-white/20 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={scale >= MAX_SCALE}
          onClick={() => zoomAt(scale * 1.5, window.innerWidth / 2, window.innerHeight / 2)}
          className="rounded-full p-1.5 hover:bg-white/20 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M8 11h6" />
            <path d="M11 8v6" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  )
}
