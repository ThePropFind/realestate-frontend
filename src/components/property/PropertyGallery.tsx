'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PropertyImage } from '@/types'
import { IMAGE_BLUR } from '@/lib/utils'
import ImagePlaceholder from './ImagePlaceholder'

interface Props {
  images: PropertyImage[]
  title: string
  /** Badge overlay rendered top-left of the hero (server-rendered). */
  children?: React.ReactNode
}

export default function PropertyGallery({ images, title, children }: Props) {
  // Primary image first, then the rest — mirrors the order used elsewhere.
  const primary = images.find(i => i.isPrimary) ?? images[0]
  const ordered = primary ? [primary, ...images.filter(i => i.id !== primary.id)] : images

  const [active, setActive] = useState(0)
  const hasMany = ordered.length > 1
  const current = ordered[active]

  const go = (dir: -1 | 1) =>
    setActive(i => (i + dir + ordered.length) % ordered.length)

  return (
    <div>
      <div className="relative h-80 md:h-96 bg-slate-100 rounded-2xl overflow-hidden group">
        {current ? (
          <Image src={current.url} alt={title} fill priority sizes="(max-width: 768px) 100vw, 66vw"
            placeholder="blur" blurDataURL={IMAGE_BLUR} className="object-cover" />
        ) : (
          <ImagePlaceholder />
        )}

        {children}

        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-slate-700 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-slate-700 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronRight size={20} />
            </button>
            <span className="absolute bottom-3 right-3 text-xs font-medium text-white bg-slate-900/60 px-2 py-1 rounded-full">
              {active + 1} / {ordered.length}
            </span>
          </>
        )}
      </div>

      {hasMany && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {ordered.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              className={`relative w-20 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-100 border-2 transition ${
                i === active ? 'border-brand-600' : 'border-transparent hover:border-slate-300'
              }`}
            >
              <Image src={img.url} alt="" fill sizes="80px" placeholder="blur" blurDataURL={IMAGE_BLUR} className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
