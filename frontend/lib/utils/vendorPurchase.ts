export const VENDOR_SELF_PURCHASE_MSG =
  'You cannot purchase your own products. Manage them from your vendor dashboard.'

export function isOwnVendorProduct(
  productVendorId: string | undefined,
  myVendorId: string | null | undefined,
): boolean {
  return Boolean(myVendorId && productVendorId && productVendorId === myVendorId)
}
