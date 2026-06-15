'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useFeaturedVendors, useProducts } from '@/lib/api/hooks'
import { ProductCard } from '@/components/product/ProductCard'
import { HeroSlider } from '@/components/common/HeroSlider'
import { FeaturedVendorsCarousel } from '@/components/common/FeaturedVendorsCarousel'
import { heroImage } from '@/lib/utils/images'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

const heroSlides = [
  { label: "Men's Collection", title: 'Sharp Style for Every Occasion', subtitle: 'From Nairobi boardrooms to weekend outings — discover premium menswear across East Africa.', image: heroImage('men'), link: '/products?category=men' },
  { label: "Women's Fashion", title: 'Elegant Looks, African Spirit', subtitle: 'Dresses, kitenge-inspired pieces, and contemporary fashion curated for the modern woman.', image: heroImage('women'), link: '/products?category=women' },
  { label: 'Kids & Teens', title: 'Growing Up in Style', subtitle: 'Comfortable, durable clothing for boys, girls, and teens — from playtime to school days.', image: heroImage('kids'), link: '/products?category=kids' },
]

const promos = [
  { title: 'Fast Shipping', desc: 'Reliable delivery across East Africa', icon: '🚚' },
  { title: 'M-Pesa & Cards', desc: 'Pay your way, securely', icon: '📱' },
  { title: 'Easy Returns', desc: '14-day return policy', icon: '↩️' },
  { title: 'Verified Vendors', desc: 'Trusted East African sellers', icon: '✓' },
]

export default function HomePage() {
  const { data: featuredVendors, loading: loadingFeatured } = useFeaturedVendors()
  const { data: featuredProductsData } = useProducts({ featured: true })

  const featuredVendorsList = ((featuredVendors as any) || []) as any[]
  const featuredProductsList = ((featuredProductsData as any)?.items || (featuredProductsData as any) || []) as any[]

  const featuredVendorProducts = useMemo(() => {
    const vendorIds = featuredVendorsList.map((v: any) => v.id)
    return featuredProductsList.filter((p: any) => vendorIds.includes(p.vendorId)).slice(0, 12)
  }, [featuredVendorsList, featuredProductsList])

  const trending = featuredProductsList.filter((p: any) => p.trending).slice(0, 8)

  return (
    <div>
      <HeroSlider slides={heroSlides} />
      <section className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-gray-900">
        <div className="page-width py-6 sm:py-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {promos.map((promo) => (
            <div key={promo.title} className="text-center">
              <span className="text-2xl mb-2 block">{promo.icon}</span>
              <h3 className="font-medium text-sm">{promo.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{promo.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {(featuredVendorsList.length > 0 && !loadingFeatured) && (
        <section className="page-width py-12 sm:py-16">
          <p className="micro-label mb-1">Highlighted this week</p>
          <h2 className="section-title mb-8">Featured Vendors</h2>

          <FeaturedVendorsCarousel vendors={featuredVendorsList} />
        </section>
      )}

      <section className="page-width py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <p className="micro-label mb-1">Curated collections</p>
            <h2 className="section-title">Featured Products</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">From our verified featured vendors</p>
          </div>
          <Link href="/products?featured=true" className="flex items-center text-sm font-medium hover:underline text-brand-teal">
            View All <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {featuredVendorProducts?.map((p: any) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section className="bg-brand-teal text-white py-16">
        <div className="page-width grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
          <div>
            <p className="micro-label !text-brand-orange mb-2">Made for East Africa</p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold mb-4">Fashion From Nairobi to Kampala</h2>
            <p className="text-brand-100 mb-6">Shop local brands and international labels from verified vendors across Kenya, Uganda, Tanzania, Rwanda, and Ethiopia.</p>
            <Link href="/products?trending=true" className="btn-primary bg-brand-orange border-brand-orange hover:bg-brand-orange/90">Explore Trends</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
          <Image src="/placeholder.png" alt="African fashion" width={400} height={500} className="aspect-[4/5] object-cover w-full h-auto" />
          <Image src="/placeholder.png" alt="Women's dress" width={400} height={500} className="aspect-[4/5] object-cover mt-6 w-full h-auto" />
          <Image src="/placeholder.png" alt="T-shirt" width={400} height={500} className="aspect-[4/5] object-cover -mt-6 w-full h-auto" />
          <Image src="/placeholder.png" alt="Sneakers" width={400} height={500} className="aspect-[4/5] object-cover w-full h-auto" />
          </div>
        </div>
      </section>

      <section className="page-width py-8 sm:py-12">
        <p className="micro-label mb-1">What's hot</p>
        <h2 className="section-title mb-8">Trending in Kenya</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {trending?.map((p: any) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  )
}
