'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth'
import { useCartStore } from '@/lib/stores/cart'
import { useProduct, useProductReviews, useCreateReview, useUserOrders } from '@/lib/api/hooks'
import { formatCurrency } from '@/lib/utils/storage'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { ReviewReplyBlock } from '@/components/reviews/ReviewReplyBlock'
import { StarIcon } from '@heroicons/react/24/solid'
import { HeartIcon, MagnifyingGlassPlusIcon, StarIcon as StarOutline } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid'
import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/lib/types'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const productId = params.id as string
  const { addItem, toggleWishlist, isInWishlist } = useCartStore()
  const auth = useAuthStore()
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewOrderId, setReviewOrderId] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const { data: product, loading, error } = useProduct(productId)
  const { data: reviewsData, refetch: refetchReviews } = useProductReviews(productId)
  const { data: ordersData } = useUserOrders()
  const createReview = useCreateReview().mutate

  const productDetail = product as any
  const productAny = productDetail?.product || productDetail
  const vendor = productDetail?.vendor
  const relatedProducts = (productDetail?.relatedProducts || []) as Product[]
  const reviews = ((reviewsData as any)?.items || reviewsData || []) as any[]
  const orders = (((ordersData as any)?.items || ordersData || []) as any[]).filter((order: any) =>
    (order.items || []).some((item: any) => item.productId === productAny?.id)
  )
  const userHasReviewed = reviews.some((r: any) => r.userId === auth.user?.id)
  const inWishlist = productAny ? isInWishlist(productAny.id) : false
  const price = Number(productAny?.price) || 0
  const discount = Number(productAny?.discount) || 0
  const discountAmount = discount > 100 ? discount : price * (discount / 100)
  const salePrice = Math.max(0, price - discountAmount)

  function handleAddToCart() {
    if (!productAny) return
    if (!selectedSize) { toast.warning('Please select a size'); return }
    if (!selectedColor) { toast.warning('Please select a color'); return }
    addItem(productAny.id, selectedSize, selectedColor, quantity)
    toast.success('Added to cart!')
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!auth.isAuthenticated) {
      toast.warning('Please sign in to leave a review')
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }
    if (!productAny) return
    if (!reviewOrderId && orders.length > 0) { toast.warning('Please select the order for this review'); return }
    if (reviewRating < 1) { toast.warning('Please select a star rating'); return }
    if (reviewComment.trim().length < 10) { toast.warning('Please write at least 10 characters'); return }
    setSubmittingReview(true)
    try {
      await createReview({ productId: productAny.id, orderId: reviewOrderId, rating: reviewRating, comment: reviewComment.trim() })
      setReviewRating(0)
      setReviewComment('')
      toast.success('Review submitted!')
      refetchReviews()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to submit your review. Please try again.'))
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <div className="page-container text-center py-16 text-gray-500">Loading product...</div>
  if (error) return <div className="page-container text-center py-16 text-red-600">{getFriendlyErrorMessage(error, 'Unable to load this product.')}</div>
  if (!productAny) return <div className="page-container text-center py-16 text-gray-500">This product could not be found. It may have been removed or is no longer available.</div>

  return (
    <div className="page-container">
      <div className="grid md:grid-cols-2 gap-6 md:gap-12">
        <div className="w-full max-w-md mx-auto md:max-w-none">
          <div className="relative w-full aspect-[4/5] max-h-[min(70vh,420px)] md:max-h-none md:aspect-[3/4] bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-sm md:rounded-none" onClick={() => setZoomed(!zoomed)}>
            <Image src={productAny.images?.[activeImage] || '/placeholder.png'} alt={productAny.name || 'Product image'} fill className={`object-cover object-center transition-transform duration-300 ${zoomed ? 'scale-125 cursor-zoom-out' : 'cursor-zoom-in'}`} />
            <MagnifyingGlassPlusIcon className="absolute bottom-3 right-3 w-5 h-5 text-white/80 drop-shadow hidden sm:block" />
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto justify-center md:justify-start pb-1 -mx-1 px-1">
            {(productAny.images || []).map((img: string, i: number) => (
              <button key={i} type="button" className={`relative w-14 h-16 sm:w-16 sm:h-20 shrink-0 border-2 overflow-hidden rounded-sm ${activeImage === i ? 'border-brand-teal dark:border-brand-orange' : 'border-gray-200 dark:border-gray-700'}`} onClick={() => setActiveImage(i)}>
                <Image src={img} alt={`${productAny.name || 'Product'} ${i + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div className="animate-slide-up text-center md:text-left">
          <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider">{productAny.brand}</p>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold mt-1">{productAny.name}</h1>
          <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
            <div className="flex">{[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} className={`w-4 h-4 ${i <= Math.round(productAny.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`} />)}</div>
            <span className="text-sm text-gray-500">{productAny.rating || 0} ({productAny.reviewCount || 0} reviews)</span>
          </div>
          <div className="flex items-center gap-3 mt-4 justify-center md:justify-start flex-wrap">
            <span className="text-xl sm:text-2xl font-bold">{formatCurrency(salePrice)}</span>
            {(productAny.discount || 0) > 0 && <><span className="text-base sm:text-lg text-gray-400 line-through">{formatCurrency(productAny.price || 0)}</span><span className="text-sm text-red-600 font-medium">{productAny.discount > 100 ? `-${formatCurrency(productAny.discount)}` : `-${productAny.discount}%`}</span></>}
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-4 leading-relaxed text-sm sm:text-base text-left">{productAny.description || ''}</p>
          <div className="mt-6">
            <h3 className="font-medium text-sm mb-3">Size</h3>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {(productAny.sizes || []).map((size: string) => (
                <button key={size} type="button" className={`min-w-[2.5rem] px-4 py-2 text-sm border transition-colors ${selectedSize === size ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900' : 'border-gray-300 dark:border-gray-700 hover:border-gray-900'}`} onClick={() => setSelectedSize(size)}>{size}</button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <h3 className="font-medium text-sm mb-3">Color{selectedColor ? `: ${selectedColor}` : ''}</h3>
            <div className="flex gap-2 justify-center md:justify-start flex-wrap">
              {(productAny.colors || []).map((color: any) => (
                <button key={color?.name || ''} type="button" className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color?.name ? 'border-gray-900 dark:border-white scale-110' : 'border-gray-300'}`} style={{ backgroundColor: color?.code || color?.hex || '#ccc' }} title={color?.name || ''} onClick={() => setSelectedColor(color?.name || '')} />
              ))}
            </div>
          </div>
          <p className={`mt-4 text-sm ${(productAny.stock || 0) > 10 ? 'text-green-600' : (productAny.stock || 0) > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
            {(productAny.stock || 0) > 10 ? 'In Stock' : (productAny.stock || 0) > 0 ? `Only ${productAny.stock} left` : 'Out of Stock'}
          </p>
          <div className="flex flex-col items-center md:items-start gap-3 sm:gap-4 mt-6">
            <div className="flex items-center border border-gray-300 dark:border-gray-700 w-fit">
              <button type="button" className="px-4 py-3" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
              <span className="px-4 py-3 border-x border-gray-300 dark:border-gray-700">{quantity}</span>
              <button type="button" className="px-4 py-3" onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
            <div className="flex gap-2 sm:gap-4 w-full max-w-sm md:max-w-none">
              <button className="btn-primary flex-1 min-w-0 text-sm sm:text-base" disabled={(productAny.stock || 0) === 0} onClick={handleAddToCart}>Add to Cart</button>
              <button type="button" className="p-3 border border-gray-300 dark:border-gray-700 shrink-0" onClick={() => productAny && toggleWishlist(productAny.id)}>
                {inWishlist ? <HeartSolid className="w-6 h-6 text-red-500" /> : <HeartIcon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {vendor && (
        <section className="mt-12 sm:mt-16">
          <div className="card p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <Image src={vendor.logo || '/placeholder.png'} alt={vendor.storeName} width={64} height={64} className="w-16 h-16 rounded-full object-cover shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Sold by</p>
                  <h2 className="font-display text-xl font-semibold">{vendor.storeName}</h2>
                  <p className="text-sm text-gray-500 mt-1">{vendor.city}, {vendor.country} · {vendor.productCount || 0} products · ★ {vendor.rating || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">{vendor.description}</p>
                  {vendor.categories?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {vendor.categories.slice(0, 5).map((category: string) => (
                        <span key={category} className="badge bg-gray-100 dark:bg-gray-800">{category}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Link href={`/products?vendorId=${vendor.id}`} className="btn-secondary shrink-0">Shop This Vendor</Link>
            </div>
          </div>
        </section>
      )}

      {relatedProducts.length > 0 && (
        <section className="mt-12 sm:mt-16">
          <h2 className="section-title mb-6 text-center md:text-left">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 sm:mt-16">
        <h2 className="section-title mb-6 text-center md:text-left">Customer Reviews</h2>
        {!reviews.some((r: any) => r.userId === auth.user?.id) && (
          <div className="card p-4 sm:p-6 mb-6 max-w-2xl mx-auto md:mx-0">
            <h3 className="font-medium text-sm mb-4 text-center md:text-left">Write a Review</h3>
            {!auth.isAuthenticated ? (
              <div className="text-center md:text-left">
                <p className="text-sm text-gray-500 mb-3">Sign in to share your experience with this product.</p>
                <Link href={`/auth/login?redirect=${encodeURIComponent(pathname)}`} className="btn-primary text-sm py-2 inline-flex">Sign In to Review</Link>
              </div>
            ) : orders.length === 0 ? (
              <p className="text-sm text-gray-500">You need to purchase this product before leaving a review.</p>
            ) : (
              <form className="space-y-4" onSubmit={submitReview}>
                <div>
                  <label className="text-sm font-medium block mb-2 text-center md:text-left">Order</label>
                  <select value={reviewOrderId} onChange={(e) => setReviewOrderId(e.target.value)} className="input-field text-sm" required>
                    <option value="">Select order</option>
                    {orders.map((order: any) => (
                      <option key={order.id} value={order.id}>Order {order.id?.slice?.(-8) || order.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2 text-center md:text-left">Your Rating</p>
                  <div className="flex gap-1 justify-center md:justify-start">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} type="button" className="p-1" onClick={() => setReviewRating(i)}>
                        {i <= reviewRating ? <StarIcon className="w-7 h-7 text-yellow-400" /> : <StarOutline className="w-7 h-7 text-gray-300" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2 text-center md:text-left">Your Comment</label>
                  <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={4} className="input-field text-sm" placeholder="Tell others what you think..." required />
                </div>
                <button type="submit" className="btn-primary w-full sm:w-auto text-sm" disabled={submittingReview}>{submittingReview ? 'Submitting...' : 'Submit Review'}</button>
              </form>
            )}
          </div>
        )}
        {reviews.some((r: any) => r.userId === auth.user?.id) && <p className="text-sm text-gray-500 mb-6 text-center md:text-left">You have already reviewed this product.</p>}
        {reviews.length ? reviews.map((review: any) => (
          <div key={review.id} className="card p-4 mb-4">
            <p className="font-medium text-sm">{review.userName || 'Customer'}</p>
            <div className="flex mt-1">{[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} className={`w-3.5 h-3.5 ${i <= (review.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`} />)}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{review.comment}</p>
            {review.vendorReply && <ReviewReplyBlock reply={review.vendorReply} label="Store reply" />}
          </div>
        )) : <p className="text-gray-500 text-sm text-center md:text-left py-6">No reviews yet. Be the first to review!</p>}
      </section>
    </div>
  )
}
