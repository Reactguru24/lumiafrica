'use client'

import type { ProductColorOption } from '@/lib/constants/productColors'
import type { ProductVariant } from '@/lib/utils/productVariants'
import { updateVariantStock } from '@/lib/utils/productVariants'

type VariantStockMatrixProps = {
  sizes: string[]
  colors: ProductColorOption[]
  variants: ProductVariant[]
  onChange: (variants: ProductVariant[]) => void
  error?: string
}

export function VariantStockMatrix({ sizes, colors, variants, onChange, error }: VariantStockMatrixProps) {
  if (!sizes.length || !colors.length) {
    return (
      <p className="text-sm text-gray-500">
        Add sizes and colors above to set stock for each combination.
      </p>
    )
  }

  return (
    <div>
      <label className="text-sm font-medium">Stock by size & color</label>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">
        Set how many units you have for each size and color combination.
      </p>
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Size</th>
              {colors.map((color) => (
                <th key={color.code} className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300 min-w-[7rem]">
                  <span className="inline-flex items-center gap-1.5 justify-center">
                    <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: color.code }} />
                    {color.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizes.map((size) => (
              <tr key={size} className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-3 py-2 font-medium">{size}</td>
                {colors.map((color) => {
                  const stock = variants.find((variant) => variant.size === size && variant.color === color.name)?.stock ?? 0
                  return (
                    <td key={`${size}-${color.code}`} className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={stock || ''}
                        onChange={(e) => onChange(updateVariantStock(variants, size, color.name, Number(e.target.value)))}
                        className="input-field text-center py-1.5"
                        aria-label={`Stock for ${size} ${color.name}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
