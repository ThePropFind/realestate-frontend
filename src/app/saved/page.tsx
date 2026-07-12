'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Heart } from 'lucide-react'
import { favoritesApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import PropertyCard from '@/components/property/PropertyCard'
import { buttonClasses } from '@/components/ui/Button'
import type { PropertyCard as PropertyCardType, Page } from '@/types'

export default function SavedPage() {
  const router = useRouter()
  const { isLoggedIn, _hasHydrated } = useAuthStore()
  const [data, setData] = useState<Page<PropertyCardType> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => { if (_hasHydrated && !isLoggedIn) router.push('/auth/login') }, [_hasHydrated, isLoggedIn, router])

  useEffect(() => {
    if (!_hasHydrated || !isLoggedIn) return
    favoritesApi.listMine(page, 12)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load saved properties'))
      .finally(() => setLoading(false))
  }, [page, _hasHydrated, isLoggedIn])

  if (!isLoggedIn) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Saved properties</h1>
          <p className="text-slate-500 text-sm mt-1">Listings you&apos;ve hearted</p>
          <div className="w-8 h-[3px] rounded bg-accent-400 mt-3" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-soft h-64 animate-pulse" />
            ))}
          </div>
        ) : !data || data.content.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-soft">
            <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-5 h-5 text-brand-600" />
            </div>
            <p className="text-slate-500 mb-4">You haven&apos;t saved any properties yet.</p>
            <Link href="/properties" className={buttonClasses('primary')}>Browse properties</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.content.map(p => <PropertyCard key={p.id} property={p} />)}
            </div>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <p className="text-xs text-slate-400">Page {page + 1} of {data.totalPages}</p>
                <div className="flex gap-2">
                  <button disabled={data.first} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50">← Prev</button>
                  <button disabled={data.last} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
