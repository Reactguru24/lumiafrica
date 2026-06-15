import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Valid phone number required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export function vendorApplicationSchema(customerEmail?: string) {
  return z.object({
    storeName: z.string().min(2, 'Store name required'),
    businessDescription: z.string().min(20, 'Description must be at least 20 characters'),
    contactPhone: z.string().min(10, 'Valid phone required'),
    businessEmail: z
      .string()
      .email('Invalid email')
      .refine(
        (email) => !customerEmail || email.toLowerCase() !== customerEmail.toLowerCase(),
        'Use a business email different from your customer account',
      ),
    country: z.string().min(2, 'Country required'),
    city: z.string().min(2, 'City required'),
    registrationNumber: z.string().min(5, 'Registration number required'),
    categories: z.array(z.string()).min(1, 'Select at least one category'),
  })
}

export const productSchema = z.object({
  name: z.string().min(2, 'Product name required'),
  description: z.string().min(10, 'Description required'),
  sku: z.string().min(3, 'SKU required'),
  category: z.string().min(1, 'Category required'),
  subcategory: z.string().min(1, 'Subcategory required'),
  brand: z.string().min(1, 'Brand required'),
  gender: z.enum(['men', 'women', 'kids', 'unisex']),
  sizes: z.array(z.string()).min(1, 'At least one size required'),
  price: z.number().min(0.01, 'Price must be positive'),
  discount: z.number().min(0).max(100),
  stock: z.number().min(0, 'Stock cannot be negative'),
})

export const checkoutShippingSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  street: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2),
  zipCode: z.string().min(4),
})

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type VendorApplicationForm = z.infer<ReturnType<typeof vendorApplicationSchema>>
export type ProductForm = z.infer<typeof productSchema>
export type CheckoutShippingForm = z.infer<typeof checkoutShippingSchema>
