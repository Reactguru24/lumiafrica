'use client'

import Link from 'next/link'
import Image from 'next/image'
import { isExternalImageUrl } from '@/lib/utils/images'

export type HomepageShowcaseData = {
  id?: string
  overline?: string
  headline?: string
  description?: string
  buttonText?: string
  buttonLink?: string
  backgroundColor?: string
  images?: string[]
  active?: boolean
}

const GRID_OFFSETS = ['', 'mt-6', '-mt-6', '']

export function HomepageShowcaseSection({ showcase }: { showcase: HomepageShowcaseData }) {
  const images = (showcase.images ?? []).filter(Boolean)
  if (showcase.active === false) return null
  if (!showcase.headline && images.length === 0) return null

  const bg = showcase.backgroundColor || '#084c54'

  return (
    <section className="py-12 sm:py-16" style={{ backgroundColor: bg }}>
      <div className="page-width grid md:grid-cols-2 gap-8 sm:gap-10 items-center">
        <div className="text-white">
          {showcase.overline && (
            <p className="micro-label !text-brand-orange mb-2 uppercase tracking-widest">{showcase.overline}</p>
          )}
          {showcase.headline && (
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold mb-4 leading-tight">
              {showcase.headline}
            </h2>
          )}
          {showcase.description && (
            <p className="text-white/85 mb-6 text-sm sm:text-base leading-relaxed max-w-lg">{showcase.description}</p>
          )}
          {showcase.buttonText && showcase.buttonLink && (
            <Link
              href={showcase.buttonLink}
              className="inline-flex items-center justify-center px-6 py-3 rounded-sm bg-brand-orange text-white font-medium text-sm hover:bg-brand-orange/90 transition-colors"
            >
              {showcase.buttonText}
            </Link>
          )}
        </div>
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {images.slice(0, 4).map((src, i) => (
              <Image
                key={`${src}-${i}`}
                src={src}
                alt=""
                width={400}
                height={500}
                className={`aspect-[4/5] object-cover w-full h-auto rounded-sm ${GRID_OFFSETS[i] ?? ''}`}
                unoptimized={isExternalImageUrl(src)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
