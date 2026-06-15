'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { useVendorReviews, useReplyToReview } from '@/lib/api/hooks'
import { unwrapItems, resolveMediaUrl } from '@/lib/utils/api'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { formatDate } from '@/lib/utils/storage'
import { ReviewReplyBlock } from '@/components/reviews/ReviewReplyBlock'
import { StarIcon } from '@heroicons/react/24/solid'

export default function VendorReviewsPage() {
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const { data: reviewsAPI, loading, error, refetch } = useVendorReviews()
  const { mutate: submitReplyMutation, loading: replying } = useReplyToReview()

  const reviews = unwrapItems<any>(reviewsAPI)

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
      <h1 className="text-2xl font-semibold mb-6">Customer Reviews</h1>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading reviews...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">{getFriendlyErrorMessage(error, 'Unable to load reviews.')}</div>
      ) : reviews.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No reviews yet. Reviews from customers will appear here.</p>
      ) : (
        reviews.map((review) => {
          const productName = review.productName || 'Product'
          const productImage = resolveMediaUrl(review.productImage)
          return (
            <div key={review.id} className="card p-4 mb-4">
              <Link href={`/products/${review.productId}`} className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800 hover:opacity-80 transition-opacity">
                <Image src={productImage} alt={productName} width={48} height={56} className="w-12 h-14 object-cover rounded shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{productName}</p>
                  <p className="text-xs text-gray-500">View product</p>
                </div>
              </Link>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">Customer · {review.userId?.slice(-8) || 'Anonymous'}</p>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <StarIcon key={i} className={`w-3.5 h-3.5 ${i <= (review.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
              </div>
              {review.createdAt && <p className="text-xs text-gray-400 mb-2">{formatDate(review.createdAt)}</p>}
              <p className="text-sm text-gray-600 dark:text-gray-400">{review.comment}</p>
              {review.vendorReply ? (
                <ReviewReplyBlock reply={review.vendorReply} label="Your reply" />
              ) : (
                <div className="flex gap-2 mt-3">
                  <input value={replyText[review.id] || ''} onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })} placeholder="Write a reply to this customer..." className="input-field text-sm py-2 flex-1" />
                  <button className="btn-primary text-sm py-2 shrink-0" onClick={() => submitReply(review.id)} disabled={replying}>Reply</button>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
