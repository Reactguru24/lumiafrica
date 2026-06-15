'use client'

import { useCallback, useRef, useState } from 'react'
import type { CropSession } from '@/lib/hooks/useImageUploadWithCrop'
import {
  displayCropToNatural,
  exportCroppedImage,
  getDisplayedImageBounds,
  getInitialCropRect,
  getMaxDisplayCropSize,
  naturalCropToDisplay,
  type CropRect,
} from '@/lib/utils/imageProcessing'

const CONTAINER = { width: 320, height: 280 }

interface ImageCropDialogProps {
  session: CropSession
  onConfirm: (file: File) => void
  onCancel: () => void
}

export function ImageCropDialog({ session, onConfirm, onCancel }: ImageCropDialogProps) {
  const { image, preset } = session
  const naturalWidth = image.naturalWidth
  const naturalHeight = image.naturalHeight
  const bounds = getDisplayedImageBounds(naturalWidth, naturalHeight, CONTAINER.width, CONTAINER.height)
  const maxCrop = getMaxDisplayCropSize(bounds, preset)

  const [naturalCrop, setNaturalCrop] = useState(() =>
    getInitialCropRect(naturalWidth, naturalHeight, preset),
  )
  const [displayCrop, setDisplayCrop] = useState(() =>
    naturalCropToDisplay(getInitialCropRect(naturalWidth, naturalHeight, preset), bounds),
  )
  const [processing, setProcessing] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; crop: CropRect } | null>(null)

  const syncNatural = useCallback((nextDisplay: CropRect) => {
    const nextNatural = displayCropToNatural(nextDisplay, bounds, naturalWidth, naturalHeight)
    setDisplayCrop(naturalCropToDisplay(nextNatural, bounds))
    setNaturalCrop(nextNatural)
  }, [bounds, naturalWidth, naturalHeight])

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, crop: { ...displayCrop } }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const next = {
      ...dragRef.current.crop,
      x: dragRef.current.crop.x + dx,
      y: dragRef.current.crop.y + dy,
    }
    next.x = Math.max(bounds.x, Math.min(next.x, bounds.x + bounds.width - next.width))
    next.y = Math.max(bounds.y, Math.min(next.y, bounds.y + bounds.height - next.height))
    syncNatural(next)
  }

  function onPointerUp() {
    dragRef.current = null
  }

  async function handleConfirm() {
    setProcessing(true)
    try {
      const file = await exportCroppedImage(image, naturalCrop, preset)
      onConfirm(file)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-5">
        <h3 className="font-semibold mb-1">Crop {preset.label}</h3>
        <p className="text-xs text-gray-500 mb-4">
          Output: {preset.width}×{preset.height}px · drag to reposition
        </p>
        <div
          className="relative mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
          style={{ width: CONTAINER.width, height: CONTAINER.height }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={session.imageSrc}
            alt="Crop preview"
            className="absolute"
            style={{
              left: bounds.x,
              top: bounds.y,
              width: bounds.width,
              height: bounds.height,
            }}
            draggable={false}
          />
          <div
            className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] cursor-move"
            style={{
              left: displayCrop.x,
              top: displayCrop.y,
              width: displayCrop.width || maxCrop.width,
              height: displayCrop.height || maxCrop.height,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
        <div className="flex gap-3 mt-5">
          <button type="button" className="btn-secondary flex-1" onClick={onCancel} disabled={processing}>
            Cancel
          </button>
          <button type="button" className="btn-primary flex-1" onClick={handleConfirm} disabled={processing}>
            {processing ? 'Processing…' : 'Use image'}
          </button>
        </div>
      </div>
    </div>
  )
}
