'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { usePromotions, useProducts } from '@/lib/stores/api'
import { unwrapItems } from '@/lib/utils/api'
import { ProductCard } from '@/components/product/ProductCard'

type Props = {
  promotionId: string
}

export default function PromotionProductsClient({ promotionId }: Props) {
  const { data: promotions } = usePromotions()
  const { data: allProducts } = useProducts({ limit: 500 })

  const promoList = (promotions as any[]) || []
  const promotion = promoList.find((p) => p.id === promotionId)

  const productsForPromo = useMemo(() => {
    if (!promotion || !promotion.productIds?.length) return []
    const list = unwrapItems(allProducts as any) as any[]
    const set = new Set(promotion.productIds as string[])
    return list.filter((p) => set.has(p.id))
  }, [promotion, allProducts])

  return (
    <div className="page-width py-8 sm:py-12">
      {!promotion ? (
        <p className="text-sm text-gray-500">Promotion not found.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <p className="micro-label mb-1">Promotion</p>
              <h1 className="section-title">{promotion.name}</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {promotion.discountType === 'percentage'
                  ? `${promotion.discountValue}% off`
                  : `Save KES ${promotion.discountValue}`}
              </p>
            </div>
            <Link href="/products" className="text-sm font-medium hover:underline text-brand-teal">
              View all products
            </Link>
          </div>

          {productsForPromo.length === 0 ? (
            <p className="text-sm text-gray-500">No products are linked to this promotion yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {productsForPromo.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

