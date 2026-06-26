export type ProductColorOption = {
  name: string
  code: string
}

export const PRODUCT_COLOR_PRESETS: ProductColorOption[] = [
  { name: 'Black', code: '#000000' },
  { name: 'White', code: '#FFFFFF' },
  { name: 'Navy', code: '#1B2A4A' },
  { name: 'Grey', code: '#9CA3AF' },
  { name: 'Red', code: '#DC2626' },
  { name: 'Blue', code: '#2563EB' },
  { name: 'Green', code: '#16A34A' },
  { name: 'Yellow', code: '#EAB308' },
  { name: 'Orange', code: '#EA580C' },
  { name: 'Pink', code: '#EC4899' },
  { name: 'Purple', code: '#7C3AED' },
  { name: 'Brown', code: '#92400E' },
  { name: 'Beige', code: '#D6C4A8' },
  { name: 'Maroon', code: '#7F1D1D' },
  { name: 'Teal', code: '#0D9488' },
  { name: 'Gold', code: '#CA8A04' },
  // Common catalog names used by vendors / seed data
  { name: 'Multi', code: '#BE123C' },
  { name: 'Floral', code: '#E11D48' },
  { name: 'Ivory', code: '#FFF8E7' },
  { name: 'Cream', code: '#F5E6C8' },
  { name: 'Natural', code: '#D6B98C' },
  { name: 'Sand', code: '#D8C3A5' },
  { name: 'Khaki', code: '#C2A36A' },
  { name: 'Tan', code: '#B45309' },
  { name: 'Light Blue', code: '#93C5FD' },
  { name: 'Olive', code: '#3F6212' },
]

const PRESET_BY_NAME = new Map(
  PRODUCT_COLOR_PRESETS.map((c) => [c.name.trim().toLowerCase(), c.code.toUpperCase()]),
)

export function presetCodeForName(name: string): string | undefined {
  return PRESET_BY_NAME.get(name.trim().toLowerCase())
}

function ensureHex(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`
}

export function colorNameFromHex(hex: string): string {
  const normalized = ensureHex(hex)
  const preset = PRODUCT_COLOR_PRESETS.find((c) => c.code.toUpperCase() === normalized)
  if (preset) return preset.name
  return `Custom (${normalized})`
}

export function normalizeProductColor(
  color: { name?: string; code?: string; hex?: string } | string,
): ProductColorOption {
  if (typeof color === 'string') {
    const name = color.trim()
    return {
      name,
      code: presetCodeForName(name) || '#9CA3AF',
    }
  }

  const name = color.name?.trim() || ''
  const rawCode = ensureHex(color.code || color.hex || '')
  const presetByName = name ? presetCodeForName(name) : undefined

  let code = rawCode
  if (!code) {
    code = presetByName || '#9CA3AF'
  } else if (
    code === '#000000'
    && presetByName
    && name.toLowerCase() !== 'black'
  ) {
    // Repair legacy rows that saved black when hex was missing
    code = presetByName
  }

  return {
    name: name || colorNameFromHex(code),
    code,
  }
}

export function parseProductColors(colors: unknown[] | undefined | null): ProductColorOption[] {
  if (!colors?.length) return []
  return colors.map((color) => normalizeProductColor(color as { name?: string; code?: string; hex?: string } | string))
}
