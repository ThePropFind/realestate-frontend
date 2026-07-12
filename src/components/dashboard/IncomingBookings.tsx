'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { bookingsApi } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import type { Page, SiteVisitBooking, BookingStatus } from '@/types'
import { CalendarClock, Phone, Mail, MapPin, XCircle, CheckCircle2, Clock3 } from 'lucide-react'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const STATUS_CONFIG: Record<BookingStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  REQUESTED: { label: 'Requested', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock3 size={12} /> },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle2 size={12} /> },
  COMPLETED: { label: 'Completed', cls: 'bg-brand-50 text-brand-800 border-brand-200', icon: <CheckCircle2 size={12} /> },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-50 text-slate-500 border-slate-200', icon: <XCircle size={12} /> },
}

export default function IncomingBookings() {
  const [data,    setData]    = useState<Page<SiteVisitBooking> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(0)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate data-fetch effect (same convention as admin/listings)
    setLoading(true)
    bookingsApi.listIncoming(page, 10)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load site visit requests'))
      .finally(() => setLoading(false))
  }, [page])

  const [cancelling, setCancelling] = useState<SiteVisitBooking | null>(null)

  async function handleCancel(reason?: string) {
    if (!cancelling) return
    const b = cancelling
    setCancelling(null)
    const prev = data
    // optimistic flip to CANCELLED
    setData(d => d ? { ...d, content: d.content.map(x => x.id === b.id ? { ...x, status: 'CANCELLED', cancelReason: reason ?? null, cancelledBy: 'OWNER' } : x) } : d)
    try {
      await bookingsApi.cancel(b.id, reason)
      toast.success('Booking cancelled')
    } catch {
      setData(prev)
      toast.error('Could not cancel booking')
    }
  }

  return (
    <Card className="overflow-hidden mt-8">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <CalendarClock size={15} className="text-brand-600" />
        <h2 className="text-sm font-medium text-slate-700">Site visit requests</h2>
        {data && data.totalElements > 0 && (
          <span className="text-xs text-slate-400">({data.totalElements})</span>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
      ) : !data || data.content.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          No one has requested a site visit on your listings yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {data.content.map(b => {
            const conf      = STATUS_CONFIG[b.status] || STATUS_CONFIG.REQUESTED
            const cancelled = b.status === 'CANCELLED' || b.status === 'COMPLETED'
            return (
              <div key={b.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {b.propertyImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.propertyImageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/properties/${b.propertyId}`} className="text-sm font-medium text-slate-800 hover:text-brand-600 truncate block">
                    {b.propertyTitle}
                  </Link>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin size={11} />{b.propertyLocality}, {b.propertyCity}
                  </p>

                  {/* Preferred slot */}
                  {(b.preferredDate || b.preferredWindow) && (
                    <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                      <CalendarClock size={12} className="text-slate-400" />
                      {[b.preferredDate, b.preferredWindow].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  {/* Visitor contact */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{b.contactName}</span>
                    {b.contactPhone && (
                      <a href={`tel:${b.contactPhone}`} className="flex items-center gap-1 hover:text-brand-600">
                        <Phone size={11} />{b.contactPhone}
                      </a>
                    )}
                    {b.contactEmail && (
                      <a href={`mailto:${b.contactEmail}`} className="flex items-center gap-1 hover:text-brand-600">
                        <Mail size={11} />{b.contactEmail}
                      </a>
                    )}
                  </div>

                  {b.notes && <p className="text-xs text-slate-500 mt-1.5 italic">&ldquo;{b.notes}&rdquo;</p>}
                  {b.status === 'CANCELLED' && b.cancelReason && (
                    <p className="text-xs text-slate-400 mt-1.5">Cancelled: {b.cancelReason}</p>
                  )}
                  <p className="text-xs text-slate-300 mt-1.5">Requested {timeAgo(b.createdAt)}</p>
                </div>

                {/* Status + action */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${conf.cls}`}>
                    {conf.icon}{conf.label}
                  </span>
                  {!cancelled && (
                    <button onClick={() => setCancelling(b)}
                      className="text-xs text-slate-400 hover:text-red-600 transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">Page {page + 1} of {data.totalPages}</p>
          <div className="flex gap-2">
            <button disabled={data.first} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50">← Prev</button>
            <button disabled={data.last} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50">Next →</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={cancelling !== null}
        tone="danger"
        title="Cancel this site visit?"
        message={cancelling ? `The request from ${cancelling.contactName} will be cancelled.` : undefined}
        confirmLabel="Cancel visit"
        cancelLabel="Keep it"
        withReason
        reasonPlaceholder="Reason for cancelling (optional, shown to the visitor)..."
        onConfirm={handleCancel}
        onClose={() => setCancelling(null)}
      />
    </Card>
  )
}
