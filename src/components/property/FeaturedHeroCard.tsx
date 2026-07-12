import Link from 'next/link'
import Image from 'next/image'
import { Bed, Bath, Maximize2 } from 'lucide-react'
import type { PropertyCard } from '@/types'
import ImagePlaceholder from '@/components/property/ImagePlaceholder'
import HeartButton from '@/components/property/HeartButton'
import { formatPrice, bedroomLabel } from '@/lib/utils'

/** Large hero showcase card for the home page — the single featured property.
 *  Photo fills the card; the detail panel is overlaid on the bottom of the image. */
export default function FeaturedHeroCard({ property, priority = false }: { property: PropertyCard; priority?: boolean }) {
  const { id, title, price, priceUnit, bedrooms, bathrooms, areaSqft, localityName, cityName, primaryImageUrl } = property
  return (
    <Link href={`/properties/${id}`} className="group relative block rounded-3xl overflow-hidden shadow-card h-[28rem] sm:h-[34rem]">
      {primaryImageUrl ? (
        <Image src={primaryImageUrl} alt={title} fill priority={priority} sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="absolute inset-0"><ImagePlaceholder label={false} /></div>
      )}

      <span className="absolute top-5 left-5 bg-brand-900/85 text-white text-xs font-medium px-3 py-1.5 rounded-lg backdrop-blur-sm">
        Featured Property
      </span>
      <HeartButton propertyId={id} className="absolute top-5 right-5 w-9 h-9" size={20} />

      {/* Overlaid detail panel */}
      <div className="absolute bottom-5 left-5 right-5 sm:right-6 bg-white rounded-2xl shadow-card p-5">
        <p className="text-2xl font-bold text-slate-900">{formatPrice(price, priceUnit)}</p>
        <h3 className="text-base font-semibold text-slate-800 mt-1 line-clamp-1">{title}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{localityName}, {cityName}</p>
        <div className="flex items-center gap-5 mt-4 text-sm text-slate-600">
          {bedrooms !== null && <span className="flex items-center gap-1.5"><Bed size={16} className="text-slate-400" />{bedroomLabel(bedrooms)}</span>}
          {bathrooms !== null && <span className="flex items-center gap-1.5"><Bath size={16} className="text-slate-400" />{bathrooms} Baths</span>}
          <span className="flex items-center gap-1.5"><Maximize2 size={16} className="text-slate-400" />{areaSqft.toLocaleString()} sqft</span>
        </div>
      </div>
    </Link>
  )
}
