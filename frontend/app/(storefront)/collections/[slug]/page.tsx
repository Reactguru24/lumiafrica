'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useCollection } from '@/lib/stores/api'
import { ProductCard } from '@/components/product/ProductCard'

export default function CollectionPage() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const { data, loading, error } = useCollection(slug)
  const collection = data as {
    name?: string
    description?: string
    image?: string
    products?: any[]
  } | null

  if (loading) {
    return <div className="page-width py-16 text-center text-gray-500">Loading collection...</div>
  }

  if (error || !collection) {
    return <div className="page-width py-16 text-center text-red-500">Collection not found.</div>
  }

  const products = collection.products ?? []

  return (
    <div>
      <section className="relative h-48 sm:h-64 bg-gray-900 text-white overflow-hidden">
        {collection.image && (
          <Image src={collection.image} alt={collection.name || ''} fill className="object-cover opacity-50" sizes="100vw" />
        )}
        <div className="absolute inset-0 flex items-end">
          <div className="page-width pb-8">
            <p className="micro-label !text-brand-orange mb-1">Collection</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold">{collection.name}</h1>
            {collection.description && <p className="text-white/80 mt-2 max-w-2xl">{collection.description}</p>}
          </div>
        </div>
      </section>
      <section className="page-width py-10">
        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No products in this collection yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
        <div className="mt-10 text-center">
          <Link href="/products" className="btn-secondary">Browse all products</Link>
        </div>
      </section>
    </div>
  )
}
