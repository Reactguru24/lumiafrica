/** Clothing-focused Unsplash images — actual apparel photography */

const CLOTHING_IMAGES = [
  'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1483985988350-763728e1935b?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&h=1000&fit=crop&q=80',
]

const CATEGORY_IMAGES: Record<string, string[]> = {
  men: [
    'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000&fit=crop&q=80',
  ],
  women: [
    'https://images.unsplash.com/photo-1483985988350-763728e1935b?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=1000&fit=crop&q=80',
  ],
  kids: [
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519238263530-822cce3a87eb?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&h=1000&fit=crop&q=80',
  ],
  accessories: [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622560480605-d83cfcb34062?w=800&h=1000&fit=crop&q=80',
  ],
  footwear: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&h=1000&fit=crop&q=80',
  ],
}

const HERO_IMAGES = {
  men: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1600&h=900&fit=crop&q=80',
  women: 'https://images.unsplash.com/photo-1483985988350-763728e1935b?w=1600&h=900&fit=crop&q=80',
  kids: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1600&h=900&fit=crop&q=80',
  teens: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1600&h=900&fit=crop&q=80',
  accessories: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1600&h=900&fit=crop&q=80',
  footwear: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&h=900&fit=crop&q=80',
}

const STORE_IMAGES = [
  'https://images.unsplash.com/photo-1441984904996-e0b495a9b1da?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=400&fit=crop&q=80',
]

const BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1441984904996-e0b495a9b1da?w=1200&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1483985988350-763728e1935b?w=1200&h=400&fit=crop&q=80',
]

function withSize(url: string, width: number, height: number): string {
  const base = url.split('?')[0]
  return `${base}?w=${width}&h=${height}&fit=crop&q=80`
}

export function clothingImage(index: number, width = 600, height = 800): string {
  const base = CLOTHING_IMAGES[index % CLOTHING_IMAGES.length]
  return withSize(base, width, height)
}

export function categoryClothingImage(category: string, index: number, width = 600, height = 800): string {
  const pool = CATEGORY_IMAGES[category] ?? CLOTHING_IMAGES
  const base = pool[index % pool.length]
  return withSize(base, width, height)
}

export function heroImage(key: keyof typeof HERO_IMAGES): string {
  return HERO_IMAGES[key]
}

export function storeLogoImage(index: number): string {
  return STORE_IMAGES[index % STORE_IMAGES.length]
}

export function storeBannerImage(index: number): string {
  return BANNER_IMAGES[index % BANNER_IMAGES.length]
}

export { HERO_IMAGES, CLOTHING_IMAGES, CATEGORY_IMAGES }
