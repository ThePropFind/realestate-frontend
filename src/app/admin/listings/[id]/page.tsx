'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import { formatPrice, LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/lib/utils'
import type { PropertyDetail, PropertyDocument } from '@/types'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { ArrowLeft, CheckCircle, XCircle, Star, StarOff, Bed, Bath, Maximize2, MapPin, FileText, ExternalLink, ShieldCheck } from 'lucide-react'

const STATUS_BADGE: Record<string, string> = {
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE:         'bg-green-50 text-green-700 border-green-200',
  REJECTED:       'bg-red-50   text-red-700   border-red-200',
  EXPIRED:        'bg-slate-50  text-slate-500  border-slate-200',
  DRAFT:          'bg-slate-50  text-slate-500  border-slate-200',
  SOLD_RENTED:    'bg-brand-50 text-brand-700 border-brand-200',
}

export default function AdminListingPreview() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [activeImg, setActiveImg] = useState(0)

  useEffect(() => {
    adminApi.getListing(id)
      .then(r => setProperty(r.data))
      .catch(() => { toast.error('Failed to load listing'); router.push('/admin/listings') })
      .finally(() => setLoading(false))
  }, [id, router])

  async function approve() {
    try   { await adminApi.approve(id); toast.success('Approved'); router.push('/admin/listings') }
    catch { toast.error('Failed to approve') }
  }

  const [rejectOpen, setRejectOpen] = useState(false)

  async function reject(reason?: string) {
    if (!reason) return
    try   { await adminApi.reject(id, reason); toast.success('Rejected'); router.push('/admin/listings') }
    catch { toast.error('Failed to reject') }
    finally { setRejectOpen(false) }
  }

  async function toggleFeatured() {
    if (!property) return
    try {
      const res = await adminApi.toggleFeatured(id)
      setProperty(res.data)
      toast.success(property.isFeatured ? 'Removed from featured' : 'Marked as featured')
    } catch { toast.error('Failed to update featured') }
  }

  if (loading) return <div className="p-10 text-center text-sm text-slate-400">Loading...</div>
  if (!property) return null

  const primaryImage = property.images.find(i => i.isPrimary) ?? property.images[0]
  const displayImg   = property.images[activeImg] ?? primaryImage

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/listings"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{property.title}</h1>
            <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin size={12} />{property.localityName}, {property.cityName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${STATUS_BADGE[property.status] ?? STATUS_BADGE.DRAFT}`}>
            {property.status.replace('_', ' ')}
          </span>
          {property.isFeatured && (
            <span className="text-xs font-medium px-3 py-1.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
              ★ Featured
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — images + details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Image gallery */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="h-64 bg-slate-100 flex items-center justify-center">
              {displayImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayImg.url} alt={property.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-200 text-5xl">⌂</span>
              )}
            </div>
            {property.images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {property.images.map((img, idx) => (
                  <button key={img.id} onClick={() => setActiveImg(idx)}
                    className={`w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-colors
                      ${activeImg === idx ? 'border-brand-600' : 'border-transparent'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Key specs */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {property.bedrooms !== null && (
                <div className="flex items-center gap-2">
                  <Bed size={15} className="text-brand-400 shrink-0" />
                  <div><p className="text-xs text-slate-400">Bedrooms</p><p className="text-sm font-medium">{property.bedrooms} BHK</p></div>
                </div>
              )}
              {property.bathrooms !== null && (
                <div className="flex items-center gap-2">
                  <Bath size={15} className="text-brand-400 shrink-0" />
                  <div><p className="text-xs text-slate-400">Bathrooms</p><p className="text-sm font-medium">{property.bathrooms}</p></div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Maximize2 size={15} className="text-brand-400 shrink-0" />
                <div><p className="text-xs text-slate-400">Area</p><p className="text-sm font-medium">{property.areaSqft.toLocaleString()} sqft</p></div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-sm">
              {[
                ['Type',        PROPERTY_TYPE_LABELS[property.propertyType]],
                ['Listing',     LISTING_TYPE_LABELS[property.listingType]],
                ['Furnishing',  FURNISHING_LABELS[property.furnishing]],
                ['Facing',      property.facing ?? '—'],
                ['Floor',       property.floorNumber != null ? `${property.floorNumber} / ${property.totalFloors ?? '?'}` : '—'],
                ['Parking',     property.parkingAvailable ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <div key={label}><p className="text-xs text-slate-400">{label}</p><p className="font-medium text-slate-800">{value}</p></div>
              ))}
            </div>
            {property.description && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Description</p>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            )}
          </div>

          {/* Verification documents */}
          <VerificationDocs propertyId={id} documents={property.documents ?? []} />
        </div>

        {/* Right — actions + owner */}
        <div className="space-y-4">
          {/* Price */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-2xl font-bold text-brand-600">{formatPrice(property.price, property.priceUnit)}</p>
            {property.priceNegotiable && <p className="text-xs text-green-600 font-medium mt-0.5">Negotiable</p>}
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 space-y-1">
              <p>{property.viewsCount} views · {property.inquiryCount} inquiries</p>
              {property.rejectionReason && (
                <p className="text-red-500">Rejected: {property.rejectionReason}</p>
              )}
            </div>
          </div>

          {/* Moderation actions */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</p>
            {property.status === 'PENDING_REVIEW' && (
              <>
                <button onClick={approve}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                  <CheckCircle size={14} /> Approve
                </button>
                <button onClick={() => setRejectOpen(true)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                  <XCircle size={14} /> Reject
                </button>
              </>
            )}
            <button onClick={toggleFeatured}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
              {property.isFeatured ? <><StarOff size={14} /> Remove featured</> : <><Star size={14} /> Mark as featured</>}
            </button>
          </div>

          {/* Owner */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Owner</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-medium shrink-0">
                {property.owner.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{property.owner.name}</p>
                <p className="text-xs text-slate-400 capitalize">{property.owner.role.toLowerCase()}</p>
                {property.owner.phone && <p className="text-xs text-slate-400">{property.owner.phone}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={rejectOpen}
        tone="danger"
        title="Reject this listing?"
        message={`"${property.title}" will be rejected. The reason below is shown to the seller.`}
        confirmLabel="Reject listing"
        withReason reasonRequired
        reasonPlaceholder="Rejection reason (required, shown to the seller)..."
        onConfirm={reject}
        onClose={() => setRejectOpen(false)}
      />
    </div>
  )
}

// ── Verification documents panel ────────────────────────────

const DOC_LABELS: Record<PropertyDocument['docType'], string> = {
  FMB_SKETCH:      'FMB Sketch',
  EC:              'Encumbrance Certificate',
  PATTA:           'Patta / Chitta',
  APPROVAL_LETTER: 'Approval Letter',
  OTHER:           'Other Document',
}

function VerificationDocs({
  propertyId, documents,
}: {
  propertyId: string; documents: PropertyDocument[]
}) {
  const [opening, setOpening] = useState<string | null>(null)

  async function view(doc: PropertyDocument) {
    setOpening(doc.id)
    try {
      const res = await adminApi.getDocumentDownloadUrl(propertyId, doc.id)
      // Open the signed URL in a new tab so the admin keeps their review context.
      window.open(res.data.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Could not generate download link')
    } finally {
      setOpening(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <ShieldCheck size={15} className="text-brand-600" />
          Verification Documents
        </h2>
        <span className="text-xs text-slate-400">{documents.length} uploaded</span>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-slate-400 italic">
          The owner has not uploaded any verification documents yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {documents.map((doc) => {
            const ext = (doc.url.split('.').pop() || '').toLowerCase()
            const isPdf = ext === 'pdf'
            return (
              <li key={doc.id} className="flex items-center gap-3 py-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                  ${isPdf ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}>
                  <FileText size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{DOC_LABELS[doc.docType]}</p>
                  <p className="text-xs text-slate-400">
                    {doc.label ?? `.${ext || 'file'}`}
                  </p>
                </div>
                <button
                  onClick={() => view(doc)}
                  disabled={opening === doc.id}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                    bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100
                    disabled:opacity-60 transition-colors">
                  {opening === doc.id ? 'Opening…' : <>View <ExternalLink size={12} /></>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
