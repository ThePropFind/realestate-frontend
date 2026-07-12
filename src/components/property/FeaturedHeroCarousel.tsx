'use client'
import { useEffect, useState } from 'react'
import type { PropertyCard } from '@/types'
import FeaturedHeroCard from '@/components/property/FeaturedHeroCard'
import { cn } from '@/lib/utils'

const ROTATE_MS = 5000

/**
 * Auto-rotating wrapper around FeaturedHeroCard for the home hero. Cross-fades
 * through every featured property, pauses on hover, and exposes clickable dots.
 * A single property renders statically (no autoplay/dots).
 */
export default function FeaturedHeroCarousel({ properties }: { properties: PropertyCard[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = properties.length

  // Auto-advance. Reset the timer whenever the index changes (so dot clicks
  // give a fresh full interval) or when paused on hover.
  useEffect(() => {
    if (count <= 1 || paused) return
    const t = setInterval(() => setIndex(i => (i + 1) % count), ROTATE_MS)
    return () => clearInterval(t)
  }, [count, paused, index])

  if (count === 0) return null
  if (count === 1) return <FeaturedHeroCard property={properties[0]} priority />

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Stacked slides, cross-faded via opacity. The active slide drives layout
          height; the rest are absolutely positioned on top and hidden. */}
      <div className="relative">
        {properties.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              'transition-opacity duration-700',
              i === index ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0',
            )}
            aria-hidden={i !== index}
          >
            <FeaturedHeroCard property={p} priority={i === 0} />
          </div>
        ))}
      </div>

      {/* Dots — top-center, clear of the badge (top-left), heart (top-right) and
          the white detail panel that occupies the bottom of the card. */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {properties.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show featured property ${i + 1}`}
            aria-current={i === index}
            className={cn(
              'h-2 rounded-full transition-all',
              i === index ? 'w-6 bg-brand-600' : 'w-2 bg-white/70 hover:bg-white shadow-sm',
            )}
          />
        ))}
      </div>
    </div>
  )
}
