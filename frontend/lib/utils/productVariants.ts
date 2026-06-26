import type { ProductColorOption } from '@/lib/constants/productColors'

export type ProductVariant = {
  size: string
  color: string
  stock: number
}

export function variantKey(size: string, color: string) {
  return `${size}|${color}`
}

export function totalVariantStock(variants: ProductVariant[]) {
  return variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)
}

export function getVariantStock(variants: ProductVariant[] | undefined, size: string, color: string) {
  return variants?.find((variant) => variant.size === size && variant.color === color)?.stock ?? 0
}

export function buildVariantMatrix(
  sizes: string[],
  colors: ProductColorOption[],
  existing: ProductVariant[] = [],
) {
  const lookup = new Map(existing.map((variant) => [variantKey(variant.size, variant.color), variant.stock]))
  const matrix: ProductVariant[] = []
  for (const size of sizes) {
    for (const color of colors) {
      matrix.push({
        size,
        color: color.name,
        stock: lookup.get(variantKey(size, color.name)) ?? 0,
      })
    }
  }
  return matrix
}

export function updateVariantStock(
  variants: ProductVariant[],
  size: string,
  color: string,
  stock: number,
) {
  return variants.map((variant) =>
    variant.size === size && variant.color === color
      ? { ...variant, stock: Math.max(0, stock) }
      : variant,
  )
}
