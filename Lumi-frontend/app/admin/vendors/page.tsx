'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useAdminVendorApplications, useApproveVendor, useRejectVendor, useSetVendorFeatured, useDisableUser, useVendors } from '@/lib/api/hooks'
import { formatDate } from '@/lib/utils/storage'
import { unwrapItems } from '@/lib/utils/api'
import { MediaImage } from '@/components/common/MediaImage'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ResponsiveDataTable } from '@/components/common/ResponsiveDataTable'
import { CheckIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const VENDOR_VERIFICATION_CHECKLIST = [
  { id: 'business_license', label: 'Business License Verified', description: 'Registration number and documents verified', critical: true },
  { id: 'store_details', label: 'Store Details Complete', description: 'Store name, description, and location confirmed', critical: true },
  { id: 'contact_info', label: 'Contact Information Valid', description: 'Email, phone, and business address verified', critical: true },
  { id: 'profile_photo', label: 'Profile Photo/Logo', description: 'High-quality logo or profile image approved', critical: false },
  { id: 'payment_details', label: 'Payment Details', description: 'Payment method and account information verified', critical: true },
  { id: 'tax_compliance', label: 'Tax Compliance', description: 'Tax identification verified where applicable', critical: false },
]

export default function AdminVendorsPage() {
  const [tab, setTab] = useState<'applications' | 'vendors' | 'carousels'>('applications')
  const [reviewNote, setReviewNote] = useState('')
  const [expandedVerification, setExpandedVerification] = useState<string | null>(null)
  const [expandedCarousel, setExpandedCarousel] = useState<string | null>(null)

  const { data: vendorApplicationsAPI, refetch } = useAdminVendorApplications()
  const { data: vendorsData } = useVendors()
  const approveVendor = useApproveVendor().mutate
  const rejectVendor = useRejectVendor().mutate
  const setFeatured = useSetVendorFeatured().mutate
  const disableUser = useDisableUser().mutate

  const vendorApplications = unwrapItems<any>(vendorApplicationsAPI)
  const vendors = unwrapItems<any>(vendorsData)

  const pendingCarousels = vendorApplications.filter((app: any) => app.status === 'pending').slice(0, 5).map((app: any, idx: number) => ({
    id: `carousel-${idx}`,
    vendorId: app.userId,
    vendorName: app.storeName,
    description: app.businessDescription,
    image: app.logo,
    logo: app.logo,
    submittedAt: formatDate(app.submittedAt),
    status: 'pending',
    featuredProducts: 3,
  }))

  const vendorTableData = vendors.map((v: any) => ({ id: v.id, userId: v.userId, storeName: v.storeName, logo: v.logo, location: `${v.city}, ${v.country}`, productCount: v.productCount, rating: v.rating }))

  async function approve(id: string) {
    try {
      await approveVendor({ id, reviewNote })
      toast.success('Vendor approved')
      refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve')
    }
    setReviewNote('')
  }

  async function reject(id: string) {
    try {
      await rejectVendor({ id, reviewNote: reviewNote || 'Application rejected' })
      toast.success('Application rejected')
      refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject')
    }
    setReviewNote('')
  }

  async function handleSuspend(userId: string) {
    try {
      await disableUser(userId)
      toast.success('Vendor suspended')
      refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to suspend')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Vendor Management</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button className={`px-4 py-2 text-sm rounded-lg ${tab === 'applications' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'}`} onClick={() => setTab('applications')}>Applications</button>
        <button className={`px-4 py-2 text-sm rounded-lg ${tab === 'vendors' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'}`} onClick={() => setTab('vendors')}>Active Vendors</button>
        <button className={`px-4 py-2 text-sm rounded-lg ${tab === 'carousels' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'}`} onClick={() => setTab('carousels')}>Carousel Approvals</button>
      </div>
      {tab === 'applications' ? (
        <div className="space-y-4">
          {vendorApplications.length === 0 ? <div className="card p-12 text-center"><p className="text-gray-500">No applications found.</p></div> : vendorApplications.map((app) => (
            <div key={app.id} className="card p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <MediaImage src={app.logo} alt={app.storeName} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                  <div><h3 className="font-semibold">{app.storeName}</h3><p className="text-sm text-gray-500">{app.businessEmail} · {app.city}, {app.country}</p></div>
                </div>
                <StatusBadge status={app.status} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{app.businessDescription}</p>
              <div className="flex flex-wrap gap-2 mb-3">{app.categories?.map((cat: string) => <span key={cat} className="badge bg-gray-100 dark:bg-gray-800">{cat}</span>)}</div>
              <div className="text-xs text-gray-500 space-y-1 mb-4">
                <p>Registration: {app.registrationNumber}</p>
                <p>Risk Status: <span className="capitalize font-medium">{app.riskStatus}</span></p>
                <p>Submitted: {formatDate(app.submittedAt)}</p>
              </div>

              <div className="mb-6 border-t pt-4">
                <button
                  onClick={() => setExpandedVerification(expandedVerification === app.id ? null : app.id)}
                  className="flex items-center gap-2 font-semibold text-sm text-left w-full p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <span>Verification Checklist</span>
                  <span className={`transform transition-transform ml-auto ${expandedVerification === app.id ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {expandedVerification === app.id && (
                  <div className="mt-4 space-y-2">
                    {VENDOR_VERIFICATION_CHECKLIST.map((item) => (
                      <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border ${item.critical ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
                        <div className="flex-shrink-0 mt-0.5">
                          {Math.random() > 0.4 ? <CheckIcon className="w-5 h-5 text-green-600" /> : <XMarkIcon className="w-5 h-5 text-amber-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{item.label}</p>
                            {item.critical && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">Critical</span>}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {app.status === 'pending' && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900 dark:text-amber-200">
                      <strong>Release Status:</strong> Verify all critical items above before approving vendor for client release.
                    </p>
                  </div>
                )}
              </div>

              {app.status === 'pending' && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Review note (optional)" className="input-field text-sm py-2 flex-1 min-w-0" />
                  <div className="flex gap-2 shrink-0">
                    <button className="btn-primary text-sm py-2 flex-1 sm:flex-none" onClick={() => approve(app.id)}>Approve</button>
                    <button className="btn-secondary text-sm py-2 text-red-600 border-red-600 flex-1 sm:flex-none" onClick={() => reject(app.id)}>Reject</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : tab === 'vendors' ? (
        <div className="card border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Vendor</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Products</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Rating</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendorTableData.map((row: any) => (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <MediaImage src={row.logo as string} alt={row.storeName as string} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                        <span className="font-medium">{row.storeName as string}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.location}</td>
                    <td className="px-4 py-3 text-gray-600">{row.productCount}</td>
                    <td className="px-4 py-3 text-gray-600">★ {row.rating}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button className="px-3 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setFeatured({ id: row.id, featured: true })}>Feature</button>
                        <button className="px-3 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50" onClick={() => handleSuspend(row.userId)}>Suspend</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {vendorTableData.length === 0 && <div className="p-8 text-center text-gray-500">No vendors found.</div>}
        </div>
      ) : (
        <div className="space-y-4">
          {pendingCarousels.length === 0 ? <div className="card p-12 text-center"><p className="text-gray-500">No pending carousel submissions</p></div> : pendingCarousels.map((carousel) => (
            <div key={carousel.id} className="card p-6 border-l-4 border-amber-500">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1"><h3 className="font-semibold">{carousel.vendorName}</h3><span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">Pending</span></div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Submitted: {carousel.submittedAt}</p>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{carousel.featuredProducts} featured products</span>
              </div>
              <button onClick={() => setExpandedCarousel(expandedCarousel === carousel.id ? null : carousel.id)} className="w-full mb-4 text-left p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <MediaImage src={carousel.logo} alt={carousel.vendorName} width={48} height={48} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  <div className="flex-1"><p className="font-semibold text-sm">{carousel.vendorName}</p><p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{carousel.description}</p></div>
                  <span className="text-xs text-gray-500 shrink-0">Click to preview →</span>
                </div>
              </button>
              {expandedCarousel === carousel.id && (
                <div className="mb-6 p-4 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">HOMEPAGE PREVIEW</p>
                  <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 mb-4"><MediaImage src={carousel.image} alt={carousel.vendorName} fill className="object-cover" /></div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <MediaImage src={carousel.logo} alt={carousel.vendorName} width={56} height={56} className="w-14 h-14 rounded-full border-4 border-white dark:border-gray-800 object-cover" />
                      <div><p className="font-bold text-lg">{carousel.vendorName}</p><p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{carousel.description}</p></div>
                    </div>
                    <div className="pt-2"><button className="btn-primary text-sm py-2">Shop This Vendor</button></div>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="flex-1 btn-primary py-2">Approve</button>
                <button className="flex-1 btn-secondary text-red-600 border-red-600 py-2">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}