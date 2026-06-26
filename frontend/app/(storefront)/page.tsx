'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useFeaturedVendors, useHomepageProducts, usePromotions, useCollections } from '@/lib/stores/api'
import { unwrapItems } from '@/lib/utils/api'
import { ProductCard } from '@/components/product/ProductCard'
import { HeroSlider } from '@/components/common/HeroSlider'
import { FeaturedVendorsCarousel } from '@/components/common/FeaturedVendorsCarousel'
import { heroImage, HOMEPAGE_GRID_IMAGES } from '@/lib/utils/images'
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
  const { data: homepageProducts } = useHomepageProducts()
  const { data: promotions } = usePromotions()
  const { data: collections } = useCollections()

  const featuredVendorsList = unwrapItems(featuredVendors)
  const collectionsData = (homepageProducts as any) || {}
  const featuredProducts = (collectionsData.featured || []) as any[]
  const trendingProducts = (collectionsData.trending || []) as any[]
  const bestsellerProducts = (collectionsData.bestsellers || []) as any[]
  const newArrivalProducts = (collectionsData.newArrivals || []) as any[]
  const activePromotions = (promotions as any[]) || []
  const curatedCollections = (collections as any[]) || []

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

      {/* Promo banner — hidden for now
      <section className="relative h-44 sm:h-56 md:h-64 overflow-hidden">
        <Image
          src={HOMEPAGE_PROMO_BANNER}
          alt="East African fashion marketplace"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="page-width">
            <p className="text-white/90 text-sm sm:text-base max-w-lg">
              Discover curated fashion from verified vendors across East Africa — delivered to your door.
            </p>
          </div>
        </div>
      </section>
      */}

      {activePromotions.length > 0 && (
        <section className="page-width py-8 sm:py-12">
          <p className="micro-label mb-1">Limited time</p>
          <h2 className="section-title mb-6">Active Promotions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePromotions.map((promo: any) => (
              <Link
                key={promo.id}
                href={`/promotions/${promo.id}`}
                className="card p-5 hover:ring-2 hover:ring-brand-teal transition-all"
              >
                <span className="text-xs uppercase tracking-wide text-brand-orange font-medium">
                  {promo.type?.replace('_', ' ')}
                </span>
                <h3 className="font-semibold mt-1">{promo.name}</h3>
                <p className="text-sm text-gray-500 mt-2">
                  {promo.discountType === 'percentage'
                    ? `${promo.discountValue}% off`
                    : `Save KES ${promo.discountValue}`}
                  {promo.productIds?.length ? ` · ${promo.productIds.length} items` : ''}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {curatedCollections.length > 0 && (
        <section className="page-width py-8 sm:py-12 border-t border-gray-200 dark:border-gray-800">
          <p className="micro-label mb-1">Shop the edit</p>
          <h2 className="section-title mb-6">Curated Collections</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {curatedCollections.slice(0, 4).map((coll: any) => (
              <Link
                key={coll.id}
                href={`/collections/${coll.slug}`}
                className="group relative overflow-hidden rounded-sm aspect-[16/9] bg-gray-100 dark:bg-gray-800"
              >
                {coll.image && (
                  <Image src={coll.image} alt={coll.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 100vw, 50vw" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5 text-white">
                  <h3 className="font-display text-xl font-semibold">{coll.name}</h3>
                  {coll.description && <p className="text-sm text-white/80 mt-1 line-clamp-2">{coll.description}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loadingFeatured && featuredVendorsList.length > 0 && (
        <section className="page-width py-12 sm:py-16">
          <p className="micro-label mb-1">Highlighted this week</p>
          <h2 className="section-title mb-8">Featured Vendors</h2>
          <FeaturedVendorsCarousel vendors={featuredVendorsList} />
        </section>
      )}

      {featuredProducts.length > 0 && (
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
            {featuredProducts.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <section className="bg-brand-teal text-white py-16">
        <div className="page-width grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
          <div>
            <p className="micro-label !text-brand-orange mb-2">Made for East Africa</p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold mb-4">Fashion From Nairobi to Kampala</h2>
            <p className="text-brand-100 mb-6">Shop local brands and international labels from verified vendors across Kenya, Uganda, Tanzania, Rwanda, and Ethiopia.</p>
            <Link href="/products?trending=true" className="btn-primary bg-brand-orange border-brand-orange hover:bg-brand-orange/90">Explore Trends</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {HOMEPAGE_GRID_IMAGES.map((img, i) => (
              <Image
                key={img.alt}
                src={img.src}
                alt={img.alt}
                width={400}
                height={500}
                className={`aspect-[4/5] object-cover w-full h-auto rounded-sm ${i === 1 ? 'mt-6' : i === 2 ? '-mt-6' : ''}`}
              />
            ))}
          </div>
        </div>
      </section>

      {trendingProducts.length > 0 && (
        <section className="page-width py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <p className="micro-label mb-1">What's hot</p>
              <h2 className="section-title">Trending in Kenya</h2>
            </div>
            <Link href="/products?trending=true" className="flex items-center text-sm font-medium hover:underline text-brand-teal">
              View All <ChevronRightIcon className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {trendingProducts.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {bestsellerProducts.length > 0 && (
        <section className="page-width py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <p className="micro-label mb-1">Customer favorites</p>
              <h2 className="section-title">Bestsellers</h2>
            </div>
            <Link href="/products?bestseller=true" className="flex items-center text-sm font-medium hover:underline text-brand-teal">
              View All <ChevronRightIcon className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {bestsellerProducts.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {newArrivalProducts.length > 0 && (
        <section className="page-width py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <p className="micro-label mb-1">Fresh additions</p>
              <h2 className="section-title">New Arrivals</h2>
            </div>
            <Link href="/products?newArrival=true&sort=newest" className="flex items-center text-sm font-medium hover:underline text-brand-teal">
              View All <ChevronRightIcon className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {newArrivalProducts.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
