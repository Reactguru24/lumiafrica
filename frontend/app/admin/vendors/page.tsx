'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  useAdminVendorApplications, useApproveVendor, useRejectVendor, useResendVendorActivation, useSetVendorFeatured,
  useDisableUser, useEnableUser, useAdminVendors, useAdminFeaturedListings, useSetAdminProductFeatured,
} from '@/lib/stores/api'
import { formatDate, formatCurrency } from '@/lib/utils/storage'
import { unwrapPaginated, resolveAssetUrl } from '@/lib/utils/api'
import { buildVendorApplicationChecklist } from '@/lib/utils/admin'
import { confirmAction } from '@/lib/utils/swal'
import { MediaImage } from '@/components/common/MediaImage'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { ResponsiveDataTable } from '@/components/common/ResponsiveDataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminRowActions } from '@/components/admin/AdminRowActions'
import { CheckIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

type Tab = 'applications' | 'vendors' | 'carousels'

export default function AdminVendorsPage() {
  const [tab, setTab] = useState<Tab>('applications')
  const [appPage, setAppPage] = useState(1)
  const [vendorPage, setVendorPage] = useState(1)
  const [featuredPage, setFeaturedPage] = useState(1)
  const featuredLimit = 10
  const [reviewNote, setReviewNote] = useState('')
  const [expandedVerification, setExpandedVerification] = useState<string | null>(null)

  const { data: vendorApplicationsAPI, refetch: refetchApps } = useAdminVendorApplications(appPage, 10)
  const { data: vendorsData, refetch: refetchVendors } = useAdminVendors(vendorPage, 15)
  const { data: featuredData, refetch: refetchFeatured } = useAdminFeaturedListings(featuredPage, featuredLimit)
  const approveVendor = useApproveVendor().mutate
  const rejectVendor = useRejectVendor().mutate
  const resendVendorActivation = useResendVendorActivation().mutate
  const setFeatured = useSetVendorFeatured().mutate
  const setProductFeatured = useSetAdminProductFeatured().mutate
  const disableUser = useDisableUser().mutate
  const enableUser = useEnableUser().mutate

  const appsPaginated = unwrapPaginated<any>(vendorApplicationsAPI)
  const vendorsPaginated = unwrapPaginated<any>(vendorsData)
  const vendorApplications = appsPaginated.items
  const vendors = vendorsPaginated.items
  const featuredListings = (featuredData as {
    vendors?: any[]
    products?: any[]
    totalVendors?: number
    totalProducts?: number
    page?: number
    limit?: number
  }) || {}
  const featuredVendors = featuredListings.vendors || []
  const featuredProducts = featuredListings.products || []
  const featuredVendorTotal = featuredListings.totalVendors ?? featuredVendors.length
  const featuredProductTotal = featuredListings.totalProducts ?? featuredProducts.length

  async function approve(id: string) {
    try {
      const result = await approveVendor({ id, reviewNote }) as {
        message?: string
        resetUrl?: string
        emailSent?: boolean
      }
      if (result?.resetUrl) {
        console.info('Vendor activation link:', result.resetUrl)
      }
      toast.success(result?.message || (result?.emailSent === false
        ? 'Vendor approved. Check server logs for the activation link.'
        : 'Vendor approved. Activation email sent to business email.'))
      refetchApps()
      refetchVendors()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Failed to approve'))
    }
    setReviewNote('')
  }

  async function reject(id: string) {
    if (!reviewNote.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    try {
      await rejectVendor({ id, reviewNote })
      toast.success('Application rejected')
      refetchApps()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Failed to reject'))
    }
    setReviewNote('')
  }

  async function resendActivation(vendorId: string, businessEmail?: string) {
    const confirmed = await confirmAction({
      title: 'Resend activation link?',
      text: businessEmail
        ? `A new password setup link will be emailed to ${businessEmail}.`
        : 'A new password setup link will be emailed to the vendor business address.',
      confirmText: 'Resend email',
      icon: 'question',
    })
    if (!confirmed) return
    try {
      const result = await resendVendorActivation({ vendorId }) as {
        message?: string
        resetUrl?: string
        emailSent?: boolean
      }
      if (result?.resetUrl) {
        console.info('Vendor activation link:', result.resetUrl)
      }
      if (result?.emailSent === false && result?.resetUrl) {
        toast.warning(result.message || 'Email could not be sent. Activation link logged to browser console.')
      } else {
        toast.success(result?.message || 'Activation email resent.')
      }
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Failed to resend activation email'))
    }
  }

  async function handleSuspend(userId: string, storeName: string) {
    const confirmed = await confirmAction({
      title: 'Suspend this vendor?',
      text: `${storeName} will be disabled and unable to access their store.`,
      confirmText: 'Yes, suspend',
    })
    if (!confirmed) return
    try {
      await disableUser(userId)
      toast.success('Vendor suspended')
      refetchVendors()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Failed to suspend'))
    }
  }

  async function handleReactivate(userId: string, storeName: string) {
    const confirmed = await confirmAction({
      title: 'Re-activate this vendor?',
      text: `${storeName} will be able to sign in and manage their store again.`,
      confirmText: 'Yes, activate',
      icon: 'question',
    })
    if (!confirmed) return
    try {
      await enableUser(userId)
      toast.success('Vendor re-activated')
      refetchVendors()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Failed to re-activate vendor'))
    }
  }

  async function handleToggleVendorFeatured(vendorId: string, featured: boolean, storeName?: string) {
    if (!featured) {
      const confirmed = await confirmAction({
        title: 'Remove from featured?',
        text: `${storeName || 'This vendor'} will no longer appear in the homepage carousel.`,
        confirmText: 'Remove',
        icon: 'question',
      })
      if (!confirmed) return
    }
    try {
      await setFeatured({ id: vendorId, featured })
      toast.success(featured ? 'Vendor featured' : 'Vendor unfeatured')
      refetchFeatured()
      refetchVendors()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Failed to update vendor'))
    }
  }

  async function handleToggleProductFeatured(productId: string, featured: boolean, productName?: string) {
    if (!featured) {
      const confirmed = await confirmAction({
        title: 'Remove featured product?',
        text: `${productName || 'This product'} will be removed from featured listings.`,
        confirmText: 'Remove',
        icon: 'question',
      })
      if (!confirmed) return
    }
    try {
      await setProductFeatured({ id: productId, featured })
      toast.success(featured ? 'Product featured' : 'Product unfeatured')
      refetchFeatured()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Failed to update product'))
    }
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm capitalize whitespace-nowrap rounded-full transition-colors ${
      tab === t ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'
    }`

  const vendorTableData = vendors.map((v: any) => ({
    id: v.id,
    userId: v.userId,
    storeName: v.storeName,
    logo: v.logo,
    businessEmail: v.businessEmail || '—',
    location: `${v.city || ''}, ${v.country || ''}`.replace(/^, |, $/g, '') || '—',
    productCount: v.productCount ?? 0,
    rating: Number(v.rating || 0).toFixed(1),
    activationPending: v.activationPending,
    accountDisabled: v.accountDisabled,
    isFeatured: v.isFeatured,
  }))

  function vendorActions(row: typeof vendorTableData[number]) {
    const actions = []
    if (row.activationPending) {
      actions.push({ id: 'resend', label: 'Resend activation' })
    }
    if (!row.isFeatured) {
      actions.push({ id: 'feature', label: 'Feature' })
    } else {
      actions.push({ id: 'unfeature', label: 'Unfeature' })
    }
    if (row.accountDisabled) {
      actions.push({ id: 'reactivate', label: 'Re-activate' })
    } else {
      actions.push({ id: 'suspend', label: 'Suspend', variant: 'danger' as const })
    }
    return actions
  }

  function handleVendorAction(row: typeof vendorTableData[number], actionId: string) {
    if (actionId === 'resend') resendActivation(row.id, row.businessEmail !== '—' ? row.businessEmail : undefined)
    else if (actionId === 'feature') handleToggleVendorFeatured(row.id, true, row.storeName)
    else if (actionId === 'unfeature') handleToggleVendorFeatured(row.id, false, row.storeName)
    else if (actionId === 'suspend') handleSuspend(row.userId, row.storeName)
    else if (actionId === 'reactivate') handleReactivate(row.userId, row.storeName)
  }

  return (
    <div>
      <AdminPageHeader title="Vendor Management" subtitle="Review applications, manage active vendors, and curate featured listings." />

      <div className="flex gap-2 mb-6 flex-wrap overflow-x-auto">
        <button type="button" className={tabClass('applications')} onClick={() => setTab('applications')}>
          Applications ({appsPaginated.total || '…'})
        </button>
        <button type="button" className={tabClass('vendors')} onClick={() => setTab('vendors')}>
          Active Vendors ({vendorsPaginated.total || '…'})
        </button>
        <button type="button" className={tabClass('carousels')} onClick={() => setTab('carousels')}>
          Featured Listings
        </button>
      </div>

      {tab === 'applications' && (
        <div className="space-y-4">
          {vendorApplications.length === 0 ? (
            <EmptyState title="No applications" description="Vendor applications will appear here for review." />
          ) : vendorApplications.map((app: any) => {
            const checklist = buildVendorApplicationChecklist(app)
            const criticalFailed = checklist.filter((c) => c.critical && !c.passed).length
            return (
              <div key={app.id} className="card p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <MediaImage src={app.logo} alt={app.storeName} width={48} height={48} className="w-12 h-12 rounded-full object-cover shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{app.storeName}</h3>
                      <p className="text-sm text-gray-500 truncate">{app.businessEmail} · {app.city}, {app.country}</p>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{app.businessDescription}</p>
                <div className="flex flex-wrap gap-3 mb-4">
                  {app.vendorPhoto && (
                    <div className="flex items-center gap-2">
                      <MediaImage src={app.vendorPhoto} alt="Vendor photo" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                      <span className="text-xs text-gray-500">Vendor photo</span>
                    </div>
                  )}
                  {app.businessPhoto && (
                    <div className="flex items-center gap-2">
                      <MediaImage src={app.businessPhoto} alt="Business photo" width={64} height={40} className="w-16 h-10 rounded object-cover" />
                      <span className="text-xs text-gray-500">Business photo</span>
                    </div>
                  )}
                  {app.businessCertificate && (
                    <a
                      href={resolveAssetUrl(app.businessCertificate)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline text-gray-600 dark:text-gray-300"
                    >
                      View certificate
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {app.categories?.map((cat: string) => (
                    <span key={cat} className="badge bg-gray-100 dark:bg-gray-800">{cat}</span>
                  ))}
                </div>
                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <p>Registration: {app.registrationNumber || '—'}</p>
                  <p>Risk status: <span className="capitalize font-medium">{app.riskStatus || '—'}</span></p>
                  <p>Submitted: {app.submittedAt ? formatDate(app.submittedAt) : '—'}</p>
                </div>

                <div className="mb-4 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setExpandedVerification(expandedVerification === app.id ? null : app.id)}
                    className="flex items-center gap-2 font-semibold text-sm text-left w-full p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <span>Verification Checklist ({checklist.filter((c) => c.passed).length}/{checklist.length})</span>
                    <span className={`transform transition-transform ml-auto ${expandedVerification === app.id ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {expandedVerification === app.id && (
                    <div className="mt-4 space-y-2">
                      {checklist.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${
                            item.critical ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {item.passed
                              ? <CheckIcon className="w-5 h-5 text-green-600" />
                              : <XMarkIcon className="w-5 h-5 text-amber-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{item.label}</p>
                              {item.critical && (
                                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">Critical</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {app.status === 'pending' && criticalFailed > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-900 dark:text-amber-200">
                        <strong>{criticalFailed} critical item{criticalFailed > 1 ? 's' : ''}</strong> still need attention before approval.
                      </p>
                    </div>
                  )}
                </div>

                {app.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Review note (required for rejection)"
                      className="input-field text-sm py-2 flex-1 min-w-0"
                    />
                    <div className="flex gap-2 shrink-0">
                      <button type="button" className="btn-primary text-sm py-2" onClick={() => approve(app.id)}>Approve</button>
                      <button type="button" className="btn-secondary text-sm py-2 text-red-600 border-red-600" onClick={() => reject(app.id)}>Reject</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <Pagination
            page={appPage}
            totalPages={Math.max(1, Math.ceil(appsPaginated.total / appsPaginated.limit))}
            total={appsPaginated.total}
            pageSize={appsPaginated.limit}
            onPageChange={setAppPage}
          />
        </div>
      )}

      {tab === 'vendors' && (
        <div className="card border border-gray-200 dark:border-gray-700 overflow-hidden">
          {vendors.length === 0 ? (
            <EmptyState title="No vendors" description="Approved vendors will appear here." />
          ) : (
            <ResponsiveDataTable
              columns={[
                { key: 'storeName', label: 'Vendor', width: '22%' },
                { key: 'businessEmail', label: 'Email', width: '22%' },
                { key: 'location', label: 'Location', width: '14%' },
                { key: 'productCount', label: 'Products', width: '10%' },
                { key: 'rating', label: 'Rating', width: '10%' },
                { key: 'activationPending', label: 'Activation', width: '10%' },
                { key: 'isFeatured', label: 'Featured', width: '10%' },
              ]}
              rows={vendorTableData}
              renderCell={(key, row) => {
                if (key === 'storeName') {
                  return (
                    <div className="flex items-center gap-3 min-w-0">
                      <MediaImage src={row.logo as string} alt={row.storeName as string} width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      <span className="font-medium truncate">{row.storeName as string}</span>
                    </div>
                  )
                }
                if (key === 'activationPending') {
                  return row.activationPending
                    ? <span className="text-xs text-amber-600 font-medium">Pending</span>
                    : <span className="text-xs text-green-600 font-medium">Active</span>
                }
                if (key === 'isFeatured') {
                  return row.isFeatured
                    ? <span className="text-xs text-green-600 font-medium">Yes</span>
                    : <span className="text-xs text-gray-400">No</span>
                }
                if (key === 'rating') return <span>★ {row.rating as string}</span>
                return undefined
              }}
              renderActions={(row) => (
                <AdminRowActions
                  options={vendorActions(row as typeof vendorTableData[number])}
                  onSelect={(actionId) => handleVendorAction(row as typeof vendorTableData[number], actionId)}
                />
              )}
            />
          )}
          <div className="px-4 pb-4">
            <Pagination
              page={vendorPage}
              totalPages={Math.max(1, Math.ceil(vendorsPaginated.total / vendorsPaginated.limit))}
              total={vendorsPaginated.total}
              pageSize={vendorsPaginated.limit}
              onPageChange={setVendorPage}
            />
          </div>
        </div>
      )}

      {tab === 'carousels' && (
        <div className="space-y-8">
          <section>
            <h2 className="font-semibold mb-4">Featured Vendors (Homepage Carousel)</h2>
            {featuredVendors.length === 0 ? (
              <EmptyState title="No featured vendors" description="Feature vendors from the Active Vendors tab." />
            ) : (
              <div className="space-y-3">
                {featuredVendors.map((vendor: any) => (
                  <div key={vendor.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <MediaImage src={vendor.logo} alt={vendor.storeName} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{vendor.storeName}</p>
                        <p className="text-xs text-gray-500">{vendor.city}, {vendor.country}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary text-sm py-2 shrink-0"
                      onClick={() => handleToggleVendorFeatured(vendor.id, false, vendor.storeName)}
                    >
                      Remove from carousel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-semibold mb-4">Featured Products</h2>
            {featuredProducts.length === 0 ? (
              <EmptyState title="No featured products" description="Featured products from vendor subscriptions will appear here." />
            ) : (
              <div className="card overflow-hidden">
                <ResponsiveDataTable
                  columns={[
                    { key: 'productName', label: 'Product', width: '40%' },
                    { key: 'vendorName', label: 'Vendor', width: '30%' },
                    { key: 'price', label: 'Price', width: '20%' },
                  ]}
                  rows={featuredProducts.map((row: any) => ({
                    id: row.product.id,
                    productName: row.product.name,
                    productImage: row.product.images?.[0],
                    vendorName: row.vendorName,
                    price: formatCurrency(row.product.price),
                    productId: row.product.id,
                  }))}
                  renderCell={(key, row) => {
                    if (key === 'productName') {
                      return (
                        <div className="flex items-center gap-3">
                          <MediaImage src={row.productImage as string} alt={row.productName as string} width={40} height={40} className="w-10 h-10 rounded object-cover" />
                          <span className="font-medium">{row.productName as string}</span>
                        </div>
                      )
                    }
                    return undefined
                  }}
                  renderActions={(row) => (
                    <button
                      type="button"
                      className="btn-secondary text-xs py-1.5 px-3"
                      onClick={() => handleToggleProductFeatured(row.productId as string, false, row.productName as string)}
                    >
                      Remove
                    </button>
                  )}
                />
              </div>
            )}
          </section>

          <Pagination
            page={featuredPage}
            totalPages={Math.max(1, Math.ceil(Math.max(featuredVendorTotal, featuredProductTotal) / featuredLimit))}
            total={Math.max(featuredVendorTotal, featuredProductTotal)}
            pageSize={featuredLimit}
            onPageChange={setFeaturedPage}
          />
        </div>
      )}
    </div>
  )
}
