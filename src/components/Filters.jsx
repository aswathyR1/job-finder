const DATE_OPTIONS = [
  ["today", "Today"],
  ["3days", "3 days"],
  ["week", "Week"],
  ["month", "Month"],
  ["all", "Any time"],
];

const TYPE_OPTIONS = [
  ["FULLTIME", "Full-time"],
  ["PARTTIME", "Part-time"],
  ["CONTRACTOR", "Contract"],
  ["INTERN", "Internship"],
];

export default function Filters({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const toggleType = (t) =>
    set({
      employmentTypes: filters.employmentTypes.includes(t)
        ? filters.employmentTypes.filter((x) => x !== t)
        : [...filters.employmentTypes, t],
    });

  return (
    <div className="filters">
      <div className="filter-group" role="radiogroup" aria-label="Date posted">
        <span className="filter-label">Posted</span>
        {DATE_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            role="radio"
            aria-checked={filters.datePosted === value}
            className={`chip ${filters.datePosted === value ? "on" : ""}`}
            onClick={() => set({ datePosted: value })}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-group" aria-label="Job type">
        <span className="filter-label">Type</span>
        {TYPE_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            aria-pressed={filters.employmentTypes.includes(value)}
            className={`chip ${filters.employmentTypes.includes(value) ? "on" : ""}`}
            onClick={() => toggleType(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-group">
        <Toggle checked={filters.remote} onChange={(v) => set({ remote: v })} label="Remote only" />
        <Toggle checked={filters.exactTitle} onChange={(v) => set({ exactTitle: v })} label="Title must match" />
        <label className="sort">
          <span className="filter-label">Sort</span>
          <select value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
            <option value="relevance">Most relevant</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
      {label}
    </label>
  );
}
