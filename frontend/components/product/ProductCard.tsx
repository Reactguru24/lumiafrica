'use client'

import Link from 'next/link'
import { toast } from 'sonner'
import { MediaImage } from '@/components/common/MediaImage'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid, StarIcon } from '@heroicons/react/24/solid'
import type { Product } from '@/lib/types'
import { useFormatCurrency } from '@/lib/stores/currency'
import { useCartStore } from '@/lib/stores/cart'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

interface ProductCardProps {
  product: Product
  listView?: boolean
  compact?: boolean
}

export function ProductCard({ product, listView = false, compact = false }: ProductCardProps) {
  const formatPrice = useFormatCurrency()
  const { isInWishlist, toggleWishlist } = useCartStore()
  const price = Number(product.price) || 0
  const discount = Number(product.discount) || 0
  const discountAmount = discount > 100 ? discount : price * (discount / 100)
  const salePrice = Math.max(0, price - discountAmount)
  const productImage = product.images?.[0]
  const inWishlist = product.id ? isInWishlist(product.id) : false

  if (!product.id) return null

  async function handleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    try {
      await toggleWishlist(product.id)
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Could not update wishlist'))
    }
  }

  return (
    <div className={`product-card group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${listView ? 'flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4' : ''}`}>
      <Link href={`/products/${product.id}`} className={`block overflow-hidden ${listView ? 'w-full sm:w-32 shrink-0' : ''}`}>
        <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${compact ? 'aspect-[4/5]' : 'aspect-[3/4]'}`}>
          <MediaImage
            src={productImage}
            alt={product.name}
            fill
            loading="lazy"
            transform={{ width: 600, aspect: '3:4' }}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {product.discount > 0 && (
            <span className={`absolute top-1.5 left-1.5 product-card-badge product-card-sale`}>
              -{product.discount}%
            </span>
          )}
          {product.newArrival && (
            <span className={`absolute top-1.5 right-1.5 product-card-badge product-card-new`}>
              NEW
            </span>
          )}
        </div>
      </Link>

      <div className={listView ? 'flex-1 flex flex-col justify-center min-w-0' : compact ? 'mt-1.5' : 'mt-3'}>
        <p className={`product-card-brand ${compact ? 'text-[10px]' : ''}`}>{product.brand}</p>
        <Link href={`/products/${product.id}`}>
          <h3 className={`font-medium ${compact ? 'text-xs mt-0.5' : 'text-sm sm:text-base mt-1'} line-clamp-2 text-gray-900 dark:text-white`}>{product.name}</h3>
        </Link>
        <div className="product-card-rating">
          <StarIcon className={compact ? 'w-3 h-3 text-yellow-400' : 'w-3.5 h-3.5 text-yellow-400'} />
          <span className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>{product.rating} ({product.reviewCount})</span>
        </div>
        <div className={`product-card-price ${compact ? 'mt-1' : 'mt-2'}`}>
          <span className={`font-semibold text-gray-900 dark:text-white ${compact ? 'text-xs' : ''}`}>{formatPrice(salePrice)}</span>
          {discount > 0 && (
            <span className={`text-gray-400 line-through ${compact ? 'text-[10px]' : 'text-sm'}`}>{formatPrice(price)}</span>
          )}
        </div>
        {listView && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{product.description}</p>}
      </div>

      <button
        className={`absolute top-1.5 right-1.5 bg-white/80 dark:bg-gray-900/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${inWishlist ? 'opacity-100' : ''} ${compact ? 'p-1.5' : 'p-2 top-2 right-2'}`}
        onClick={handleWishlist}
      >
        {inWishlist ? <HeartSolid className={compact ? 'w-4 h-4 text-red-500' : 'w-5 h-5 text-red-500'} /> : <HeartIcon className={compact ? 'w-4 h-4 text-gray-700 dark:text-gray-300' : 'w-5 h-5 text-gray-700 dark:text-gray-300'} />}
      </button>
    </div>
  )
}
