# Frontend — Next.js App

## Tech stack
- Next.js 16 (App Router — NOT pages router)
- TypeScript strict mode
- Tailwind CSS (custom brand colours in tailwind.config.ts)
- Zustand with persist (auth state → localStorage key: 'propfind-auth')
- React Hook Form + Zod (all form validation)
- Axios with interceptors (JWT attach + auto-refresh on 401)

## Exact file structure (as of current codebase)
```
src/
├── app/
│   ├── layout.tsx                          # Root layout — uses ConditionalShell
│   ├── globals.css
│   ├── page.tsx                            # Homepage (Server Component)
│   ├── not-found.tsx                       # 404 page
│   ├── properties/
│   │   ├── page.tsx                        # Search results (Client Component)
│   │   └── [id]/page.tsx                   # Property detail (Server Component)
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx        # Sends OTP to email
│   │   └── reset-password/page.tsx         # Accepts email + OTP + new password
│   ├── post-property/
│   │   ├── page.tsx                        # Create listing (4-step form)
│   │   └── edit/[id]/page.tsx              # Edit existing listing
│   ├── dashboard/page.tsx                  # User's own listings (Client)
│   ├── saved/page.tsx                       # Saved/favorited listings (Client) — favoritesApi.listMine
│   └── admin/
│       ├── layout.tsx                      # Dark sidebar — hides Navbar/Footer
│       ├── page.tsx                        # Overview KPIs
│       ├── listings/page.tsx               # Approve/reject/feature
│       ├── users/page.tsx                  # Ban/reinstate users
│       └── analytics/page.tsx             # Charts and metrics
├── components/
│   ├── layout/
│   │   ├── ConditionalShell.tsx            # Hides Navbar+Footer on /admin/* routes
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── property/
│   │   ├── PropertyCard.tsx                 # grid card — HeartButton + listing/featured badges
│   │   ├── FeaturedHeroCard.tsx             # home hero showcase — photo fills card, detail panel overlaid
│   │   ├── PropertyCarousel.tsx             # dependency-free scroll-snap + arrow carousel (home "Browse")
│   │   ├── HeartButton.tsx                  # save/unsave toggle (favoritesApi, auth-guarded, optimistic)
│   │   └── InquiryForm.tsx
│   └── search/
│       └── SearchBar.tsx
├── lib/
│   ├── api.ts                              # ALL API calls — authApi, propertyApi,
│   │                                         searchApi, favoritesApi, bookingsApi, adminApi
│   └── utils.ts                            # formatPrice, bedroomLabel, timeAgo,
│                                             LISTING_TYPE_LABELS, listingTypeBadgeClass
├── store/
│   └── authStore.ts                        # Zustand — user, tokens, _hasHydrated
└── types/
    └── index.ts                            # All TypeScript types — mirrors backend DTOs
```

## Important architecture notes
- ConditionalShell wraps all pages — hides Navbar/Footer on /admin/* automatically
- Admin layout.tsx provides the dark sidebar shell for all /admin/* pages
- Axios baseURL: browser → '/api' (proxied by Next.js), server → full URL
- authStore has _hasHydrated flag — check before showing auth-dependent UI
- Inquiry endpoint: POST /properties/{id}/inquiries (not /inquiries)
- Reset password: requires email + otp + newPassword (three fields)
- `LoginRequest` uses `identifier` (not `email`) — accepts email or 10-digit Indian mobile number
- `RegisterRequest` has no `role` field — backend defaults all new users to BUYER
- `next.config.js` reads `NEXT_PUBLIC_MINIO_HOST` / `NEXT_PUBLIC_MINIO_PROTOCOL` / `NEXT_PUBLIC_MINIO_PORT` to whitelist the prod image CDN hostname for `next/image`
- **Font:** Plus Jakarta Sans via `next/font/google` in `layout.tsx` (`--font-jakarta` → Tailwind `fontFamily.sans`). Use `font-*` utilities normally; do not re-import Inter.
- **Navbar/Footer are navy (`bg-brand-900`) site-wide** via `ConditionalShell` (admin routes keep their own shell). The navbar bell is decorative (no notifications backend yet).
- **Favorites:** backend `/favorites` endpoints already exist; the web wires them through `favoritesApi` (`save`/`unsave`/`check`/`listMine`) → `HeartButton` (on cards + featured hero) and the `/saved` page. Heart requires login (redirects to `/auth/login` otherwise).
- **Google Maps** (`@vis.gl/react-google-maps`) lives in `src/components/map/` — `LocationPicker.tsx` (post/edit forms: Places Autocomplete + draggable pin → sets `latitude`/`longitude`/`addressLine`) and `PropertyLocationMap.tsx` (detail page: read-only). Reads `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; both render a graceful fallback (no crash) when the key is unset. Multi-select search params (`listingTypes`/`propertyTypes`/`furnishings`) are sent as repeated query keys via `paramsSerializer: { indexes: null }` in `propertyApi.search` — Spring binds them to `List<Enum>`.

## Auth guard pattern (use in every protected page)
```tsx
const { isLoggedIn, user } = useAuthStore()
useEffect(() => {
  if (!isLoggedIn) router.push('/auth/login')
}, [isLoggedIn, router])
if (!isLoggedIn) return null
```

## Brand colours — use these ONLY, never invent new ones
"Green Growth" palette (matches mobile `src/theme/colors.ts`); full ramps in `tailwind.config.ts`:
```
brand-50:  #e6ece1 (sage tint)   brand-200: #a3b18a (Sage)   brand-600: #184a45 (Forest Green)   brand-800: #0f332f
accent-400: #c6a15b (Brass Gold)  accent-600: #a67f3e
slate-50 is overridden to Warm Ivory #F7F3ED (page background)
```

## API rules
- NEVER write inline axios calls in components
- NEVER hardcode http://localhost:8080 anywhere — use api.ts functions
- NEVER use TypeScript `any` — use types from src/types/index.ts
- ALL new endpoints go into api.ts first, then use in components
- For multipart/form-data (image upload), api.ts handles the Content-Type header

## Form rules
- ALL forms use React Hook Form with a Zod schema
- Show loading state (disabled button + text change) during submission
- Show toast on success AND error
- Reset form after successful submission

## Validation command
```bash
npx tsc --noEmit
```
Must show zero TypeScript errors. Fix all before saying done.
