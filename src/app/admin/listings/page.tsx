'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import { formatPrice, timeAgo } from '@/lib/utils'
import type { PropertyCard } from '@/types'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { CheckCircle, XCircle, Star, StarOff, Eye, Search } from 'lucide-react'

const STATUS_TABS = ['PENDING_REVIEW','ACTIVE','REJECTED','EXPIRED','ALL'] as const
type StatusTab = typeof STATUS_TABS[number]

const STATUS_LABEL: Record<StatusTab, string> = {
  PENDING_REVIEW: 'Pending', ACTIVE: 'Active', REJECTED: 'Rejected', EXPIRED: 'Expired', ALL: 'All',
}
const STATUS_BADGE: Record<string, string> = {
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE:         'bg-green-50 text-green-700 border-green-200',
  REJECTED:       'bg-red-50   text-red-700   border-red-200',
  EXPIRED:        'bg-slate-50  text-slate-500  border-slate-200',
  DRAFT:          'bg-slate-50  text-slate-500  border-slate-200',
  SOLD_RENTED:    'bg-brand-50 text-brand-700 border-brand-200',
}

export default function AdminListingsPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>('PENDING_REVIEW')
  const [listings,  setListings]  = useState<(PropertyCard & { status: string; isFeatured: boolean })[]>([])
  const [loading,   setLoading]   = useState(false)
  const [page,      setPage]      = useState(0)
  const [total,     setTotal]     = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [search,    setSearch]    = useState('')
  // Debounced copy of `search` — the server query searches ALL pages (title,
  // locality, city); filtering the fetched page client-side missed everything
  // beyond the current page.
  const [query,     setQuery]     = useState('')

  // Debounce keystrokes → query, and jump back to page 0 for the new result set.
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const status = activeTab === 'ALL' ? undefined : activeTab
      const res    = await adminApi.getAllListings(status, page, query || undefined)
      setListings(res.data.content)
      setTotal(res.data.totalElements)
      setTotalPages(res.data.totalPages)
    } catch { toast.error('Failed to load listings') }
    finally   { setLoading(false) }
  }, [activeTab, page, query])

  // Data-fetch effect: loads listings from the server when the tab/page changes. The
  // synchronous setLoading inside load() is the intended loading indicator, not the
  // derived-state antipattern this rule targets.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  async function approve(id: string) {
    try   { await adminApi.approve(id); toast.success('Approved'); load() }
    catch { toast.error('Failed to approve') }
  }

  const [rejecting, setRejecting] = useState<{ id: string; title: string } | null>(null)

  async function reject(reason?: string) {
    if (!rejecting || !reason) return
    try   { await adminApi.reject(rejecting.id, reason); toast.success('Rejected'); load() }
    catch { toast.error('Failed to reject') }
    finally { setRejecting(null) }
  }

  async function toggleFeatured(id: string, current: boolean) {
    try   { await adminApi.toggleFeatured(id); toast.success(current ? 'Removed from featured' : 'Marked as featured'); load() }
    catch { toast.error('Failed to update') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Listings</h1>
          <p className="text-sm text-slate-400">{total.toLocaleString()} total</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or city..."
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-brand-400 bg-white w-full" />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setPage(0) }}
            className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {STATUS_LABEL[tab]}
          </button>
        ))}
      </div>

      {/* Listings table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading...</div>
        ) : listings.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No listings found.</div>
        ) : (
          <>
            {/* Desktop table — hidden below md */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[2fr_1fr_1fr_120px] gap-4 px-5 py-3 border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wide">
                <span>Property</span><span>Price</span><span>Status</span><span>Actions</span>
              </div>
              <div className="divide-y divide-slate-50">
                {listings.map(p => (
                  <div key={p.id} className="grid grid-cols-[2fr_1fr_1fr_120px] gap-4 px-5 py-4 items-center hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.primaryImageUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={p.primaryImageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                          : <span className="text-slate-200 text-lg">⌂</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                        <p className="text-xs text-slate-400">{p.localityName}, {p.cityName} · {timeAgo(p.createdAt)}</p>
                        {p.isFeatured && <span className="text-xs text-amber-600 font-medium">★ Featured</span>}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-brand-600">{formatPrice(p.price, p.priceUnit)}</span>
                    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border w-fit ${STATUS_BADGE[p.status] || STATUS_BADGE.DRAFT}`}>
                      {p.status.replace('_',' ')}
                    </span>
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/listings/${p.id}`}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="View">
                        <Eye size={14} />
                      </Link>
                      {p.status === 'PENDING_REVIEW' && (
                        <>
                          <button onClick={() => approve(p.id)}
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => setRejecting({ id: p.id, title: p.title })}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      <button onClick={() => toggleFeatured(p.id, p.isFeatured)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Toggle featured">
                        {p.isFeatured ? <StarOff size={14} /> : <Star size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile card view — hidden on md+ */}
            <div className="md:hidden divide-y divide-slate-50">
              {listings.map(p => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.primaryImageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.primaryImageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                        : <span className="text-slate-200 text-lg">⌂</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 leading-snug">{p.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.localityName}, {p.cityName} · {timeAgo(p.createdAt)}</p>
                    </div>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${STATUS_BADGE[p.status] || STATUS_BADGE.DRAFT}`}>
                      {p.status.replace('_',' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-brand-600">{formatPrice(p.price, p.priceUnit)}</span>
                      {p.isFeatured && <span className="text-xs text-amber-600 font-medium">★ Featured</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/listings/${p.id}`}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="View">
                        <Eye size={14} />
                      </Link>
                      {p.status === 'PENDING_REVIEW' && (
                        <>
                          <button onClick={() => approve(p.id)}
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => setRejecting({ id: p.id, title: p.title })}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      <button onClick={() => toggleFeatured(p.id, p.isFeatured)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Toggle featured">
                        {p.isFeatured ? <StarOff size={14} /> : <Star size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">Showing {listings.length} of {total}</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40">← Prev</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40">Next →</button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={rejecting !== null}
        tone="danger"
        title="Reject this listing?"
        message={rejecting ? `"${rejecting.title}" will be rejected. The reason below is shown to the seller.` : undefined}
        confirmLabel="Reject listing"
        withReason reasonRequired
        reasonPlaceholder="Rejection reason (required, shown to the seller)..."
        onConfirm={reject}
        onClose={() => setRejecting(null)}
      />
    </div>
  )
}
