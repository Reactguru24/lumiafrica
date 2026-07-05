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
    <div className={`group relative ${listView ? 'flex flex-col sm:flex-row gap-3 sm:gap-4 card p-3 sm:p-4' : ''}`}>
      <Link href={`/products/${product.id}`} className={`block overflow-hidden ${listView ? 'w-full sm:w-32 shrink-0' : ''}`}>
        <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${compact ? 'aspect-[4/5]' : 'aspect-[3/4]'}`}>
          <MediaImage
            src={productImage}
            alt={product.name}
            fill
            loading="lazy"
            transform={{ width: 600, aspect: '3:4' }}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {product.discount > 0 && (
            <span className={`absolute top-1.5 left-1.5 bg-red-600 text-white font-medium ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}>
              -{product.discount}%
            </span>
          )}
          {product.newArrival && (
            <span className={`absolute top-1.5 right-1.5 bg-gray-900 text-white ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}>NEW</span>
          )}
        </div>
      </Link>

      <div className={listView ? 'flex-1 flex flex-col justify-center min-w-0' : compact ? 'mt-1.5' : 'mt-3'}>
        <p className={`text-gray-500 dark:text-gray-400 uppercase tracking-wider ${compact ? 'text-[10px]' : 'text-xs'}`}>{product.brand}</p>
        <Link href={`/products/${product.id}`}>
          <h3 className={`font-medium text-gray-900 dark:text-white group-hover:underline line-clamp-2 ${compact ? 'text-xs mt-0.5' : 'text-sm sm:text-base mt-1'}`}>{product.name}</h3>
        </Link>
        <div className="flex items-center gap-1 mt-0.5">
          <StarIcon className={compact ? 'w-3 h-3 text-yellow-400' : 'w-3.5 h-3.5 text-yellow-400'} />
          <span className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>{product.rating} ({product.reviewCount})</span>
        </div>
        <div className={`flex items-center gap-2 ${compact ? 'mt-1' : 'mt-2'}`}>
          <span className={`font-semibold text-gray-900 dark:text-white ${compact ? 'text-xs' : ''}`}>{formatPrice(salePrice)}</span>
          {discount > 0 && (
            <span className={`text-gray-400 line-through ${compact ? 'text-[10px]' : 'text-sm'}`}>{formatPrice(price)}</span>
          )}
        </div>
        {listView && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{product.description}</p>}
      </div>

      <button
        className={`absolute top-1.5 right-1.5 bg-white/80 dark:bg-gray-900/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${inWishlist ? 'opacity-100' : ''} ${compact ? 'p-1.5' : 'p-2 top-2 right-2'}`}
        onClick={handleWishlist}
      >
        {inWishlist ? <HeartSolid className={compact ? 'w-4 h-4 text-red-500' : 'w-5 h-5 text-red-500'} /> : <HeartIcon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />}
      </button>
    </div>
  )
}
