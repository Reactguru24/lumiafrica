'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/common/Modal'
import { SparklesIcon, CameraIcon } from '@heroicons/react/24/outline'

type FittingResult = {
  validation: {
    valid: boolean
    message: string
    code: string
  }
  measurements?: {
    chest: number
    waist: number
    hips: number
    height: number
  }
  recommendation?: {
    size: string
    confidence: number
    alternatives: string[]
  }
  fit_analysis?: {
    chest_fit: string
    waist_fit: string
    length_fit: string
  }
}

type VirtualFittingModalProps = {
  open: boolean
  onClose: () => void
  productId: string
  productName: string
  onSelectSize?: (size: string) => void
}

export function VirtualFittingModal({
  open,
  onClose,
  productId,
  productName,
  onSelectSize,
}: VirtualFittingModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FittingResult | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function reset() {
    setResult(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleAnalyze() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast.warning('Please upload a full-body photo')
      return
    }

    const formData = new FormData()
    formData.append('user_image', file)
    formData.append('product_id', productId)
    if (height) formData.append('height', height)
    if (weight) formData.append('weight', weight)

    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/virtual-fitting/analyze', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Could not analyze photo')
        return
      }
      setResult(data)
      if (!data.validation?.valid) {
        toast.error(data.validation?.message || 'Photo did not pass validation')
      }
    } catch {
      toast.error('Virtual fitting service is unavailable')
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setPreview(null)
      return
    }
    setPreview(URL.createObjectURL(file))
    setResult(null)
  }

  function applySize(size: string) {
    onSelectSize?.(size)
    toast.success(`Size ${size} selected`)
    handleClose()
  }

  const fitLabel = (fit: string) => {
    if (fit === 'perfect') return 'Perfect fit'
    if (fit === 'tight') return 'Snug'
    if (fit === 'loose') return 'Relaxed'
    if (fit === 'short') return 'May run short'
    if (fit === 'long') return 'May run long'
    return fit
  }

  return (
    <Modal
      open={open}
      title="AI Size Fitting"
      onClose={handleClose}
      size="md"
      footer={
        <button type="button" className="btn-primary w-full sm:w-auto" disabled={loading} onClick={handleAnalyze}>
          {loading ? 'Analyzing…' : 'Analyze photo'}
        </button>
      }
    >
      <p className="text-sm text-gray-500 mb-4">
        Upload a full-body photo to get a size recommendation for <span className="font-medium text-gray-700 dark:text-gray-300">{productName}</span>.
      </p>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Photo</span>
          <div
            className="mt-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded object-contain" />
            ) : (
              <div className="text-gray-400">
                <CameraIcon className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm">Click to upload a full-body photo</p>
                <p className="text-xs mt-1">Stand straight, good lighting, fitted clothing</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={handleFileChange} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="text-sm font-medium">Height (cm)</span>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 170" className="input-field mt-1" />
          </label>
          <label>
            <span className="text-sm font-medium">Weight (kg)</span>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 65" className="input-field mt-1" />
          </label>
        </div>

        {result?.validation?.valid && result.measurements && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 text-sm space-y-2">
            <p className="font-medium flex items-center gap-1.5">
              <SparklesIcon className="w-4 h-4 text-brand-teal" />
              Measurements (estimated)
            </p>
            <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
              <span>Chest: {result.measurements.chest.toFixed(1)} cm</span>
              <span>Waist: {result.measurements.waist.toFixed(1)} cm</span>
              <span>Hips: {result.measurements.hips.toFixed(1)} cm</span>
              <span>Height: {result.measurements.height.toFixed(1)} cm</span>
            </div>
          </div>
        )}

        {result?.recommendation && (
          <div className="rounded-lg border border-brand-teal/30 bg-brand-teal/5 p-4">
            <p className="font-semibold text-lg">
              Recommended: {result.recommendation.size}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({result.recommendation.confidence}% match)
              </span>
            </p>
            {result.recommendation.alternatives.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Alternatives: {result.recommendation.alternatives.join(', ')}
              </p>
            )}
            {result.fit_analysis && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-900 border">
                  Chest: {fitLabel(result.fit_analysis.chest_fit)}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-900 border">
                  Waist: {fitLabel(result.fit_analysis.waist_fit)}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-900 border">
                  Length: {fitLabel(result.fit_analysis.length_fit)}
                </span>
              </div>
            )}
            <button
              type="button"
              className="btn-primary mt-4 w-full"
              onClick={() => applySize(result.recommendation!.size)}
            >
              Use size {result.recommendation.size}
            </button>
          </div>
        )}

        {result && !result.validation?.valid && (
          <p className="text-sm text-red-600">{result.validation.message}</p>
        )}
      </div>
    </Modal>
  )
}

export function VirtualFittingButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-sm border-2 border-brand-teal bg-brand-teal/15 text-brand-teal dark:border-brand-orange dark:bg-brand-orange/15 dark:text-brand-orange hover:bg-brand-teal/25 dark:hover:bg-brand-orange/25 transition-colors shadow-sm"
      onClick={onClick}
    >
      <SparklesIcon className="w-5 h-5" />
      AI Size Fitting
    </button>
  )
}
