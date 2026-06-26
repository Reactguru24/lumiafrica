'use client'

import { useState } from 'react'
import { PRODUCT_COLOR_PRESETS, colorNameFromHex, type ProductColorOption } from '@/lib/constants/productColors'

type ColorPalettePickerProps = {
  value: ProductColorOption[]
  onChange: (colors: ProductColorOption[]) => void
  error?: string
}

export function ColorPalettePicker({ value, onChange, error }: ColorPalettePickerProps) {
  const [customHex, setCustomHex] = useState('#2563EB')

  function isSelected(color: ProductColorOption) {
    return value.some((c) => c.code.toUpperCase() === color.code.toUpperCase())
  }

  function togglePreset(color: ProductColorOption) {
    if (isSelected(color)) {
      onChange(value.filter((c) => c.code.toUpperCase() !== color.code.toUpperCase()))
      return
    }
    onChange([...value, color])
  }

  function addCustomColor() {
    const code = customHex.toUpperCase()
    if (value.some((c) => c.code.toUpperCase() === code)) return
    onChange([...value, { name: colorNameFromHex(code), code }])
  }

  function removeColor(code: string) {
    onChange(value.filter((c) => c.code.toUpperCase() !== code.toUpperCase()))
  }

  return (
    <div>
      <label className="text-sm font-medium">Colors</label>
      <p className="text-xs text-gray-500 mt-0.5 mb-2">Tap swatches to add or remove colors for this product.</p>
      <div className="flex flex-wrap gap-2 mt-1">
        {PRODUCT_COLOR_PRESETS.map((color) => (
          <button
            key={color.code}
            type="button"
            title={color.name}
            aria-label={color.name}
            className={`w-9 h-9 rounded-full border-2 transition-all ${isSelected(color) ? 'border-gray-900 dark:border-white scale-110 ring-2 ring-brand-teal/40' : 'border-gray-300 dark:border-gray-600 hover:scale-105'}`}
            style={{ backgroundColor: color.code }}
            onClick={() => togglePreset(color)}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <input
          type="color"
          value={customHex}
          onChange={(e) => setCustomHex(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600 p-0.5"
          aria-label="Pick custom color"
        />
        <button type="button" className="btn-secondary text-xs py-1.5 px-3" onClick={addCustomColor}>
          Add custom color
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {value.map((color) => (
            <span
              key={color.code}
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <span className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: color.code }} />
              {color.name}
              <button
                type="button"
                className="text-gray-500 hover:text-red-600 ml-0.5"
                onClick={() => removeColor(color.code)}
                aria-label={`Remove ${color.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
