'use client'
import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { propertyApi, searchApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Select from '@/components/ui/Select'
import type { City, Locality, ListingType, PropertyType } from '@/types'
import { Upload, X } from 'lucide-react'
import LocationPicker from '@/components/map/LocationPicker'

const TENANT_OPTIONS: { value: 'FAMILY' | 'BACHELOR_MEN' | 'BACHELOR_WOMEN' | 'ANYONE'; label: string }[] = [
  { value: 'FAMILY',         label: 'Family' },
  { value: 'BACHELOR_MEN',   label: 'Bachelors (Men)' },
  { value: 'BACHELOR_WOMEN', label: 'Bachelors (Women)' },
  { value: 'ANYONE',         label: 'Anyone' },
]

// Presentational label/error wrapper — declared at module scope so it keeps a stable
// identity across renders (a component defined inside render resets its subtree each pass).
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const schema = z.object({
  title:            z.string().min(1, 'Title is required'),
  description:      z.string().optional(),
  listedBy:         z.enum(['OWNER','PROMOTER','AGENT'], { required_error: 'Tell us who is listing' }),
  listingType:      z.enum(['SALE','RENT','PG']),
  propertyType:     z.enum(['APARTMENT','INDEPENDENT_HOUSE','VILLA','PLOT','COMMERCIAL_OFFICE','COMMERCIAL_SHOP','BUILDER_FLOOR','PG_HOSTEL','AGRICULTURAL_LAND','WAREHOUSE'], { required_error: 'Choose a property type', invalid_type_error: 'Choose a property type' }),
  localityId:       z.string().uuid('Please select a locality'),
  price:            z.number({ invalid_type_error: 'Enter a valid price' }).positive('Price must be greater than 0'),
  priceUnit:        z.enum(['TOTAL','PER_MONTH','PER_SQFT']).optional(),
  priceNegotiable:  z.boolean().optional(),
  bedrooms:         z.number().int().min(0).max(20).optional(),
  bathrooms:        z.number().int().min(0).max(20).optional(),
  areaSqft:         z.number().positive('Area must be greater than 0'),
  furnishing:       z.enum(['UNFURNISHED','SEMI_FURNISHED','FULLY_FURNISHED']).optional(),
  parkingAvailable: z.boolean().optional(),
  preferredTenant:  z.enum(['FAMILY','BACHELOR_MEN','BACHELOR_WOMEN','ANYONE']).optional(),
  addressLine:      z.string().min(1, 'Full address is required'),
  latitude:         z.number().optional(),
  longitude:        z.number().optional(),
})
type FormData = z.infer<typeof schema>

const STEPS = ['Basic info', 'Location', 'Details', 'Photos']

// ── Step-0 cascade (mirrors the mobile post wizard) ─────────────────────────
type Category = 'RESIDENTIAL' | 'COMMERCIAL' | 'PLOT' | 'AGRI'

const ROLES: { value: 'OWNER' | 'PROMOTER' | 'AGENT'; label: string; sub: string }[] = [
  { value: 'OWNER',    label: 'Owner',    sub: 'Posting my own property' },
  { value: 'PROMOTER', label: 'Promoter', sub: 'Builder / developer' },
  { value: 'AGENT',    label: 'Agent',    sub: 'Listing for an owner' },
]

const CATEGORIES: { value: Category; label: string; allowed: (l: ListingType) => boolean }[] = [
  { value: 'RESIDENTIAL', label: 'Residential',       allowed: () => true },
  { value: 'COMMERCIAL',  label: 'Commercial',        allowed: l => l !== 'PG' },
  { value: 'PLOT',        label: 'Plot / Land',       allowed: l => l === 'SALE' },
  { value: 'AGRI',        label: 'Agricultural Land', allowed: l => l === 'SALE' },
]

// Property sub-types revealed once a category is picked. Single-option categories
// (plot/agri/PG) resolve to exactly one type, which we auto-select.
function propertyTypesFor(category: Category, listingType: ListingType): { value: PropertyType; label: string }[] {
  if (category === 'RESIDENTIAL') {
    if (listingType === 'PG') return [{ value: 'PG_HOSTEL', label: 'PG / Hostel' }]
    return [
      { value: 'APARTMENT',         label: 'Apartment' },
      { value: 'INDEPENDENT_HOUSE', label: 'Independent house' },
      { value: 'VILLA',             label: 'Villa' },
      { value: 'BUILDER_FLOOR',     label: 'Builder floor' },
    ]
  }
  if (category === 'COMMERCIAL') return [
    { value: 'COMMERCIAL_OFFICE', label: 'Office' },
    { value: 'COMMERCIAL_SHOP',   label: 'Shop / Showroom' },
  ]
  if (category === 'PLOT') return [{ value: 'PLOT', label: 'Plot / Land' }]
  return [{ value: 'AGRICULTURAL_LAND', label: 'Agricultural land' }]
}

export default function PostPropertyPage() {
  const router  = useRouter()
  const { isLoggedIn, _hasHydrated } = useAuthStore()
  const [step,       setStep]       = useState(0)
  const [cities,     setCities]     = useState<City[]>([])
  const [localities, setLocalities] = useState<Locality[]>([])
  const [cityId,     setCityId]     = useState('')
  const [images,        setImages]        = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [category,      setCategory]      = useState<Category | null>(null)

  // Builds object URLs for the selected files and revokes them on cleanup — this is an
  // imperative browser-resource side effect, so it must live in an effect (not derived state).
  useEffect(() => {
    const urls = images.map(f => URL.createObjectURL(f))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImagePreviews(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [images])
  const [, setCreatedId]  = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)

  const { register, handleSubmit, control, setValue, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { listingType: 'SALE', priceUnit: 'TOTAL', furnishing: 'UNFURNISHED', parkingAvailable: false, priceNegotiable: false },
  })
  const listingType  = useWatch({ control, name: 'listingType' })
  const listedBy     = useWatch({ control, name: 'listedBy' })
  const propertyType = useWatch({ control, name: 'propertyType' })
  const latitude     = useWatch({ control, name: 'latitude' })
  const longitude    = useWatch({ control, name: 'longitude' })
  const preferredTenant = useWatch({ control, name: 'preferredTenant' })

  // Picking a category resolves the sub-type. Single-option categories auto-select
  // their only type so the user never sees a one-button "choice".
  function chooseCategory(c: Category) {
    setCategory(c)
    const opts = propertyTypesFor(c, listingType)
    setValue('propertyType', opts.length === 1 ? opts[0].value : (undefined as unknown as PropertyType))
  }

  // Changing the listing type can invalidate the current category (e.g. PG has no
  // commercial/plot) — reset the downstream cascade so we never submit a stale pair.
  function chooseListingType(t: ListingType) {
    setValue('listingType', t)
    setCategory(null)
    setValue('propertyType', undefined as unknown as PropertyType)
  }

  useEffect(() => { if (_hasHydrated && !isLoggedIn) router.push('/auth/login') }, [_hasHydrated, isLoggedIn, router])
  useEffect(() => { searchApi.cities().then(r => setCities(r.data)) }, [])
  useEffect(() => {
    if (cityId) searchApi.localities(cityId).then(r => setLocalities(r.data))
  }, [cityId])

  async function onSubmit(data: FormData) {
    // Photos are mandatory — a listing without a single photo is low-trust.
    if (images.length === 0) {
      toast.error('Add at least one photo of the property')
      setStep(3)
      return
    }
    setLoading(true)
    try {
      const res = await propertyApi.create(data)
      const id  = res.data.id
      setCreatedId(id)

      // Upload images if any
      for (let i = 0; i < images.length; i++) {
        await propertyApi.uploadImage(id, images[i], i === 0)
      }

      toast.success('Property listed! It will go live after admin review.')
      router.push('/dashboard')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; fieldErrors?: Record<string, string> } } })?.response?.data
      const msg = data?.message || (data?.fieldErrors ? Object.values(data.fieldErrors)[0] : null)
      toast.error(msg || 'Failed to post property. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleImageDrop(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const files = Array.from(e.target.files).slice(0, 20 - images.length)
    setImages(prev => [...prev, ...files])
  }

  const inputCls = "w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50"

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Post your property</h1>
      <p className="text-sm text-slate-500 mb-8">Fill in the details below. Your listing goes live after a quick review.</p>

      {/* Step progress */}
      <div className="flex items-start mb-10">
        {STEPS.map((s, i) => (
          <Fragment key={s}>
            <button type="button" onClick={() => { if (i <= step) setStep(i) }}
              className="flex flex-col items-center group">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                ${i < step ? 'bg-green-500 text-white group-hover:bg-green-600 cursor-pointer' : i === step ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 cursor-default'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1.5 whitespace-nowrap ${i === step ? 'text-brand-600 font-medium' : i < step ? 'text-green-600 group-hover:underline' : 'text-slate-400'}`}>{s}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mt-4 mx-2 ${i < step ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </Fragment>
        ))}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, () => toast.error('Please complete all required fields'))}
        onKeyDown={e => { if (e.key === 'Enter' && step < STEPS.length - 1) e.preventDefault() }}
      >
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">

          {/* STEP 0: Basic info — role → listing type → category → sub-type cascade */}
          {step === 0 && (
            <>
              <Field label="You are" error={errors.listedBy?.message}>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button key={r.value} type="button" onClick={() => setValue('listedBy', r.value)}
                      className={`flex flex-col items-center text-center px-2 py-3 rounded-xl border transition-colors
                        ${listedBy === r.value ? 'bg-brand-50 border-brand-600' : 'border-slate-200 hover:border-brand-300'}`}>
                      <span className={`text-sm font-semibold ${listedBy === r.value ? 'text-brand-700' : 'text-slate-700'}`}>{r.label}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{r.sub}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="You are looking to" error={errors.listingType?.message}>
                <div className="flex gap-2">
                  {(['SALE','RENT','PG'] as const).map(t => (
                    <button key={t} type="button" onClick={() => chooseListingType(t)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors
                        ${listingType === t ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                      {t === 'SALE' ? 'Sell' : t === 'RENT' ? 'Rent' : 'PG'}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="What kind of property?">
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.filter(c => c.allowed(listingType)).map(c => (
                    <button key={c.value} type="button" onClick={() => chooseCategory(c.value)}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition-colors
                        ${category === c.value ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Sub-type only appears once a category is chosen */}
              {category && (
                <Field label="Select property type" error={errors.propertyType?.message}>
                  <div className="grid grid-cols-2 gap-2">
                    {propertyTypesFor(category, listingType).map(pt => (
                      <button key={pt.value} type="button" onClick={() => setValue('propertyType', pt.value)}
                        className={`py-2.5 rounded-xl border text-sm font-medium transition-colors
                          ${propertyType === pt.value ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              <Field label="Property title" error={errors.title?.message}>
                <input {...register('title')} placeholder="e.g. 3 BHK apartment in RS Puram with parking" className={inputCls} />
              </Field>

              <Field label="Description (optional)">
                <textarea {...register('description')} rows={4} placeholder="Describe the property, nearby landmarks, special features..." className={inputCls + ' resize-none'} />
              </Field>
            </>
          )}

          {/* STEP 1: Location */}
          {step === 1 && (
            <>
              <Field label="City">
                <Select value={cityId} onChange={v => { setCityId(v); setValue('localityId', '') }}
                  options={cities.map(c => ({ value: c.id, label: c.name }))} placeholder="Select city" aria-label="City" />
              </Field>

              <Field label="Locality / Area" error={errors.localityId?.message}>
                <Controller name="localityId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onChange={field.onChange} disabled={!cityId}
                    options={localities.map(l => ({ value: l.id, label: l.name }))} placeholder="Select locality" aria-label="Locality" />
                )} />
              </Field>

              <Field label="Full address" error={errors.addressLine?.message}>
                <textarea {...register('addressLine')} rows={2} placeholder="Flat no, street name, landmark..." className={inputCls + ' resize-none'} />
              </Field>

              <Field label="Pin location on map (optional)">
                <LocationPicker
                  lat={latitude ?? null}
                  lng={longitude ?? null}
                  onChange={(lat, lng, address) => {
                    setValue('latitude', lat)
                    setValue('longitude', lng)
                    // Autocomplete selections carry a clean formatted address — use it.
                    // Map taps/drags pass no address, so they never clobber what's typed.
                    if (address) setValue('addressLine', address, { shouldValidate: true })
                  }}
                />
              </Field>
            </>
          )}

          {/* STEP 2: Property details */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Price (₹)" error={errors.price?.message}>
                  <input type="number" {...register('price', { valueAsNumber: true })} placeholder="e.g. 5000000" className={inputCls} />
                </Field>
                <Field label="Price unit">
                  <Controller name="priceUnit" control={control} render={({ field }) => (
                    <Select required value={field.value ?? 'TOTAL'} onChange={field.onChange} aria-label="Price unit"
                      options={[
                        { value: 'TOTAL', label: 'Total price' },
                        { value: 'PER_MONTH', label: 'Per month' },
                        { value: 'PER_SQFT', label: 'Per sqft' },
                      ]} />
                  )} />
                </Field>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('priceNegotiable')} className="accent-brand-600 w-4 h-4 rounded" />
                <span className="text-sm text-slate-600">Price is negotiable</span>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Bedrooms">
                  <Controller name="bedrooms" control={control} defaultValue={0} render={({ field }) => (
                    <Select required value={String(field.value ?? 0)} onChange={v => field.onChange(Number(v))} aria-label="Bedrooms"
                      options={[0,1,2,3,4,5,6,7,8].map(n => ({ value: String(n), label: String(n) }))} />
                  )} />
                </Field>
                <Field label="Bathrooms">
                  <Controller name="bathrooms" control={control} defaultValue={1} render={({ field }) => (
                    <Select required value={String(field.value ?? 1)} onChange={v => field.onChange(Number(v))} aria-label="Bathrooms"
                      options={[1,2,3,4,5].map(n => ({ value: String(n), label: String(n) }))} />
                  )} />
                </Field>
              </div>

              <Field label="Area (sqft)" error={errors.areaSqft?.message}>
                <input type="number" {...register('areaSqft', { valueAsNumber: true })} placeholder="e.g. 1200" className={inputCls} />
              </Field>

              <Field label="Furnishing">
                <Controller name="furnishing" control={control} render={({ field }) => (
                  <Select required value={field.value ?? 'UNFURNISHED'} onChange={field.onChange} aria-label="Furnishing"
                    options={[
                      { value: 'UNFURNISHED', label: 'Unfurnished' },
                      { value: 'SEMI_FURNISHED', label: 'Semi-furnished' },
                      { value: 'FULLY_FURNISHED', label: 'Fully furnished' },
                    ]} />
                )} />
              </Field>

              {/* Preferred tenant — only relevant when renting / PG */}
              {(listingType === 'RENT' || listingType === 'PG') && (
                <Field label="Preferred tenant">
                  <div className="grid grid-cols-2 gap-2">
                    {TENANT_OPTIONS.map(t => (
                      <button key={t.value} type="button" onClick={() => setValue('preferredTenant', t.value)}
                        className={`py-2.5 rounded-xl border text-sm font-medium transition-colors
                          ${preferredTenant === t.value ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('parkingAvailable')} className="accent-brand-600 w-4 h-4 rounded" />
                <span className="text-sm text-slate-600">Parking available</span>
              </label>
            </>
          )}

          {/* STEP 3: Photos */}
          {step === 3 && (
            <div>
              <p className="text-sm text-slate-500 mb-4">At least one photo is required. Upload up to 20 — the first is the cover image.</p>
              {images.length === 0 && (
                <p className="text-xs text-accent-600 mb-3">Listings need at least one photo to go live.</p>
              )}
              <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-brand-300 transition-colors">
                <Upload size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Click to upload or drag photos here</p>
                <p className="text-xs text-slate-400 mt-1">JPEG, PNG or WebP — max 10MB each</p>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageDrop} />
              </label>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  {imagePreviews.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded">Cover</span>
                      )}
                      <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow">
                        <X size={12} className="text-slate-600" />
                      </button>
                    </div>
                  ))}

                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1)}
              className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={async () => {
              if (step === 0 && !category) { toast.error('Pick what kind of property this is'); return }
              const stepFields: Record<number, (keyof FormData)[]> = {
                0: ['listedBy', 'title', 'listingType', 'propertyType'],
                1: ['localityId', 'addressLine'],
                2: ['price', 'areaSqft'],
              }
              const valid = await trigger(stepFields[step] ?? [])
              if (valid) setStep(s => s + 1)
            }}
              className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-800 transition-colors">
              Continue →
            </button>
          ) : (
            <button type="button" disabled={loading}
              onClick={() => handleSubmit(onSubmit, () => toast.error('Please complete all required fields'))()}
              className="flex-1 bg-accent-400 hover:bg-accent-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
              {loading ? 'Submitting...' : 'Submit listing'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
