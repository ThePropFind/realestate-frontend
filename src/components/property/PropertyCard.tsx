import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Bed, Bath, Maximize2 } from 'lucide-react'
import type { PropertyCard } from '@/types'
import Badge from '@/components/ui/Badge'
import ImagePlaceholder from '@/components/property/ImagePlaceholder'
import HeartButton from '@/components/property/HeartButton'
import { formatPrice, LISTING_TYPE_LABELS, bedroomLabel, IMAGE_BLUR } from '@/lib/utils'

export default function PropertyCard({ property }: { property: PropertyCard }) {
  const { id, title, listingType, price, priceUnit, bedrooms, bathrooms, areaSqft,
          localityName, cityName, primaryImageUrl, isFeatured } = property
  return (
    <Link href={`/properties/${id}`}
      className="group bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden hover:border-brand-200 hover:shadow-card transition-all duration-200 block">
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        {primaryImageUrl ? (
          <Image src={primaryImageUrl} alt={title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            placeholder="blur" blurDataURL={IMAGE_BLUR}
            className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <ImagePlaceholder label={false} />
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge tone="slate" className="bg-white text-slate-700 border-transparent shadow-sm">{LISTING_TYPE_LABELS[listingType]}</Badge>
          {isFeatured && <Badge tone="accent" className="border-transparent shadow-sm">Featured</Badge>}
        </div>
        <HeartButton propertyId={id} className="absolute top-3 right-3 w-8 h-8" />
      </div>
      <div className="p-4">
        <p className="text-lg font-semibold text-brand-600 mb-1">{formatPrice(price, priceUnit)}</p>
        <h3 className="text-sm font-medium text-slate-800 mb-1 line-clamp-1">{title}</h3>
        <p className="flex items-center gap-1 text-xs text-slate-500 mb-3"><MapPin size={12} />{localityName}, {cityName}</p>
        <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
          {bedrooms !== null && <span className="flex items-center gap-1 text-xs text-slate-500"><Bed size={13} />{bedroomLabel(bedrooms)}</span>}
          {bathrooms !== null && <span className="flex items-center gap-1 text-xs text-slate-500"><Bath size={13} />{bathrooms} Bath</span>}
          <span className="flex items-center gap-1 text-xs text-slate-500 ml-auto"><Maximize2 size={13} />{areaSqft.toLocaleString()} sqft</span>
        </div>
      </div>
    </Link>
  )
}
