'use client'

import Link from 'next/link'
import { MediaImage } from '@/components/common/MediaImage'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid, StarIcon } from '@heroicons/react/24/solid'
import type { Product } from '@/lib/types'
import { formatCurrency } from '@/lib/utils/storage'
import { useCartStore } from '@/lib/stores/cart'

interface ProductCardProps {
  product: Product
  listView?: boolean
}

export function ProductCard({ product, listView = false }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useCartStore()
  const discountAmount = product.discount > 100 ? product.discount : product.price * (product.discount / 100)
  const salePrice = Math.max(0, product.price - discountAmount)
  const productImage = product.images?.[0]
  const inWishlist = isInWishlist(product.id)

  return (
    <div className={`group relative ${listView ? 'flex flex-col sm:flex-row gap-3 sm:gap-4 card p-3 sm:p-4' : ''}`}>
      <Link href={`/products/${product.id}`} className={`block overflow-hidden ${listView ? 'w-full sm:w-32 shrink-0' : ''}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-gray-800">
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
            <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 font-medium">
              -{product.discount}%
            </span>
          )}
          {product.newArrival && (
            <span className="absolute top-2 right-2 bg-gray-900 text-white text-xs px-2 py-1">NEW</span>
          )}
        </div>
      </Link>

      <div className={listView ? 'flex-1 flex flex-col justify-center min-w-0' : 'mt-3'}>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{product.brand}</p>
        <Link href={`/products/${product.id}`}>
          <h3 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white mt-1 group-hover:underline line-clamp-2">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-1 mt-1">
          <StarIcon className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs text-gray-500">{product.rating} ({product.reviewCount})</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(salePrice)}</span>
          {product.discount > 0 && (
            <span className="text-sm text-gray-400 line-through">{formatCurrency(product.price)}</span>
          )}
        </div>
        {listView && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{product.description}</p>}
      </div>

      <button
        className={`absolute top-2 right-2 p-2 bg-white/80 dark:bg-gray-900/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${inWishlist ? 'opacity-100' : ''}`}
        onClick={(e) => { e.preventDefault(); toggleWishlist(product.id) }}
      >
        {inWishlist ? <HeartSolid className="w-5 h-5 text-red-500" /> : <HeartIcon className="w-5 h-5" />}
      </button>
    </div>
  )
}
