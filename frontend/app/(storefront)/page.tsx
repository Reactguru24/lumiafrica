'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useFeaturedVendors, useHomepageProducts, usePromotions, useCollections, useProducts, useHomepageContent } from '@/lib/stores/api'
import { unwrapItems, unwrapPaginated } from '@/lib/utils/api'
import { filterStorefrontPromotions, type PromotionLike } from '@/lib/utils/promotions'
import { ProductCard } from '@/components/product/ProductCard'
import { HeroSlider } from '@/components/common/HeroSlider'
import { FeaturedVendorsCarousel, type FeaturedVendorSlide } from '@/components/common/FeaturedVendorsCarousel'
import { HomepageShowcaseSection, type HomepageShowcaseData } from '@/components/homepage/HomepageShowcaseSection'
import { heroImage, isExternalImageUrl } from '@/lib/utils/images'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

const fallbackHeroSlides = [
  { label: "Men's Collection", title: 'Sharp Style for Every Occasion', subtitle: 'From Nairobi boardrooms to weekend outings — discover premium menswear across East Africa.', image: heroImage('men'), link: '/products?category=men' },
  { label: "Women's Fashion", title: 'Elegant Looks, African Spirit', subtitle: 'Dresses, kitenge-inspired pieces, and contemporary fashion curated for the modern woman.', image: heroImage('women'), link: '/products?category=women' },
  { label: 'Kids & Teens', title: 'Growing Up in Style', subtitle: 'Comfortable, durable clothing for boys, girls, and teens — from playtime to school days.', image: heroImage('kids'), link: '/products?category=kids' },
]

const fallbackShowcase: HomepageShowcaseData = {
  overline: 'Made for East Africa',
  headline: 'Fashion From Nairobi to Kampala',
  description: 'Shop local brands and international labels from verified vendors across Kenya, Uganda, Tanzania, Rwanda, and Ethiopia.',
  buttonText: 'Explore Trends',
  buttonLink: '/products?trending=true',
  backgroundColor: '#084c54',
  images: [
    'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=1000&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=1000&fit=crop&q=80',
  ],
  active: true,
}

const fallbackPromos = [
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
  const { data: saleProductsData } = useProducts({ onSale: true, limit: 1 })
  const { data: homepageContent } = useHomepageContent()

  const content = (homepageContent as {
    heroSlides?: Array<{ label: string; title: string; subtitle?: string; image: string; link: string }>
    showcase?: HomepageShowcaseData
  }) || {}

  const heroSlides = (content.heroSlides?.length ? content.heroSlides : fallbackHeroSlides).map((slide) => ({
    label: slide.label,
    title: slide.title,
    subtitle: slide.subtitle || '',
    image: slide.image || heroImage('men'),
    link: slide.link || '/products',
  }))

  const promos = fallbackPromos

  const showcase: HomepageShowcaseData = content.showcase?.headline
    ? content.showcase
    : fallbackShowcase

  const featuredVendorsList = unwrapItems(featuredVendors) as FeaturedVendorSlide[]
  const collectionsData = (homepageProducts as any) || {}
  const featuredProducts = (collectionsData.featured || []) as any[]
  const trendingProducts = (collectionsData.trending || []) as any[]
  const bestsellerProducts = (collectionsData.bestsellers || []) as any[]
  const newArrivalProducts = (collectionsData.newArrivals || []) as any[]
  const saleProductTotal = unwrapPaginated(saleProductsData).total
  const hasDiscountedProducts = saleProductTotal > 0
  const activePromotions = hasDiscountedProducts
    ? filterStorefrontPromotions(unwrapItems<PromotionLike>(promotions))
    : []
  const curatedCollections = unwrapItems(collections)

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

      {activePromotions.length > 0 && (
        <section className="page-width py-8 sm:py-12">
          <p className="micro-label mb-1">Limited time</p>
          <h2 className="section-title mb-6">Promotions</h2>
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
                  {(promo.productIds?.length ?? 0)} discounted item{(promo.productIds?.length ?? 0) === 1 ? '' : 's'}
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
                  <Image src={coll.image} alt={coll.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 100vw, 50vw" unoptimized={isExternalImageUrl(coll.image)} />
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

      <HomepageShowcaseSection showcase={showcase} />

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

      {!loadingFeatured && featuredVendorsList.length > 0 && (
        <section className="page-width py-12 sm:py-16 border-t border-gray-200 dark:border-gray-800">
          <p className="micro-label mb-1">Highlighted this week</p>
          <h2 className="section-title mb-8">Featured Vendors</h2>
          <FeaturedVendorsCarousel vendors={featuredVendorsList} />
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
