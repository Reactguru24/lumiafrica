'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart'
import { publicAPI } from '@/lib/api/client'
import { ProductCard } from '@/components/product/ProductCard'
import { EmptyState } from '@/components/common/EmptyState'
import { isValidProductId, parseProductDetail } from '@/lib/utils/product'
import type { Product } from '@/lib/types'

export default function AccountWishlistPage() {
  const cart = useCartStore()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const results: Product[] = []
      const ids = cart.wishlist.filter(isValidProductId)

      await Promise.all(
        ids.map(async (id) => {
          try {
            const raw = await publicAPI.getProduct(id)
            const product = parseProductDetail(raw)
            if (product) results.push(product)
          } catch {
            /* skip unavailable products */
          }
        }),
      )

      if (!cancelled) {
        setProducts(results)
        setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [cart.wishlist])

  if (loading) {
    return <div className="text-center py-6 text-sm text-gray-500">Loading wishlist...</div>
  }

  return (
    <div>
      {!products.length ? (
        <EmptyState title="Your wishlist is empty" description="Save items you love by clicking the heart icon." actionLabel="Browse Products" onAction={() => router.push('/products')} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
          {products.map((p) => <ProductCard key={p.id} product={p} compact />)}
        </div>
      )}
    </div>
  )
}
