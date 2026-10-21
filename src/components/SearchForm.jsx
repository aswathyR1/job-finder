import { useEffect, useState } from "react";

export const COUNTRIES = [
  ["us", "United States"],
  ["ca", "Canada"],
  ["gb", "United Kingdom"],
  ["in", "India"],
  ["au", "Australia"],
  ["de", "Germany"],
  ["fr", "France"],
  ["nl", "Netherlands"],
  ["ie", "Ireland"],
  ["sg", "Singapore"],
  ["ae", "United Arab Emirates"],
  ["nz", "New Zealand"],
];

export default function SearchForm({ onSearch, initial, busy }) {
  const [query, setQuery] = useState(initial?.query || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [country, setCountry] = useState(initial?.country || "us");

  // Reflect searches started elsewhere (e.g. the demo) in the inputs.
  useEffect(() => {
    if (!initial) return;
    setQuery(initial.query);
    setLocation(initial.location);
    setCountry(initial.country);
  }, [initial]);

  function submit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch({ query: query.trim(), location: location.trim(), country });
  }

  return (
    <form className="search-form" onSubmit={submit} role="search">
      <label className="field">
        <SearchIcon />
        <span className="sr-only">Job title</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Job title, e.g. Data Analyst"
          required
          autoFocus={!initial}
        />
      </label>
      <label className="field">
        <PinIcon />
        <span className="sr-only">Location</span>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or state" />
      </label>
      <label className="field field-country">
        <span className="sr-only">Country</span>
        <select value={country} onChange={(e) => setCountry(e.target.value)}>
          {COUNTRIES.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </label>
      <button className="btn btn-primary search-btn" type="submit" disabled={busy}>
        {busy ? "Searching…" : "Search"}
      </button>
    </form>
  );
}

function SearchIcon() {
  return (
    <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
