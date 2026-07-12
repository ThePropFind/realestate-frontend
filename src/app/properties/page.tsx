'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { X, SlidersHorizontal } from 'lucide-react'
import { propertyApi } from '@/lib/api'
import PropertyCard from '@/components/property/PropertyCard'
import SearchBar from '@/components/search/SearchBar'
import { buttonClasses } from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import type { PropertyCard as PropertyCardType, ListingType, PropertyType, FurnishingStatus, Page } from '@/types'

const PROPERTY_TYPES: { label: string; value: PropertyType }[] = [
  { label: 'Apartment',         value: 'APARTMENT'         },
  { label: 'Independent house', value: 'INDEPENDENT_HOUSE' },
  { label: 'Villa',             value: 'VILLA'             },
  { label: 'Plot',              value: 'PLOT'              },
  { label: 'Agricultural land', value: 'AGRICULTURAL_LAND' },
  { label: 'Builder floor',     value: 'BUILDER_FLOOR'     },
  { label: 'Commercial office', value: 'COMMERCIAL_OFFICE' },
  { label: 'Commercial shop',   value: 'COMMERCIAL_SHOP'   },
]

const LISTING_TYPES: { label: string; value: ListingType }[] = [
  { label: 'Buy',           value: 'SALE' },
  { label: 'Rent',          value: 'RENT' },
  { label: 'PG / Co-living', value: 'PG'  },
]

const FURNISHINGS: { label: string; value: FurnishingStatus }[] = [
  { label: 'Unfurnished',    value: 'UNFURNISHED'     },
  { label: 'Semi-furnished', value: 'SEMI_FURNISHED'  },
  { label: 'Fully furnished', value: 'FULLY_FURNISHED' },
]

const LISTING_TYPE_LABEL: Record<ListingType, string> = { SALE: 'Buy', RENT: 'Rent', PG: 'PG / Co-living' }
const LISTING_NOUN: Record<ListingType, string> = { SALE: 'sale', RENT: 'rental', PG: 'PG' }

// ── Filter panel extracted to a stable component outside the page ──────────
// Defining components inside a parent causes unmount/remount on every render.
interface FilterPanelProps {
  selectedListingTypes: ListingType[]
  selectedBhk: number[]
  selectedTypes: PropertyType[]
  selectedFurnishings: FurnishingStatus[]
  minPrice: string
  maxPrice: string
  onListingType: (t: ListingType) => void
  onBhk: (b: number) => void
  onPropertyType: (t: PropertyType) => void
  onFurnishing: (f: FurnishingStatus) => void
  onMinPrice: (v: string) => void
  onMaxPrice: (v: string) => void
  onApply: () => void
  onClear: () => void
}

function FilterPanel({
  selectedListingTypes, selectedBhk, selectedTypes, selectedFurnishings, minPrice, maxPrice,
  onListingType, onBhk, onPropertyType, onFurnishing, onMinPrice, onMaxPrice,
  onApply, onClear,
}: FilterPanelProps) {
  return (
    <div className="space-y-5">
      {/* Listing type — multi-select */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Listing type</p>
        {LISTING_TYPES.map(t => (
          <label key={t.value} className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input type="checkbox" checked={selectedListingTypes.includes(t.value)}
              onChange={() => onListingType(t.value)} className="accent-brand-600 w-4 h-4 rounded" />
            <span className="text-sm text-slate-600">{t.label}</span>
          </label>
        ))}
      </div>

      {/* BHK */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">BHK type</p>
        <div className="flex flex-wrap gap-2">
          {[1,2,3,4].map(b => (
            <button key={b} onClick={() => onBhk(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${selectedBhk.includes(b) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'}`}>
              {b === 4 ? '4+ BHK' : `${b} BHK`}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Budget</p>
        <div className="space-y-2">
          <input type="number" min="0" value={minPrice} onChange={e => onMinPrice(e.target.value)} placeholder="Min ₹"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none text-slate-700 placeholder-slate-400 transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-50" />
          <input type="number" min="0" value={maxPrice} onChange={e => onMaxPrice(e.target.value)} placeholder="Max ₹"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none text-slate-700 placeholder-slate-400 transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-50" />
        </div>
      </div>

      {/* Property type — multi-select */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Property type</p>
        {PROPERTY_TYPES.map(pt => (
          <label key={pt.value} className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input type="checkbox" checked={selectedTypes.includes(pt.value)}
              onChange={() => onPropertyType(pt.value)} className="accent-brand-600 w-4 h-4 rounded" />
            <span className="text-sm text-slate-600">{pt.label}</span>
          </label>
        ))}
      </div>

      {/* Furnishing — multi-select */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Furnishing</p>
        {FURNISHINGS.map(f => (
          <label key={f.value} className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input type="checkbox" checked={selectedFurnishings.includes(f.value)}
              onChange={() => onFurnishing(f.value)} className="accent-brand-600 w-4 h-4 rounded" />
            <span className="text-sm text-slate-600">{f.label}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onApply} className={buttonClasses('primary', 'md', 'flex-1')}>
          Apply filters
        </button>
        <button onClick={onClear} className={buttonClasses('secondary', 'md')}>
          Clear
        </button>
      </div>
    </div>
  )
}

// ── Main page content — separated so Suspense can wrap useSearchParams() ──
function PropertiesContent() {
  const searchParams = useSearchParams()

  const initialListing = (searchParams.get('listingType') as ListingType) || 'SALE'
  const [selectedListingTypes, setSelectedListingTypes] = useState<ListingType[]>([initialListing])
  const [selectedTypes,       setSelectedTypes]       = useState<PropertyType[]>([])
  const [selectedBhk,         setSelectedBhk]         = useState<number[]>([])
  const [selectedFurnishings, setSelectedFurnishings] = useState<FurnishingStatus[]>([])
  const [minPrice,      setMinPrice]      = useState(searchParams.get('minPrice') || '')
  const [maxPrice,      setMaxPrice]      = useState(searchParams.get('maxPrice') || '')
  const [citySlug,      setCitySlug]      = useState(searchParams.get('citySlug') || '')
  const [keyword,       setKeyword]       = useState(searchParams.get('keyword') || '')
  const [featuredOnly,  setFeaturedOnly]  = useState(searchParams.get('featuredOnly') === 'true')
  const [sort,          setSort]          = useState('createdAt,desc')
  const [page,          setPage]          = useState(0)
  const [results,       setResults]       = useState<Page<PropertyCardType> | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  // The result-count noun + the mobile tabs use a single "primary" listing type:
  // it's the sole selected one, or SALE when none/multiple are selected.
  const primaryListing: ListingType = selectedListingTypes.length === 1 ? selectedListingTypes[0] : 'SALE'

  // Sync filter state when the URL search params change (e.g. Navbar Buy/Rent/PG links
  // while already on this page). Done during render via the "store previous value" pattern
  // rather than in an effect — React applies it before paint with no extra commit.
  const paramsKey = searchParams.toString()
  const [prevParamsKey, setPrevParamsKey] = useState(paramsKey)
  if (paramsKey !== prevParamsKey) {
    setPrevParamsKey(paramsKey)
    setSelectedListingTypes([(searchParams.get('listingType') as ListingType) || 'SALE'])
    setCitySlug(searchParams.get('citySlug') || '')
    setKeyword(searchParams.get('keyword') || '')
    setFeaturedOnly(searchParams.get('featuredOnly') === 'true')
    setPage(0)
  }

  const fetchResults = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { sort, page, size: 12 }
      if (selectedListingTypes.length) params.listingTypes = selectedListingTypes
      if (selectedTypes.length)        params.propertyTypes = selectedTypes
      if (selectedFurnishings.length)  params.furnishings   = selectedFurnishings
      if (citySlug)           params.citySlug    = citySlug
      if (keyword)            params.keyword     = keyword
      if (featuredOnly)       params.featuredOnly = true
      if (minPrice)           params.minPrice    = minPrice
      if (maxPrice)           params.maxPrice    = maxPrice
      if (selectedBhk.length) {
        params.minBedrooms = Math.min(...selectedBhk)
        // Only cap with maxBedrooms when "4+ BHK" is NOT selected (4 means "4 or more")
        if (!selectedBhk.includes(4)) params.maxBedrooms = Math.max(...selectedBhk)
      }
      const { data } = await propertyApi.search(params as never)
      setResults(data)
    } catch {
      // Search errors are non-fatal; the empty state UI handles it
    } finally {
      setLoading(false)
    }
  }, [sort, page, selectedListingTypes, selectedTypes, selectedFurnishings, citySlug, keyword, minPrice, maxPrice, selectedBhk, featuredOnly])

  // Data-fetch effect: synchronizes results with the current filters by querying the server.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchResults() }, [fetchResults])

  function toggle<T>(arr: T[], v: T): T[] { return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }

  const activeFilters = [
    ...(citySlug ? [{ label: citySlug, clear: () => { setCitySlug(''); setPage(0) } }] : []),
    ...(keyword  ? [{ label: keyword,  clear: () => { setKeyword('');  setPage(0) } }] : []),
    ...selectedFurnishings.map(f => ({ label: f.replace(/_/g,' ').toLowerCase(), clear: () => { setSelectedFurnishings(p => p.filter(v => v !== f)); setPage(0) } })),
    ...selectedTypes.map(t => ({ label: t.replace(/_/g,' ').toLowerCase(), clear: () => { setSelectedTypes(p => p.filter(v => v !== t)); setPage(0) } })),
    ...selectedBhk.map(b => ({ label: `${b} BHK`, clear: () => { setSelectedBhk(p => p.filter(v => v !== b)); setPage(0) } })),
  ]

  function handleListingTypeTab(t: ListingType) { setSelectedListingTypes([t]); setPage(0) }
  function handleListingTypeToggle(t: ListingType) { setSelectedListingTypes(p => toggle(p, t)); setPage(0) }
  function handleBhk(b: number) { setSelectedBhk(p => toggle(p, b)); setPage(0) }
  function handleClear() { setSelectedBhk([]); setSelectedTypes([]); setSelectedFurnishings([]); setMinPrice(''); setMaxPrice(''); setPage(0) }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top search bar — sticky below the main navbar (h-16 = 4rem) */}
      <div className="bg-white border-b border-slate-100 sticky top-16 z-40 overflow-x-hidden">
        {/* Listing type tabs — mobile only (quick single-select) */}
        <div className="md:hidden flex border-b border-slate-100">
          {(['SALE', 'RENT', 'PG'] as ListingType[]).map(t => (
            <button key={t} onClick={() => handleListingTypeTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors
                ${selectedListingTypes.length === 1 && selectedListingTypes[0] === t ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-400'}`}>
              {LISTING_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="px-4 py-3 flex gap-2 items-center">
          <div className="flex-1 min-w-0"><SearchBar compact currentListingType={primaryListing} /></div>
          {/* Mobile filter button */}
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 bg-white shrink-0 hover:border-brand-400 transition-colors">
            <SlidersHorizontal size={15} />
            Filters
          </button>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filterDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFilterDrawerOpen(false)} />
          <div className="relative bg-white rounded-t-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <span className="font-semibold text-slate-800">Filters</span>
              <button onClick={() => setFilterDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <FilterPanel
                selectedListingTypes={selectedListingTypes}
                selectedBhk={selectedBhk}
                selectedTypes={selectedTypes}
                selectedFurnishings={selectedFurnishings}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onListingType={handleListingTypeToggle}
                onBhk={handleBhk}
                onPropertyType={t => { setSelectedTypes(p => toggle(p, t)); setPage(0) }}
                onFurnishing={f => { setSelectedFurnishings(p => toggle(p, f)); setPage(0) }}
                onMinPrice={setMinPrice}
                onMaxPrice={setMaxPrice}
                onApply={() => { fetchResults(); setFilterDrawerOpen(false) }}
                onClear={() => { handleClear(); setFilterDrawerOpen(false) }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Result count + chips + sort */}
        <div className="px-4 pt-3 pb-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-500">
              {results
                ? `${results.totalElements.toLocaleString()} ${selectedListingTypes.length === 1 ? LISTING_NOUN[primaryListing] + ' ' : ''}${results.totalElements === 1 ? 'property' : 'properties'}`
                : 'Searching...'}
            </span>
            <div className="shrink-0 w-36">
              <Select value={sort} onChange={v => { setSort(v); setPage(0) }} size="sm" required aria-label="Sort properties"
                options={[
                  { value: 'createdAt,desc', label: 'Newest first' },
                  { value: 'price,asc',      label: 'Price ↑' },
                  { value: 'price,desc',     label: 'Price ↓' },
                  { value: 'viewsCount,desc', label: 'Popular' },
                ]} />
            </div>
          </div>
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeFilters.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-brand-50 text-brand-800 border border-brand-200 rounded-full px-3 py-0.5 text-xs font-medium">
                  {f.label}<button onClick={f.clear}><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex">
          {/* Sidebar */}
          <aside className="hidden md:block w-56 shrink-0 bg-white border-r border-slate-100 p-4 min-h-screen">
            <FilterPanel
              selectedListingTypes={selectedListingTypes}
              selectedBhk={selectedBhk}
              selectedTypes={selectedTypes}
              selectedFurnishings={selectedFurnishings}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onListingType={handleListingTypeToggle}
              onBhk={handleBhk}
              onPropertyType={t => { setSelectedTypes(p => toggle(p, t)); setPage(0) }}
              onFurnishing={f => { setSelectedFurnishings(p => toggle(p, f)); setPage(0) }}
              onMinPrice={setMinPrice}
              onMaxPrice={setMaxPrice}
              onApply={fetchResults}
              onClear={handleClear}
            />
          </aside>

          {/* Grid */}
          <main className="flex-1 p-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-soft h-64 animate-pulse" />
                ))}
              </div>
            ) : results?.content.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-slate-500 text-lg mb-2">No properties found</p>
                <p className="text-slate-400 text-sm">Try adjusting your filters or switching to Buy / Rent / PG</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {results?.content.map(p => <PropertyCard key={p.id} property={p} />)}
              </div>
            )}

            {/* Pagination */}
            {results && results.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button disabled={results.first} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                  ← Prev
                </button>
                {(() => {
                  const windowSize = 7
                  const half = Math.floor(windowSize / 2)
                  const start = Math.max(0, Math.min(page - half, results.totalPages - windowSize))
                  const end   = Math.min(results.totalPages, start + windowSize)
                  return Array.from({ length: end - start }, (_, i) => start + i).map(i => (
                    <button key={i} onClick={() => setPage(i)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === i ? 'bg-brand-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {i + 1}
                    </button>
                  ))
                })()}
                <button disabled={results.last} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                  Next →
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

// ── Exported page — wraps content in Suspense required by useSearchParams() ─
export default function PropertiesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
          <div className="h-12 bg-white rounded-2xl border border-slate-100 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-soft h-64" />
            ))}
          </div>
        </div>
      </div>
    }>
      <PropertiesContent />
    </Suspense>
  )
}
