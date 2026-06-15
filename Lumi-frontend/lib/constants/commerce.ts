/** All monetary values in the app are stored in KES */
export const FREE_SHIPPING_KES = 13000
export const STANDARD_SHIPPING_KES = 1300
export const EXPRESS_SHIPPING_KES = 2600
export const NEXTDAY_SHIPPING_KES = 3900
export const TAX_RATE = 0.08
export const PAYMENT_METHODS = ['M-Pesa', 'Visa', 'Mastercard', 'Airtel Money'] as const
export const SHIPPING_METHODS = [
  { id: 'standard', name: 'Standard Shipping', price: STANDARD_SHIPPING_KES, days: '5-7 business days' },
  { id: 'express', name: 'Express Shipping', price: EXPRESS_SHIPPING_KES, days: '2-3 business days' },
  { id: 'nextday', name: 'Next Day Delivery', price: NEXTDAY_SHIPPING_KES, days: '1 business day' },
] as const
