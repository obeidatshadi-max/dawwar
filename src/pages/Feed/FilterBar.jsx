const RADIUS_OPTIONS = [
  { label: 'المدينة كلها', value: null },
  { label: '٢ كم', value: 2 },
  { label: '٥ كم', value: 5 },
  { label: '١٠ كم', value: 10 },
]

export default function FilterBar({ filter, onFilter, sortBy, onSort, radiusKm, onRadius }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 bg-brand-card rounded-xl p-1">
        {[['all', 'الكل'], ['offer', 'عروض'], ['wanted', 'مطلوب']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => onFilter(val)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === val
                ? 'bg-brand-primary text-white'
                : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSort(sortBy === 'newest' ? 'nearest' : 'newest')}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-brand-border text-brand-muted text-xs"
        >
          {sortBy === 'newest' ? 'الأحدث' : 'الأقرب'}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>

        <select
          value={radiusKm ?? ''}
          onChange={(e) => onRadius(e.target.value === '' ? null : Number(e.target.value))}
          className="flex-1 bg-brand-card border border-brand-border rounded-xl text-brand-muted text-xs px-3 py-2 text-right appearance-none"
        >
          {RADIUS_OPTIONS.map((o) => (
            <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
