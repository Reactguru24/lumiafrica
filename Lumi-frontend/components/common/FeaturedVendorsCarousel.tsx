'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeftIcon, ChevronRightIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { resolveMediaUrl } from '@/lib/utils/api'

export type FeaturedVendorSlide = {
  id: string
  storeName: string
  description?: string
  logo?: string
  banner?: string
}

function VendorSlideContent({ vendor }: { vendor: FeaturedVendorSlide }) {
  const bannerSrc = resolveMediaUrl(vendor.banner || vendor.logo)
  const logoSrc = resolveMediaUrl(vendor.logo)

  return (
    <>
      <Image src={bannerSrc} alt={vendor.storeName} fill className="object-cover" sizes="(max-width: 768px) 100vw, 1280px" unoptimized={bannerSrc.includes('/uploads')} />
      <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-4">
          <Image
            src={logoSrc}
            alt={vendor.storeName}
            width={64}
            height={64}
            className="w-16 h-16 rounded-full border-4 border-white object-cover shrink-0"
            unoptimized={logoSrc.includes('/uploads')}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-display text-2xl sm:text-3xl font-semibold truncate">{vendor.storeName}</h3>
            <p className="text-brand-100 text-sm mt-1 flex items-center gap-1">
              <ShieldCheckIcon className="w-4 h-4 shrink-0" />
              Verified Vendor · Featured Collection
            </p>
          </div>
        </div>
        {vendor.description && (
          <p className="text-white text-sm sm:text-base max-w-2xl mb-4 line-clamp-2">{vendor.description}</p>
        )}
        <Link href={`/products?vendorId=${vendor.id}`} className="btn-primary bg-brand-orange border-brand-orange w-fit">
          Shop This Vendor
        </Link>
      </div>
    </>
  )
}

interface FeaturedVendorsCarouselProps {
  vendors: FeaturedVendorSlide[]
}

export function FeaturedVendorsCarousel({ vendors }: FeaturedVendorsCarouselProps) {
  const [active, setActive] = useState(0)
  const isCarousel = vendors.length > 1

  const goTo = useCallback((index: number) => {
    setActive((index + vendors.length) % vendors.length)
  }, [vendors.length])

  const next = useCallback(() => goTo(active + 1), [active, goTo])
  const prev = useCallback(() => goTo(active - 1), [active, goTo])

  useEffect(() => {
    setActive(0)
  }, [vendors.length])

  useEffect(() => {
    if (!isCarousel) return
    const timer = setInterval(next, 7000)
    return () => clearInterval(timer)
  }, [isCarousel, next])

  if (!vendors.length) return null

  return (
    <div className="relative mb-8">
      <div className="relative overflow-hidden rounded-lg h-96 bg-gray-100 dark:bg-gray-800">
        {isCarousel ? (
          vendors.map((vendor, i) => (
            <div
              key={vendor.id}
              className={`absolute inset-0 transition-opacity duration-700 ${i === active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            >
              <div className="relative w-full h-full">
                <VendorSlideContent vendor={vendor} />
              </div>
            </div>
          ))
        ) : (
          <div className="relative w-full h-full">
            <VendorSlideContent vendor={vendors[0]} />
          </div>
        )}

        {isCarousel && (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full text-white"
              aria-label="Previous vendor"
              onClick={prev}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full text-white"
              aria-label="Next vendor"
              onClick={next}
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {isCarousel && (
        <>
          <div className="flex items-center justify-center gap-2 mt-6">
            {vendors.map((vendor, idx) => (
              <button
                key={vendor.id}
                type="button"
                onClick={() => goTo(idx)}
                className={`h-2 rounded-full transition-all ${idx === active ? 'w-8 bg-brand-teal dark:bg-brand-orange' : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'}`}
                aria-label={`View ${vendor.storeName}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-6">
            {vendors.map((vendor, idx) => (
              <button
                key={vendor.id}
                type="button"
                onClick={() => goTo(idx)}
                className={`card p-4 text-left transition-all border-2 ${
                  idx === active
                    ? 'border-brand-teal dark:border-brand-orange bg-brand-teal/5 dark:bg-brand-orange/5'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Image
                    src={resolveMediaUrl(vendor.logo)}
                    alt={vendor.storeName}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                    unoptimized={(vendor.logo || '').startsWith('/uploads')}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{vendor.storeName}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">Featured Collection</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
