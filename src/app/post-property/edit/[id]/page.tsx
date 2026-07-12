'use client'
import { useState, useEffect, Fragment } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { propertyApi, searchApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Select from '@/components/ui/Select'
import type { City, Locality, PropertyDetail, PropertyImage } from '@/types'
import { Upload, X, AlertCircle } from 'lucide-react'
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
  listingType:      z.enum(['SALE','RENT','PG']),
  propertyType:     z.enum(['APARTMENT','INDEPENDENT_HOUSE','VILLA','PLOT','COMMERCIAL_OFFICE','COMMERCIAL_SHOP','BUILDER_FLOOR','PG_HOSTEL','AGRICULTURAL_LAND']),
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

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE:         { label: 'Active',       cls: 'bg-green-50 text-green-700 border-green-200' },
  PENDING_REVIEW: { label: 'Under review', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  REJECTED:       { label: 'Rejected',     cls: 'bg-red-50 text-red-700 border-red-200' },
  DRAFT:          { label: 'Draft',        cls: 'bg-slate-50 text-slate-500 border-slate-200' },
}

export default function EditPropertyPage() {
  const router            = useRouter()
  const { id }            = useParams<{ id: string }>()
  const { isLoggedIn, _hasHydrated } = useAuthStore()

  const [step,           setStep]           = useState(0)
  const [cities,         setCities]         = useState<City[]>([])
  const [localities,     setLocalities]     = useState<Locality[]>([])
  const [cityId,         setCityId]         = useState('')
  const [property,       setProperty]       = useState<PropertyDetail | null>(null)
  const [existingImages, setExistingImages] = useState<PropertyImage[]>([])
  const [newImages,         setNewImages]         = useState<File[]>([])
  const [newImagePreviews,  setNewImagePreviews]  = useState<string[]>([])

  // Builds object URLs for the newly selected files and revokes them on cleanup — this is an
  // imperative browser-resource side effect, so it must live in an effect (not derived state).
  useEffect(() => {
    const urls = newImages.map(f => URL.createObjectURL(f))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewImagePreviews(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [newImages])
  const [fetching,       setFetching]       = useState(true)
  const [loading,        setLoading]        = useState(false)

  const { register, handleSubmit, control, setValue, trigger, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { listingType: 'SALE', propertyType: 'APARTMENT', priceUnit: 'TOTAL', furnishing: 'UNFURNISHED', parkingAvailable: false, priceNegotiable: false },
  })
  const listingType = useWatch({ control, name: 'listingType' })
  const latitude    = useWatch({ control, name: 'latitude' })
  const longitude   = useWatch({ control, name: 'longitude' })
  const preferredTenant = useWatch({ control, name: 'preferredTenant' })

  useEffect(() => { if (_hasHydrated && !isLoggedIn) router.push('/auth/login') }, [_hasHydrated, isLoggedIn, router])

  // Load cities once
  useEffect(() => { searchApi.cities().then(r => setCities(r.data)) }, [])

  // Load property and pre-fill form
  useEffect(() => {
    if (!_hasHydrated || !id) return
    propertyApi.getMyById(id)
      .then(async r => {
        const p = r.data
        setProperty(p)
        setExistingImages(p.images)

        // Find city by slug
        const citiesRes = await searchApi.cities()
        const city = citiesRes.data.find(c => c.slug === p.citySlug)
        if (city) {
          setCityId(city.id)
          // Load localities for this city, find by slug
          const locRes = await searchApi.localities(city.id)
          setLocalities(locRes.data)
          const loc = locRes.data.find(l => l.slug === p.localitySlug)

          // Pre-fill form with all existing data
          reset({
            title:            p.title,
            description:      p.description ?? '',
            listingType:      p.listingType,
            propertyType:     p.propertyType,
            localityId:       loc?.id ?? '',
            price:            p.price,
            priceUnit:        p.priceUnit,
            priceNegotiable:  p.priceNegotiable,
            bedrooms:         p.bedrooms ?? undefined,
            bathrooms:        p.bathrooms ?? undefined,
            areaSqft:         p.areaSqft,
            furnishing:       p.furnishing ?? 'UNFURNISHED',
            parkingAvailable: p.parkingAvailable,
            preferredTenant:  p.preferredTenant ?? undefined,
            addressLine:      p.addressLine ?? '',
            latitude:         p.latitude ?? undefined,
            longitude:        p.longitude ?? undefined,
          })
        }
      })
      .catch(() => { toast.error('Failed to load property'); router.push('/dashboard') })
      .finally(() => setFetching(false))
  }, [_hasHydrated, id, reset, router])

  // Reload localities when city changes manually
  useEffect(() => {
    if (cityId) searchApi.localities(cityId).then(r => setLocalities(r.data))
  }, [cityId])

  async function onSubmit(data: FormData) {
    // A listing must keep at least one photo.
    if (existingImages.length + newImages.length === 0) {
      toast.error('Add at least one photo of the property')
      setStep(3)
      return
    }
    setLoading(true)
    try {
      await propertyApi.update(id, data)

      // Upload any new images
      for (let i = 0; i < newImages.length; i++) {
        await propertyApi.uploadImage(id, newImages[i], existingImages.length === 0 && i === 0)
      }

      toast.success('Listing updated! Changes will be reviewed shortly.')
      router.push('/dashboard')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; fieldErrors?: Record<string, string> } } })?.response?.data
      const msg = data?.message || (data?.fieldErrors ? Object.values(data.fieldErrors)[0] : null)
      toast.error(msg || 'Failed to update listing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteExistingImage(imageId: string) {
    try {
      await propertyApi.deleteImage(id, imageId)
      setExistingImages(prev => prev.filter(img => img.id !== imageId))
      toast.success('Photo removed')
    } catch {
      toast.error('Could not remove photo')
    }
  }

  function handleNewImageDrop(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const maxNew = 20 - existingImages.length
    const files = Array.from(e.target.files).slice(0, maxNew - newImages.length)
    setNewImages(prev => [...prev, ...files])
  }

  const inputCls  = "w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50"

  if (fetching) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="space-y-4">
          <div className="h-8 bg-slate-100 rounded-xl animate-pulse w-48" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-72" />
          <div className="h-14 bg-slate-100 rounded-2xl animate-pulse mt-8" />
          <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  const statusConf = property ? (STATUS_LABELS[property.status] ?? STATUS_LABELS.DRAFT) : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edit listing</h1>
          {property && <p className="text-sm text-slate-500 mt-1 truncate max-w-sm">{property.title}</p>}
        </div>
        {statusConf && (
          <span className={`text-xs font-medium px-3 py-1 rounded-full border ${statusConf.cls}`}>
            {statusConf.label}
          </span>
        )}
      </div>

      {/* Re-review notice */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-8 text-sm text-amber-800">
        <AlertCircle size={15} className="shrink-0 mt-0.5" />
        <span>Saving changes will re-submit your listing for admin review before it goes live again.</span>
      </div>

      {/* Step progress */}
      <div className="flex items-start mb-10">
        {STEPS.map((s, i) => (
          <Fragment key={s}>
            <button type="button" onClick={() => setStep(i)}
              className="flex flex-col items-center group">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                ${i < step ? 'bg-green-500 text-white group-hover:bg-green-600' : i === step ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1.5 whitespace-nowrap ${i === step ? 'text-brand-600 font-medium' : i < step ? 'text-green-600 group-hover:underline' : 'text-slate-400 group-hover:text-slate-600'}`}>{s}</span>
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

          {/* STEP 0: Basic info */}
          {step === 0 && (
            <>
              <Field label="Listing type" error={errors.listingType?.message}>
                <div className="flex gap-2">
                  {(['SALE','RENT','PG'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setValue('listingType', t)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors
                        ${listingType === t ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                      {t === 'SALE' ? 'Sale' : t === 'RENT' ? 'Rent' : 'PG'}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Property type" error={errors.propertyType?.message}>
                <Controller name="propertyType" control={control} render={({ field }) => (
                  <Select required value={field.value ?? 'APARTMENT'} onChange={field.onChange} aria-label="Property type"
                    options={[
                      { value: 'APARTMENT', label: 'Apartment' },
                      { value: 'INDEPENDENT_HOUSE', label: 'Independent house' },
                      { value: 'VILLA', label: 'Villa' },
                      { value: 'PLOT', label: 'Plot' },
                      { value: 'BUILDER_FLOOR', label: 'Builder floor' },
                      { value: 'COMMERCIAL_OFFICE', label: 'Commercial office' },
                      { value: 'COMMERCIAL_SHOP', label: 'Commercial shop' },
                      { value: 'PG_HOSTEL', label: 'PG / Hostel' },
                    ]} />
                )} />
              </Field>

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
                    if (address) setValue('addressLine', address, { shouldValidate: true })
                  }}
                />
              </Field>
            </>
          )}

          {/* STEP 2: Details */}
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
            <div className="space-y-5">
              <p className="text-sm text-slate-500">Manage photos for your listing. First photo will be the cover image.</p>

              {/* Existing images */}
              {existingImages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Current photos</p>
                  <div className="grid grid-cols-4 gap-2">
                    {existingImages.map((img, i) => (
                      <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                        {(img.isPrimary || i === 0) && (
                          <span className="absolute bottom-1 left-1 bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded">Cover</span>
                        )}
                        <button type="button" onClick={() => handleDeleteExistingImage(img.id)}
                          className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow hover:bg-red-50 transition-colors">
                          <X size={12} className="text-slate-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload new */}
              {existingImages.length + newImages.length < 20 && (
                <div>
                  {existingImages.length > 0 && <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Add more photos</p>}
                  <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-brand-300 transition-colors">
                    <Upload size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Click to upload photos</p>
                    <p className="text-xs text-slate-400 mt-1">JPEG, PNG or WebP — max 10MB each</p>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleNewImageDrop} />
                  </label>
                </div>
              )}

              {/* New image previews */}
              {newImages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">New photos (will be uploaded on save)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {newImagePreviews.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setNewImages(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow">
                          <X size={12} className="text-slate-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {existingImages.length === 0 && newImages.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">No photos yet. Add at least one to improve visibility.</p>
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
              const stepFields: Record<number, (keyof FormData)[]> = {
                0: ['title', 'listingType', 'propertyType'],
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
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
