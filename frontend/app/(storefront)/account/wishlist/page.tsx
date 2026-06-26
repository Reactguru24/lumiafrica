'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart'
import { publicAPI } from '@/lib/api/client'
import { ProductCard } from '@/components/product/ProductCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { Product } from '@/lib/types'

export default function AccountWishlistPage() {
  const cart = useCartStore()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const results: Product[] = []
      for (const id of cart.wishlist) {
        try {
          const p = await publicAPI.getProduct(id) as any
          results.push(p)
        } catch { /* skip */ }
      }
      setProducts(results)
      setLoading(false)
    }
    load()
  }, [cart.wishlist])

  if (loading) {
    return <div className="text-center py-8">Loading wishlist...</div>
  }

  return (
    <div>
      {!products.length ? (
        <EmptyState title="Your wishlist is empty" description="Save items you love by clicking the heart icon." actionLabel="Browse Products" onAction={() => router.push('/products')} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
