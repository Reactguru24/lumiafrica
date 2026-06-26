'use client'

import { useState } from 'react'
import { MediaImage } from '@/components/common/MediaImage'
import Link from 'next/link'
import { toast } from 'sonner'
import { useVendorProfile, useVendorReviews, useReplyToReview } from '@/lib/stores/api'
import { unwrapItems } from '@/lib/utils/api'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { formatDate } from '@/lib/utils/storage'
import { ReviewReplyBlock } from '@/components/reviews/ReviewReplyBlock'
import { EmptyState } from '@/components/common/EmptyState'
import { StarIcon } from '@heroicons/react/24/solid'
import type { Vendor } from '@/lib/types'

type VendorReview = {
  id: string
  productId: string
  productName?: string
  productImage?: string
  userName?: string
  userId?: string
  rating: number
  comment: string
  vendorReply?: string
  createdAt?: string
}

const PAGE_SIZE = 10

export default function VendorReviewsPage() {
  const [page, setPage] = useState(1)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const { data: vendorProfile } = useVendorProfile()
  const { data: reviewsAPI, loading, error, refetch } = useVendorReviews(page, PAGE_SIZE)
  const { mutate: submitReplyMutation, loading: replying } = useReplyToReview()

  const vendor = vendorProfile as Vendor | null
  const reviews = unwrapItems<VendorReview>(reviewsAPI)
  const total =
    reviewsAPI && typeof reviewsAPI === 'object' && reviewsAPI !== null && 'total' in reviewsAPI
      ? Number((reviewsAPI as { total?: number }).total) || 0
      : reviews.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function submitReply(reviewId: string) {
    const reply = replyText[reviewId]
    if (!reply?.trim()) {
      toast.error('Please write a reply before submitting.')
      return
    }
    try {
      await submitReplyMutation({ reviewId, reply: reply.trim() })
      toast.success('Reply posted')
      setReplyText((prev) => ({ ...prev, [reviewId]: '' }))
      refetch()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to post reply.'))
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        {total > 0 ? `${total} review${total === 1 ? '' : 's'} across your products` : 'Reviews from customers will appear here.'}
      </p>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading reviews...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">{getFriendlyErrorMessage(error, 'Unable to load reviews.')}</div>
      ) : reviews.length === 0 ? (
        <EmptyState title="No reviews yet" description="Encourage customers to leave feedback after purchase." />
      ) : (
        <>
          {reviews.map((review) => {
            const productName = review.productName || 'Product'
            return (
              <div key={review.id} className="card p-4 mb-4">
                <Link href={`/products/${review.productId}`} className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800 hover:opacity-80 transition-opacity">
                  <MediaImage src={review.productImage} alt={productName} width={48} height={56} transform={{ width: 96, aspect: '3:4' }} className="w-12 h-14 object-cover rounded shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{productName}</p>
                    <p className="text-xs text-gray-500">View product</p>
                  </div>
                </Link>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{review.userName || review.userId?.slice(-8) || 'Anonymous'}</p>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <StarIcon key={i} className={`w-3.5 h-3.5 ${i <= (review.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                {review.createdAt && <p className="text-xs text-gray-400 mb-2">{formatDate(review.createdAt)}</p>}
                <p className="text-sm text-gray-600 dark:text-gray-400">{review.comment}</p>
                {review.vendorReply ? (
                  <ReviewReplyBlock
                    reply={review.vendorReply}
                    label="Your reply"
                    vendorRating={vendor?.rating}
                    verificationBadge={vendor?.verificationBadge}
                  />
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <input value={replyText[review.id] || ''} onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })} placeholder="Write a reply to this customer..." className="input-field text-sm py-2 flex-1 min-w-0" />
                    <button className="btn-primary text-sm py-2 w-full sm:w-auto sm:shrink-0" onClick={() => submitReply(review.id)} disabled={replying}>Reply</button>
                  </div>
                )}
              </div>
            )
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                className="btn-secondary text-sm py-2 px-4"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                type="button"
                className="btn-secondary text-sm py-2 px-4"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
