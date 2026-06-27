'use client'

import Link from 'next/link'
import { usePromotions, useProducts } from '@/lib/stores/api'
import { unwrapItems, unwrapPaginated } from '@/lib/utils/api'
import { isStorefrontPromotionVisible } from '@/lib/utils/promotions'
import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/lib/types'

type Props = {
  promotionId: string
}

export default function PromotionProductsClient({ promotionId }: Props) {
  const { data: promotions } = usePromotions()
  const { data: saleProductsData } = useProducts({ onSale: true, limit: 100 })

  const promoList = unwrapItems(promotions)
  const promotion = promoList.find((p) => p.id === promotionId)
  const visible = promotion ? isStorefrontPromotionVisible(promotion) : false
  const { items: saleProducts } = unwrapPaginated<Product>(saleProductsData)

  if (!promotion || !visible) {
    return (
      <div className="page-width py-8 sm:py-12">
        <p className="text-sm text-gray-500">This promotion is not available. It may have ended or been deactivated.</p>
        <Link href="/" className="btn-secondary inline-block mt-4">Back to home</Link>
      </div>
    )
  }

  return (
    <div className="page-width py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <p className="micro-label mb-1">{promotion.type?.replace('_', ' ')}</p>
          <h1 className="section-title">{promotion.name}</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            All discounted products from marketplace vendors
          </p>
        </div>
        <Link href="/products?onSale=true" className="text-sm font-medium hover:underline text-brand-teal">
          Browse all sale items
        </Link>
      </div>

      {saleProducts.length === 0 ? (
        <p className="text-sm text-gray-500">No discounted products are available right now.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {saleProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
