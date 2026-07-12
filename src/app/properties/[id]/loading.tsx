// Route-level skeleton — Next shows this instantly on navigation while the
// server component fetches the property, instead of a blank frozen page.
export default function PropertyDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column: gallery + title + details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-80 md:h-96 bg-slate-200 rounded-2xl" />
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-slate-200 rounded-full" />
              <div className="h-6 w-24 bg-slate-200 rounded-full" />
            </div>
            <div className="h-7 w-3/4 bg-slate-200 rounded" />
            <div className="h-4 w-1/3 bg-slate-200 rounded" />
            <div className="h-8 w-40 bg-slate-200 rounded" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div className="h-5 w-44 bg-slate-100 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: contact / inquiry card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div className="h-5 w-32 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-11 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
