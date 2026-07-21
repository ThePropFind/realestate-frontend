'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Calendar, CalendarX, CheckCircle2, AlertCircle, Clock, BellOff, type LucideIcon } from 'lucide-react'
import { bookingsApi, propertyApi } from '@/lib/api'
import { timeAgo } from '@/lib/utils'

// ponytail: no notifications backend yet — derives a feed client-side from the
// user's bookings + listing statuses, ported from mobile's NotificationsSheet.
// Replace with a real /notifications endpoint (+ unread tracking) when push lands.
interface Notice {
  id: string
  Icon: LucideIcon
  title: string
  body: string
  at: string   // ISO — sort + time label
  href: string
}

export default function NotificationsBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    let mounted = true
    ;(async () => {
      setLoading(true)
      const notices: Notice[] = []
      const [bookings, listings] = await Promise.allSettled([
        bookingsApi.listMine(0, 20),
        propertyApi.myListings(0, 20),
      ])
      if (bookings.status === 'fulfilled') {
        for (const b of bookings.value.data.content) {
          if (b.status === 'CONFIRMED') notices.push({
            id: `b-${b.id}`, Icon: Calendar, at: b.updatedAt, href: `/properties/${b.propertyId}`,
            title: 'Site visit confirmed',
            body: `${b.propertyTitle} — ${[b.preferredDate, b.preferredWindow].filter(Boolean).join(' · ') || 'owner will coordinate the slot'}`,
          })
          if (b.status === 'CANCELLED' && b.cancelledBy === 'OWNER') notices.push({
            id: `b-${b.id}`, Icon: CalendarX, at: b.updatedAt, href: `/properties/${b.propertyId}`,
            title: 'Site visit cancelled by owner', body: b.propertyTitle,
          })
        }
      }
      if (listings.status === 'fulfilled') {
        for (const p of listings.value.data.content) {
          if (p.status === 'ACTIVE') notices.push({
            id: `l-${p.id}`, Icon: CheckCircle2, at: p.createdAt, href: `/properties/${p.id}`,
            title: 'Your listing is live', body: p.title,
          })
          if (p.status === 'REJECTED') notices.push({
            id: `l-${p.id}`, Icon: AlertCircle, at: p.createdAt, href: `/properties/${p.id}`,
            title: 'Listing needs changes', body: `${p.title} — open it to see the review notes`,
          })
          if (p.status === 'PENDING_REVIEW') notices.push({
            id: `l-${p.id}`, Icon: Clock, at: p.createdAt, href: `/properties/${p.id}`,
            title: 'Listing under review', body: p.title,
          })
        }
      }
      notices.sort((a, b) => b.at.localeCompare(a.at))
      if (mounted) { setItems(notices.slice(0, 12)); setLoading(false) }
    })()
    return () => { mounted = false }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-label="Notifications" onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 flex items-center justify-center rounded-full border border-white/25 text-white/90 hover:bg-white/10 transition-colors">
        <Bell size={18} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-100 rounded-xl shadow-card z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-800">Notifications</div>
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 flex flex-col items-center text-center gap-2">
              <BellOff size={24} className="text-brand-600" />
              <p className="text-sm font-medium text-slate-700">You&apos;re all caught up</p>
              <p className="text-xs text-slate-400">Updates on your site visits and listings show up here.</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button onClick={() => { setOpen(false); router.push(n.href) }}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0">
                    <n.Icon size={17} className="text-brand-600 mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">{n.title}</span>
                      <span className="block text-xs text-slate-500 truncate">{n.body}</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">{timeAgo(n.at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
