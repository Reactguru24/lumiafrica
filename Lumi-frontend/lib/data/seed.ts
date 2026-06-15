import type { AppData, Product, User, Vendor, Order, Review, VendorApplication, VendorSubscription, FeaturedListingPlan } from '@/lib/types'
import { getFeaturedListingPlan } from '@/lib/constants/subscriptions'
import { generateId, slugify } from '@/lib/utils/storage'
import { categoryClothingImage, storeLogoImage, storeBannerImage } from '@/lib/utils/images'
import { FREE_SHIPPING_KES, STANDARD_SHIPPING_KES, EXPRESS_SHIPPING_KES, NEXTDAY_SHIPPING_KES } from '@/lib/constants/commerce'

const FIRST_NAMES = ['Amina', 'Wanjiku', 'Otieno', 'Zawadi', 'Kamau', 'Fatima', 'Brian', 'Grace', 'David', 'Lucy', 'James', 'Faith', 'Peter', 'Joy', 'Daniel', 'Mercy', 'Samuel', 'Rose', 'Joseph', 'Anne']
const LAST_NAMES = ['Mwangi', 'Ochieng', 'Njoroge', 'Kimani', 'Wambui', 'Kipchoge', 'Akinyi', 'Mutua', 'Odhiambo', 'Wanjala', 'Kariuki', 'Achieng', 'Mutiso', 'Nyong', 'Kamau', 'Wairimu', 'Omondi', 'Chebet', 'Ndungu', 'Adhiambo']

const VENDOR_NAMES = [
  'Nairobiana', 'Kikoy & Co.', 'Maasai Threads', 'Swahili Style', 'Kilimanjaro Wear',
  'Lake Victoria Boutique', 'Savanna Streetwear', 'Coastal Chic KE', 'Ankara Avenue', 'Ubuntu Fashion',
  'Mombasa Mode', 'Kampala Kouture', 'Dar es Style', 'Kigali Collective', 'Addis Attire',
  'Westlands Wardrobe', 'Kibera Creatives', 'Thika Trends', 'Eldoret Essentials', 'Kisumu Kloset',
]

const BRANDS = ['Sol Generation', 'Vivo Activewear', 'Suave Kenya', 'Nike', 'Adidas', 'Levi\'s', 'H&M', 'Zara', 'Mr Price', 'Woolworths', 'Batian', 'Sandstorm', 'KikoRomeo', 'Adele Dejak', 'Suave']

const CATEGORIES = {
  men: ['T-Shirts', 'Shirts', 'Hoodies', 'Jackets', 'Jeans', 'Trousers', 'Suits'],
  women: ['Dresses', 'Tops', 'Blouses', 'Skirts', 'Jeans', 'Jackets'],
  kids: ['Boys', 'Girls', 'Baby Wear'],
  accessories: ['Bags', 'Belts', 'Caps', 'Watches', 'Sunglasses'],
  footwear: ['Sneakers', 'Boots', 'Sandals', 'Heels'],
}

const SIZES = {
  clothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  footwear: ['6', '7', '8', '9', '10', '11', '12'],
  kids: ['2T', '3T', '4T', '5', '6', '7', '8'],
}

const COLORS = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Grey', hex: '#6b7280' },
  { name: 'Beige', hex: '#d4c5b5' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Brown', hex: '#92400e' },
]

const PRODUCT_ADJECTIVES = ['Classic', 'Premium', 'Essential', 'Modern', 'Vintage', 'Slim Fit', 'Oversized', 'Relaxed', 'Tailored', 'Cropped', 'High-Waist', 'Distressed', 'Organic', 'Linen', 'Wool', 'Cotton']

const COUNTRIES = ['Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Ethiopia']
const CITIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Kampala', 'Dar es Salaam', 'Kigali', 'Addis Ababa']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - randomInt(0, daysAgo))
  return date.toISOString()
}

function productImage(category: string, id: number, w = 600, h = 800): string {
  return categoryClothingImage(category, id, w, h)
}

function generateUsers(count: number): User[] {
  const users: User[] = [
    {
      id: 'admin-1',
      fullName: 'Platform Admin',
      email: 'admin@lumiafrica.com',
      phone: '+254700000001',
      password: 'admin123',
      role: 'ADMIN',
      disabled: false,
      createdAt: randomDate(365),
      addresses: [],
    },
    {
      id: 'customer-demo',
      fullName: 'Demo Customer',
      email: 'customer@lumiafrica.com',
      phone: '+254700000002',
      password: 'customer123',
      role: 'CUSTOMER',
      disabled: false,
      createdAt: randomDate(180),
      addresses: [{
        id: generateId(),
        label: 'Home',
        street: '42 Kenyatta Avenue',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        zipCode: '00100',
        isDefault: true,
      }],
    },
    {
      id: 'vendor-demo',
      fullName: 'Demo Vendor',
      email: 'vendor@lumiafrica.com',
      phone: '+254700000003',
      password: 'vendor123',
      role: 'VENDOR',
      disabled: false,
      createdAt: randomDate(200),
      addresses: [],
    },
  ]

  for (let i = 0; i < count - 3; i++) {
    const first = randomItem(FIRST_NAMES)
    const last = randomItem(LAST_NAMES)
    users.push({
      id: generateId(),
      fullName: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@email.com`,
      phone: `+2547${randomInt(10000000, 99999999)}`,
      password: 'password123',
      role: 'CUSTOMER',
      disabled: Math.random() < 0.02,
      createdAt: randomDate(365),
      addresses: [],
    })
  }
  return users
}

function generateVendors(users: User[]): Vendor[] {
  const vendorUsers = users.filter((u) => u.role === 'VENDOR')
  const vendors: Vendor[] = []

  VENDOR_NAMES.forEach((name, i) => {
    const user = vendorUsers[i] || users[i + 10]
    if (!user) return
    if (user.role === 'CUSTOMER') user.role = 'VENDOR'

    vendors.push({
      id: `vendor-${i + 1}`,
      userId: user.id,
      storeName: name,
      slug: slugify(name),
      description: `${name} offers premium fashion pieces curated for the modern wardrobe. Quality craftsmanship meets contemporary design.`,
      logo: storeLogoImage(i),
      banner: storeBannerImage(i),
      contactPhone: `+2547${randomInt(10000000, 99999999)}`,
      businessEmail: `contact@${slugify(name)}.com`,
      country: randomItem(COUNTRIES),
      city: randomItem(CITIES),
      socialLinks: {
        instagram: `@${slugify(name)}`,
        twitter: `@${slugify(name)}`,
      },
      categories: randomItems(['Men\'s Wear', 'Women\'s Wear', 'Streetwear', 'Sportswear', 'Luxury Fashion', 'Accessories'], randomInt(2, 4)),
      rating: +(3.5 + Math.random() * 1.5).toFixed(1),
      totalSales: randomInt(50, 5000),
      productCount: 0,
      isFeatured: i < 3, // First 3 vendors featured on homepage
suspended: false,
      createdAt: randomDate(300),
    })
  })
  return vendors
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function generateVendorSubscriptions(vendors: Vendor[]): VendorSubscription[] {
  const subscriptions: VendorSubscription[] = []
  const demoVendorId = vendors.find((v) => v.userId === 'vendor-demo')?.id

  // Top vendors on homepage: vendors with active featured listing (exclude demo for testing subscribe flow)
  const eligible = vendors
    .filter((v) => v.id !== demoVendorId)
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 6)

  const plans: FeaturedListingPlan[] = ['monthly', 'quarterly', 'biannual', 'yearly', 'biannual', 'quarterly']

  eligible.forEach((vendor, i) => {
    const plan = getFeaturedListingPlan(plans[i % plans.length])
    const startedAt = new Date()
    startedAt.setDate(startedAt.getDate() - 15)
    subscriptions.push({
      id: `sub-seed-${vendor.id}`,
      vendorId: vendor.id,
      plan: plan.id,
      amountPaid: plan.priceKes,
      startedAt: startedAt.toISOString(),
      expiresAt: addMonths(startedAt, plan.durationMonths).toISOString(),
      active: true,
      paymentMethod: 'M-Pesa',
    })
  })

  return subscriptions
}

function generateProducts(vendors: Vendor[]): Product[] {
  const products: Product[] = []
  let productIndex = 0

  const categoryEntries = Object.entries(CATEGORIES)

  for (const vendor of vendors) {
    const productCount = randomInt(5, 8)
    for (let p = 0; p < productCount; p++) {
      const [genderKey, subcats] = randomItem(categoryEntries)
      const subcategory = randomItem(subcats)
      const gender = genderKey === 'kids' ? 'kids' : genderKey === 'accessories' || genderKey === 'footwear' ? 'unisex' : genderKey as 'men' | 'women'
      const adj = randomItem(PRODUCT_ADJECTIVES)
      const name = `${adj} ${subcategory}`
      const price = randomInt(1500, 45000)
      const discount = Math.random() < 0.3 ? randomInt(10, 40) : 0

      let sizes: string[]
      if (genderKey === 'footwear') sizes = randomItems(SIZES.footwear, randomInt(4, 7))
      else if (genderKey === 'kids') sizes = randomItems(SIZES.kids, randomInt(3, 5))
      else sizes = randomItems(SIZES.clothing, randomInt(4, 6))

      products.push({
        id: `product-${++productIndex}`,
        vendorId: vendor.id,
        name,
        slug: slugify(`${name}-${productIndex}`),
        description: `Elevate your style with this ${adj.toLowerCase()} ${subcategory.toLowerCase()}. Crafted from premium materials for comfort and durability. Perfect for any occasion.`,
        sku: `SKU-${vendor.id.slice(-3)}-${productIndex}`,
        category: genderKey,
        subcategory,
        brand: randomItem(BRANDS),
        gender,
        sizes,
        colors: randomItems(COLORS, randomInt(2, 4)),
        price,
        discount,
        stock: randomInt(0, 150),
        images: Array.from({ length: randomInt(3, 5) }, (_, j) => productImage(genderKey, productIndex * 10 + j)),
        rating: +(3 + Math.random() * 2).toFixed(1),
        reviewCount: randomInt(0, 80),
        status: Math.random() < 0.95 ? 'active' : 'pending',
        featured: Math.random() < 0.15,
        trending: Math.random() < 0.2,
        bestseller: Math.random() < 0.15,
        newArrival: Math.random() < 0.25,
        createdAt: randomDate(180),
      })
    }
    vendor.productCount = productCount
  }

  // Ensure 100+ products
  while (products.length < 60) {
    const vendor = randomItem(vendors)
    const [genderKey, subcats] = randomItem(categoryEntries)
    const subcategory = randomItem(subcats)
    const adj = randomItem(PRODUCT_ADJECTIVES)
    const name = `${adj} ${subcategory} ${products.length}`
    products.push({
      id: `product-${++productIndex}`,
      vendorId: vendor.id,
      name,
      slug: slugify(name),
      description: `Premium ${subcategory.toLowerCase()} from ${vendor.storeName}.`,
      sku: `SKU-EXT-${productIndex}`,
      category: genderKey,
      subcategory,
      brand: randomItem(BRANDS),
      gender: genderKey === 'kids' ? 'kids' : genderKey as 'men' | 'women',
      sizes: randomItems(SIZES.clothing, 4),
      colors: randomItems(COLORS, 3),
      price: randomInt(2000, 50000),
      discount: Math.random() < 0.2 ? randomInt(5, 30) : 0,
      stock: randomInt(5, 100),
      images: [productImage(genderKey, productIndex)],
      rating: +(3 + Math.random() * 2).toFixed(1),
      reviewCount: randomInt(0, 50),
      status: 'active',
      featured: false,
      trending: false,
      bestseller: false,
      newArrival: true,
      createdAt: randomDate(30),
    })
  }

  return products
}

function generateReviews(products: Product[], users: User[]): Review[] {
  const reviews: Review[] = []
  const customers = users.filter((u) => u.role === 'CUSTOMER')

  products.slice(0, 50).forEach((product) => {
    const reviewCount = randomInt(1, 5)
    for (let i = 0; i < reviewCount; i++) {
      const user = randomItem(customers)
      reviews.push({
        id: generateId(),
        productId: product.id,
        userId: user.id,
        userName: user.fullName,
        rating: randomInt(3, 5),
        comment: randomItem([
          'Great quality and fit!',
          'Love the material, very comfortable.',
          'Exactly as described, fast shipping.',
          'Beautiful design, will buy again.',
          'Good value for money.',
          'Perfect for everyday wear.',
          'Stylish and well-made.',
        ]),
        vendorReply: Math.random() < 0.3 ? 'Thank you for your wonderful review!' : undefined,
        createdAt: randomDate(90),
      })
    }
  })
  return reviews
}

function generateOrders(products: Product[], users: User[]): Order[] {
  const orders: Order[] = []
  const customers = users.filter((u) => u.role === 'CUSTOMER')
  const statuses: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

  for (let i = 0; i < 30; i++) {
    const user = randomItem(customers)
    const itemCount = randomInt(1, 4)
    const orderProducts = randomItems(products.filter((p) => p.status === 'active'), itemCount)
    const items = orderProducts.map((p) => ({
      productId: p.id,
      productName: p.name,
      productImage: p.images[0],
      vendorId: p.vendorId,
      quantity: randomInt(1, 3),
      size: randomItem(p.sizes),
      color: randomItem(p.colors).name,
      price: p.price * (1 - p.discount / 100),
    }))
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const shipping = subtotal > FREE_SHIPPING_KES ? 0 : STANDARD_SHIPPING_KES
    const tax = subtotal * 0.08
    const status = randomItem(statuses)

    orders.push({
      id: `order-${i + 1}`,
      userId: user.id,
      items,
      status,
      subtotal,
      shipping,
      tax,
      discount: 0,
      total: subtotal + shipping + tax,
      shippingAddress: {
        id: generateId(),
        label: 'Home',
        street: `${randomInt(100, 999)} Main St`,
        city: randomItem(CITIES),
        state: 'Nairobi County',
        country: randomItem(COUNTRIES),
        zipCode: `${randomInt(10000, 99999)}`,
        isDefault: true,
      },
      deliveryMethod: randomItem(['Standard', 'Express', 'Next Day']),
      paymentMethod: randomItem(['Visa', 'Mastercard', 'PayPal', 'Mobile Money']),
      createdAt: randomDate(120),
      updatedAt: randomDate(60),
    })
  }
  return orders
}

function generateVendorApplications(users: User[]): VendorApplication[] {
  const apps: VendorApplication[] = []
  const pendingCustomers = users.filter((u) => u.role === 'CUSTOMER').slice(0, 5)

  pendingCustomers.forEach((user, i) => {
    const storeName = `New Store ${i + 1}`
    apps.push({
      id: generateId(),
      userId: user.id,
      storeName,
      businessDescription: `We are a new fashion brand looking to bring unique ${randomItem(['streetwear', 'luxury', 'sustainable', 'vintage'])} styles to the marketplace.`,
      logo: storeLogoImage(i + 20),
      contactPhone: user.phone,
      businessEmail: user.email,
      country: randomItem(COUNTRIES),
      city: randomItem(CITIES),
      socialLinks: { instagram: `@newstore${i}` },
      registrationNumber: `REG-${randomInt(100000, 999999)}`,
      categories: randomItems(['Men\'s Wear', 'Women\'s Wear', 'Streetwear', 'Sportswear'], 2),
      status: i < 3 ? 'pending' : i === 3 ? 'approved' : 'rejected',
      riskStatus: randomItem(['low', 'medium', 'high'] as const),
      submittedAt: randomDate(30),
      reviewedAt: i >= 3 ? randomDate(15) : undefined,
      reviewNote: i === 4 ? 'Incomplete business documentation' : undefined,
    })
  })
  return apps
}

export function generateSeedData(): AppData {
  const users = generateUsers(100)
  const vendors = generateVendors(users)
  const products = generateProducts(vendors)
  const reviews = generateReviews(products, users)
  const orders = generateOrders(products, users)
  const vendorApplications = generateVendorApplications(users)
  const vendorSubscriptions: VendorSubscription[] = []

  return {
    users,
    vendors,
    vendorSubscriptions,
    vendorApplications,
    products,
    reviews,
    orders,
    settings: {
      categories: Object.values(CATEGORIES).flat(),
      brands: BRANDS,
      taxRate: 0.08,
      shippingMethods: [
        { id: 'standard', name: 'Standard Shipping', price: STANDARD_SHIPPING_KES, days: '3-5 business days' },
        { id: 'express', name: 'Express Shipping', price: EXPRESS_SHIPPING_KES, days: '1-2 business days' },
        { id: 'nextday', name: 'Nairobi Same-Day', price: NEXTDAY_SHIPPING_KES, days: 'Same day in Nairobi' },
      ],
      coupons: [
        { id: '1', code: 'WELCOME10', discount: 10, type: 'percentage', minOrder: 6500, active: true },
        { id: '2', code: 'SUMMER25', discount: 25, type: 'percentage', minOrder: 13000, active: true },
        { id: '3', code: 'FLAT500', discount: 500, type: 'fixed', minOrder: 9750, active: true },
      ],
    },
    sessions: [],
  }
}
