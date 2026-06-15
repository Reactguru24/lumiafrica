'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export interface HeroSlide {
  label: string
  title: string
  subtitle: string
  image: string
  link: string
}

interface HeroSliderProps {
  slides: HeroSlide[]
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const [active, setActive] = useState(0)

  const goTo = useCallback((index: number) => {
    setActive((index + slides.length) % slides.length)
  }, [slides.length])

  const next = useCallback(() => goTo(active + 1), [active, goTo])
  const prev = useCallback(() => goTo(active - 1), [active, goTo])

  useEffect(() => {
    const timer = setInterval(next, 6000)
    return () => clearInterval(timer)
  }, [next])

  return (
    <section className="relative min-h-[420px] h-[55vh] sm:h-[60vh] md:h-[75vh] overflow-hidden bg-gray-900">
      {slides.map((slide, i) => (
        <div
          key={slide.label}
          className={`absolute inset-0 transition-opacity duration-700 ${i === active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
        >
          {i === active && (
            <Image src={slide.image} alt={slide.title} fill className="object-cover" priority />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 w-full text-white">
              <p className="micro-label text-brand-orange mb-3">{slide.label}</p>
              <h1 className="font-display text-2xl sm:text-4xl md:text-6xl font-semibold mb-3 sm:mb-4 max-w-xl leading-tight">{slide.title}</h1>
              <p className="text-sm sm:text-lg text-gray-200 mb-6 sm:mb-8 max-w-md line-clamp-3 sm:line-clamp-none">{slide.subtitle}</p>
              <Link href={slide.link} className="btn-primary bg-brand-orange text-white border-brand-orange hover:bg-brand-orange/90">
                Shop Collection
              </Link>
            </div>
          </div>
        </div>
      ))}

      <button className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full text-white" aria-label="Previous slide" onClick={prev}>
        <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <button className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full text-white" aria-label="Next slide" onClick={next}>
        <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === active ? 'w-8 bg-brand-orange' : 'w-4 bg-white/50'}`}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </section>
  )
}
