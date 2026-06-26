/** Shop mega-menu → product filter mapping */
export const SHOP_CATEGORIES: Record<string, { slug: string; items: string[] }> = {
  Men: { slug: 'men', items: ['T-Shirts', 'Shirts', 'Hoodies', 'Jackets', 'Jeans', 'Trousers', 'Suits'] },
  Women: { slug: 'women', items: ['Dresses', 'Tops', 'Blouses', 'Skirts', 'Jeans', 'Jackets'] },
  Kids: { slug: 'kids', items: ['Boys', 'Girls', 'Baby Wear'] },
  Accessories: { slug: 'accessories', items: ['Bags', 'Belts', 'Caps', 'Watches', 'Sunglasses'] },
  Footwear: { slug: 'footwear', items: ['Sneakers', 'Boots', 'Sandals', 'Heels'] },
}

export function shopCategoryQuery(categoryName: string) {
  const cat = SHOP_CATEGORIES[categoryName]
  return cat ? { category: cat.slug } : {}
}

export function shopSubcategoryQuery(categoryName: string, subcategory: string) {
  const cat = SHOP_CATEGORIES[categoryName]
  return cat ? { category: cat.slug, subcategory } : { subcategory }
}
