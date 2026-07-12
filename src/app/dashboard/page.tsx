'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { propertyApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { formatPrice, LISTING_TYPE_LABELS, timeAgo } from '@/lib/utils'
import type { PropertyCard, Page } from '@/types'
import { PlusCircle, Eye, Trash2, Edit, BadgeCheck, Clock, XCircle } from 'lucide-react'
import IncomingBookings from '@/components/dashboard/IncomingBookings'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { buttonClasses } from '@/components/ui/Button'

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  ACTIVE:         { label: 'Active',        cls: 'bg-green-50 text-green-700 border-green-200',  icon: <BadgeCheck size={12} /> },
  PENDING_REVIEW: { label: 'Under review',  cls: 'bg-amber-50  text-amber-700  border-amber-200', icon: <Clock size={12} /> },
  REJECTED:       { label: 'Rejected',      cls: 'bg-red-50    text-red-700    border-red-200',   icon: <XCircle size={12} /> },
  EXPIRED:        { label: 'Expired',       cls: 'bg-slate-50  text-slate-500  border-slate-200', icon: <Clock size={12} /> },
  DRAFT:          { label: 'Draft',         cls: 'bg-slate-50  text-slate-500  border-slate-200', icon: null },
  SOLD_RENTED:    { label: 'Sold / Rented', cls: 'bg-brand-50  text-brand-800  border-brand-200', icon: <BadgeCheck size={12} /> },
}

export default function DashboardPage() {
  const router = useRouter()
  const { isLoggedIn, user, _hasHydrated } = useAuthStore()
  const [data,    setData]    = useState<Page<PropertyCard> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(0)

  useEffect(() => { if (_hasHydrated && !isLoggedIn) router.push('/auth/login') }, [_hasHydrated, isLoggedIn, router])

  useEffect(() => {
    if (!_hasHydrated) return
    propertyApi.myListings(page, 10)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load listings'))
      .finally(() => setLoading(false))
  }, [page, _hasHydrated])

  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null)

  async function handleDelete() {
    if (!deleting) return
    try {
      await propertyApi.delete(deleting.id)
      toast.success('Listing deleted')
      setData(prev => prev ? { ...prev, content: prev.content.filter(p => p.id !== deleting.id) } : prev)
    } catch { toast.error('Could not delete listing') }
    finally { setDeleting(null) }
  }

  if (!isLoggedIn) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">My listings</h1>
            <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.name.split(' ')[0]}</p>
            <div className="w-8 h-[3px] rounded bg-accent-400 mt-3" />
          </div>
          <Link href="/post-property" className={buttonClasses('primary')}>
            <PlusCircle size={16} /> Post new property
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total listings', value: data?.totalElements ?? '—' },
            { label: 'Active',         value: data?.content.filter(p => p.status === 'ACTIVE').length   != null ? `${data!.content.filter(p => p.status === 'ACTIVE').length}${data!.totalPages > 1 ? '+' : ''}` : '—' },
            { label: 'Under review',   value: data?.content.filter(p => p.status === 'PENDING_REVIEW').length != null ? `${data!.content.filter(p => p.status === 'PENDING_REVIEW').length}${data!.totalPages > 1 ? '+' : ''}` : '—' },
            { label: 'Total views',    value: data?.content.reduce((sum, p) => sum + p.viewsCount, 0).toLocaleString() ?? '—' },
          ].map(stat => (
            <Card key={stat.label} className="p-4">
              <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Listings table */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-700">All listings</h2>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-50">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-16 h-12 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/5 rounded bg-slate-100 animate-pulse" />
                    <div className="h-3 w-1/4 rounded bg-slate-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.content.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400 mb-4">You haven&apos;t posted any listings yet.</p>
              <Link href="/post-property" className={buttonClasses('primary')}>
                <PlusCircle size={15} /> Post your first property
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {data?.content.map(property => {
                const status     = property.status || 'PENDING_REVIEW'
                const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING_REVIEW
                return (
                  <div key={property.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    {/* Thumbnail */}
                    <div className="w-16 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {property.primaryImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={property.primaryImageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{property.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {property.localityName}, {property.cityName} · {LISTING_TYPE_LABELS[property.listingType]} · {formatPrice(property.price, property.priceUnit)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Posted {timeAgo(property.createdAt)}</p>
                    </div>

                    {/* Status */}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${statusConf.cls}`}>
                      {statusConf.icon}{statusConf.label}
                    </span>

                    {/* Views */}
                    <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                      <Eye size={13} />{property.viewsCount}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {status === 'ACTIVE' ? (
                        <Link href={`/properties/${property.id}`}
                          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="View listing">
                          <Eye size={15} />
                        </Link>
                      ) : (
                        <span className="p-2 text-slate-200 cursor-not-allowed" title="Not live yet">
                          <Eye size={15} />
                        </span>
                      )}
                      <Link href={`/post-property/edit/${property.id}`}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                        <Edit size={15} />
                      </Link>
                      <button onClick={() => setDeleting({ id: property.id, title: property.title })}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={15} />
                      </button>
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
        </Card>

        {/* Site visit requests on my listings */}
        <IncomingBookings />
      </div>

      <ConfirmDialog
        open={deleting !== null}
        tone="danger"
        title="Delete this listing?"
        message={deleting ? `"${deleting.title}" will be permanently deleted. This cannot be undone.` : undefined}
        confirmLabel="Delete listing"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
