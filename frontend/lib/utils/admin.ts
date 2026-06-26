export type VendorApplicationCheck = {
  id: string
  label: string
  description: string
  passed: boolean
  critical: boolean
}

export function buildVendorApplicationChecklist(app: {
  storeName?: string
  applicantName?: string
  businessDescription?: string
  businessEmail?: string
  contactPhone?: string
  country?: string
  city?: string
  registrationNumber?: string
  logo?: string
  businessCertificate?: string
  vendorPhoto?: string
  businessPhoto?: string
  categories?: string[]
}): VendorApplicationCheck[] {
  return [
    {
      id: 'applicant_name',
      label: 'Applicant name',
      description: 'Name of the person applying to sell',
      passed: Boolean(app.applicantName?.trim()),
      critical: true,
    },
    {
      id: 'store_name',
      label: 'Store name provided',
      description: 'Vendor has a valid store name',
      passed: Boolean(app.storeName?.trim()),
      critical: true,
    },
    {
      id: 'description',
      label: 'Business description',
      description: 'Clear description of products and services',
      passed: Boolean(app.businessDescription?.trim()),
      critical: true,
    },
    {
      id: 'email',
      label: 'Business email',
      description: 'Valid contact email for the store',
      passed: Boolean(app.businessEmail?.trim()),
      critical: true,
    },
    {
      id: 'phone',
      label: 'Contact phone',
      description: 'Reachable phone number on file',
      passed: Boolean(app.contactPhone?.trim()),
      critical: true,
    },
    {
      id: 'location',
      label: 'Country & city',
      description: 'Operating location confirmed',
      passed: Boolean(app.country?.trim() && app.city?.trim()),
      critical: true,
    },
    {
      id: 'registration',
      label: 'Registration number',
      description: 'Business registration reference submitted',
      passed: Boolean(app.registrationNumber?.trim()),
      critical: true,
    },
    {
      id: 'logo',
      label: 'Store logo',
      description: 'Logo uploaded for storefront display',
      passed: Boolean(app.logo?.trim()),
      critical: false,
    },
    {
      id: 'vendor_photo',
      label: 'Vendor photo',
      description: 'Profile photo of the vendor/owner',
      passed: Boolean(app.vendorPhoto?.trim()),
      critical: true,
    },
    {
      id: 'business_photo',
      label: 'Business photo',
      description: 'Photo of the business/storefront',
      passed: Boolean(app.businessPhoto?.trim()),
      critical: true,
    },
    {
      id: 'business_certificate',
      label: 'Business certificate',
      description: 'Proof of business registration (PDF or image)',
      passed: Boolean(app.businessCertificate?.trim()),
      critical: true,
    },
    {
      id: 'categories',
      label: 'Product categories',
      description: 'At least one category selected',
      passed: (app.categories?.length ?? 0) > 0,
      critical: true,
    },
  ]
}

export function analyticsField<T>(analytics: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (analytics[key] !== undefined && analytics[key] !== null) {
      return analytics[key] as T
    }
  }
  return undefined
}
