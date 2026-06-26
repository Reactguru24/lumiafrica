'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { MediaImage } from '@/components/common/MediaImage'
import { VendorVerificationBadge } from '@/components/vendor/VendorVerificationBadge'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export type FeaturedVendorSlide = {
  id: string
  storeName: string
  description?: string
  logo?: string
  banner?: string
  rating?: number
  verificationBadge?: string
}

function VendorSlideContent({ vendor }: { vendor: FeaturedVendorSlide }) {
  return (
    <>
      <MediaImage src={vendor.banner || vendor.logo} alt={vendor.storeName} fill transform={{ width: 1280 }} className="object-cover" sizes="(max-width: 768px) 100vw, 1280px" />
      <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-4">
          <MediaImage
            src={vendor.logo}
            alt={vendor.storeName}
            width={64}
            height={64}
            transform={{ width: 128 }}
            className="w-16 h-16 rounded-full border-4 border-white object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-display text-2xl sm:text-3xl font-semibold truncate">{vendor.storeName}</h3>
              <VendorVerificationBadge badge={vendor.verificationBadge} rating={vendor.rating} className="w-5 h-5" showLabel />
            </div>
            <p className="text-brand-100 text-sm mt-1">
              Featured Collection{vendor.rating ? ` · ★ ${vendor.rating}` : ''}
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
  const cardsRef = useRef<HTMLDivElement | null>(null)
  const isCarousel = vendors.length > 1

  const scrollThumbTo = useCallback((index: number) => {
    const container = cardsRef.current
    if (!container) return
    const el = container.children[index] as HTMLElement | undefined
    if (!el) return
    const left = el.offsetLeft - (container.clientWidth - el.clientWidth) / 2
    container.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [])

  const goTo = useCallback((index: number, scrollThumb = false) => {
    const nextIndex = (index + vendors.length) % vendors.length
    setActive(nextIndex)
    if (scrollThumb) {
      requestAnimationFrame(() => scrollThumbTo(nextIndex))
    }
  }, [vendors.length, scrollThumbTo])

  const prev = useCallback(() => goTo(active - 1, true), [active, goTo])

  useEffect(() => {
    setActive(0)
  }, [vendors.length])

  useEffect(() => {
    if (!isCarousel) return
    const timer = setInterval(() => goTo(active + 1), 7000)
    return () => clearInterval(timer)
  }, [isCarousel, active, goTo])

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
              onClick={() => goTo(active + 1, true)}
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
                onClick={() => goTo(idx, true)}
                className={`h-2 rounded-full transition-all ${idx === active ? 'w-8 bg-brand-teal dark:bg-brand-orange' : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'}`}
                aria-label={`View ${vendor.storeName}`}
              />
            ))}
          </div>

          <div ref={cardsRef} className="hide-scrollbar flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-2 -mx-1 px-1">
            {vendors.map((vendor, idx) => (
              <button
                key={vendor.id}
                type="button"
                onClick={() => goTo(idx, true)}
                className={`card p-4 text-left transition-all border-2 shrink-0 snap-center w-[min(17rem,82vw)] ${
                  idx === active
                    ? 'border-brand-teal dark:border-brand-orange bg-brand-teal/5 dark:bg-brand-orange/5'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <MediaImage
                    src={vendor.logo}
                    alt={vendor.storeName}
                    width={40}
                    height={40}
                    transform={{ width: 80 }}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{vendor.storeName}</p>
                      <VendorVerificationBadge badge={vendor.verificationBadge} rating={vendor.rating} />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                      Featured Collection{vendor.rating ? ` · ★ ${vendor.rating}` : ''}
                    </p>
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
