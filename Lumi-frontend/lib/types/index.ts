export type UserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN'
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export type VendorApplicationStatus = 'pending' | 'approved' | 'rejected'
export type ProductStatus = 'active' | 'pending' | 'hidden' | 'archived'
export type Gender = 'men' | 'women' | 'kids' | 'unisex'

export interface User {
  id: string
  fullName: string
  email: string
  phone: string
  password: string
  role: UserRole
  avatar?: string
  disabled: boolean
  createdAt: string
  addresses: Address[]
}

export interface Address {
  id: string
  label: string
  street: string
  city: string
  state: string
  country: string
  zipCode: string
  isDefault: boolean
}

export type FeaturedListingPlan = 'monthly' | 'quarterly' | 'biannual' | 'yearly'

export interface VendorSubscription {
  id: string
  vendorId: string
  plan: FeaturedListingPlan
  amountPaid: number
  startedAt: string
  expiresAt: string
  active: boolean
  paymentMethod: string
}

export interface Vendor {
  id: string
  userId: string
  storeName: string
  slug: string
  description: string
  logo: string
  banner: string
  contactPhone: string
  businessEmail: string
  country: string
  city: string
  socialLinks: Record<string, string>
  categories: string[]
  rating: number
  totalSales: number
  productCount: number
  suspended: boolean
  isFeatured?: boolean
  createdAt: string
}

export interface VendorApplication {
  id: string
  userId: string
  storeName: string
  businessDescription: string
  logo: string
  contactPhone: string
  businessEmail: string
  country: string
  city: string
  socialLinks: Record<string, string>
  registrationNumber: string
  categories: string[]
  status: VendorApplicationStatus
  riskStatus: 'low' | 'medium' | 'high'
  submittedAt: string
  reviewedAt?: string
  reviewNote?: string
}

export interface Product {
  id: string
  vendorId: string
  name: string
  slug: string
  description: string
  sku: string
  category: string
  subcategory: string
  brand: string
  gender: Gender
  sizes: string[]
  colors: { name: string; hex: string }[]
  price: number
  discount: number
  stock: number
  images: string[]
  rating: number
  reviewCount: number
  status: ProductStatus
  featured: boolean
  trending: boolean
  bestseller: boolean
  newArrival: boolean
  createdAt: string
}

export interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  comment: string
  vendorReply?: string
  createdAt: string
}

export interface CartItem {
  productId: string
  quantity: number
  size: string
  color: string
  savedForLater: boolean
}

export interface OrderItem {
  productId: string
  productName: string
  productImage: string
  vendorId: string
  quantity: number
  size: string
  color: string
  price: number
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  status: OrderStatus
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  couponCode?: string
  shippingAddress: Address
  deliveryMethod: string
  paymentMethod: string
  createdAt: string
  updatedAt: string
}

export interface Coupon {
  id: string
  code: string
  discount: number
  type: 'percentage' | 'fixed'
  minOrder: number
  active: boolean
}

export interface PlatformSettings {
  categories: string[]
  brands: string[]
  taxRate: number
  shippingMethods: { id: string; name: string; price: number; days: string }[]
  coupons: Coupon[]
}

export interface AuthSession {
  userId: string
  token: string
  expiresAt: string
}

export interface ProductFilters {
  q?: string
  category?: string
  subcategory?: string
  gender?: Gender
  size?: string
  color?: string
  brand?: string
  vendorId?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  search?: string
  featured?: boolean
  trending?: boolean
  onSale?: boolean
  sort?: 'newest' | 'popular' | 'rating' | 'price-asc' | 'price-desc'
  status?: ProductStatus
  page?: number
  limit?: number
}

export interface AnalyticsData {
  monthlySales: { month: string; revenue: number; orders: number }[]
  vendorGrowth: { month: string; count: number }[]
  orderTrends: { date: string; count: number }[]
  topProducts: { name: string; sales: number }[]
}

export interface AppData {
  users: User[]
  vendors: Vendor[]
  vendorSubscriptions: VendorSubscription[]
  vendorApplications: VendorApplication[]
  products: Product[]
  reviews: Review[]
  orders: Order[]
  settings: PlatformSettings
  sessions: AuthSession[]
}
