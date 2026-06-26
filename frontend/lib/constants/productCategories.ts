export type ProductCategoryValue = 'men' | 'women' | 'kids' | 'accessories' | 'footwear'

export type ProductSubcategoryValue =
  | 't-shirts'
  | 'shirts'
  | 'hoodies'
  | 'jackets'
  | 'jeans'
  | 'trousers'
  | 'suits'
  | 'dresses'
  | 'tops'
  | 'blouses'
  | 'skirts'
  | 'boys'
  | 'girls'
  | 'baby-wear'
  | 'bags'
  | 'belts'
  | 'caps'
  | 'watches'
  | 'sunglasses'
  | 'sneakers'
  | 'boots'
  | 'sandals'
  | 'heels'

export const PRODUCT_CATEGORIES: { value: ProductCategoryValue; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'kids', label: 'Kids' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'footwear', label: 'Footwear' },
]

export const PRODUCT_SUBCATEGORIES: Record<ProductCategoryValue, { value: ProductSubcategoryValue; label: string }[]> = {
  men: [
    { value: 't-shirts', label: 'T-Shirts' },
    { value: 'shirts', label: 'Shirts' },
    { value: 'hoodies', label: 'Hoodies' },
    { value: 'jackets', label: 'Jackets' },
    { value: 'jeans', label: 'Jeans' },
    { value: 'trousers', label: 'Trousers' },
    { value: 'suits', label: 'Suits' },
  ],
  women: [
    { value: 'dresses', label: 'Dresses' },
    { value: 'tops', label: 'Tops' },
    { value: 'blouses', label: 'Blouses' },
    { value: 'skirts', label: 'Skirts' },
    { value: 'jeans', label: 'Jeans' },
    { value: 'jackets', label: 'Jackets' },
  ],
  kids: [
    { value: 'boys', label: 'Boys' },
    { value: 'girls', label: 'Girls' },
    { value: 'baby-wear', label: 'Baby Wear' },
  ],
  accessories: [
    { value: 'bags', label: 'Bags' },
    { value: 'belts', label: 'Belts' },
    { value: 'caps', label: 'Caps' },
    { value: 'watches', label: 'Watches' },
    { value: 'sunglasses', label: 'Sunglasses' },
  ],
  footwear: [
    { value: 'sneakers', label: 'Sneakers' },
    { value: 'boots', label: 'Boots' },
    { value: 'sandals', label: 'Sandals' },
    { value: 'heels', label: 'Heels' },
  ],
}

export function getAvailableSubcategories(category: string) {
  return PRODUCT_SUBCATEGORIES[category as ProductCategoryValue] ?? []
}
