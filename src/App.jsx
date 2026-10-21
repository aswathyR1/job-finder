import { useEffect, useMemo, useState } from "react";
import { getApiKey, searchJobs, SearchError, setApiKey, titleMatches } from "./api.js";
import { DEMO_JOBS } from "./demoData.js";
import SearchForm from "./components/SearchForm.jsx";
import Filters from "./components/Filters.jsx";
import JobCard from "./components/JobCard.jsx";
import JobDetail from "./components/JobDetail.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";

const MAX_PAGES_PER_CLICK = 3;

const DEFAULT_FILTERS = {
  datePosted: "week",
  employmentTypes: [],
  remote: false,
  exactTitle: true,
  sort: "relevance",
};

export default function App() {
  const [apiKey, setKey] = useState(getApiKey);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState(null); // { query, location, country }
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | loadingMore | done | error
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Server-side filters trigger a new search; title match and sort are applied locally.
  const serverFilters = `${filters.datePosted}|${filters.employmentTypes.join(",")}|${filters.remote}`;

  async function run(nextSearch, nextPage, useDemo = demo) {
    setStatus(nextPage === 1 ? "loading" : "loadingMore");
    setError("");
    try {
      const fetchPage = async (p) => {
        if (!useDemo) return searchJobs({ ...nextSearch, ...filters, page: p }, apiKey);
        await new Promise((r) => setTimeout(r, 400));
        return p === 1 ? DEMO_JOBS.filter((j) => matchesDemoFilters(j, filters)) : [];
      };
      const visible = (j) => !filters.exactTitle || titleMatches(j, nextSearch.query);

      // Later pages can repeat jobs we already have, or only add jobs hidden by "Title must match".
      // Keep going (up to 3 pages per click) until something new shows up.
      const known = new Set(nextPage === 1 ? [] : jobs.map((j) => j.id));
      const added = [];
      let p = nextPage;
      let more = false;
      for (; p < nextPage + MAX_PAGES_PER_CLICK; p++) {
        const results = await fetchPage(p);
        const fresh = dedupe(results).filter((j) => !known.has(j.id));
        fresh.forEach((j) => known.add(j.id));
        added.push(...fresh);
        more = fresh.length > 0 && results.length >= 10;
        if (!more || fresh.some(visible) || nextPage === 1) break;
      }

      setJobs((prev) => (nextPage === 1 ? added : [...prev, ...added]));
      setPage(Math.min(p, nextPage + MAX_PAGES_PER_CLICK - 1));
      setHasMore(more);
      setStatus("done");
      if (nextPage === 1) setSelectedId(null);
    } catch (e) {
      setError(e instanceof SearchError ? e.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  function handleSearch(values) {
    if (!apiKey && !demo) {
      setShowSettings(true);
      return;
    }
    setSearch(values);
    run(values, 1);
  }

  function startDemo(values) {
    setDemo(true);
    setShowSettings(false);
    const s = values || search || { query: "Data Analyst", location: "Austin, TX", country: "us" };
    setSearch(s);
    run(s, 1, true);
  }

  // Re-run the current search when server-side filters change.
  useEffect(() => {
    if (search) run(search, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverFilters]);

  const visibleJobs = useMemo(() => {
    let list = jobs;
    if (filters.exactTitle && search?.query) list = list.filter((j) => titleMatches(j, search.query));
    if (filters.sort === "newest") {
      list = [...list].sort((a, b) => (b.postedAt || "").localeCompare(a.postedAt || ""));
    }
    return list;
  }, [jobs, filters.exactTitle, filters.sort, search]);

  const hiddenCount = jobs.length - visibleJobs.length;
  const selected = visibleJobs.find((j) => j.id === selectedId) || null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">◆</span>
          <span>JobFinder</span>
        </div>
        <div className="topbar-actions">
          {!apiKey && (
            <button className="btn btn-primary key-btn" onClick={() => setShowSettings(true)}>
              🔑 Add API key
            </button>
          )}
          <ThemeToggle />
          <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings" title="Settings">
            <GearIcon />
          </button>
        </div>
      </header>

      <section className={`hero ${search ? "compact" : ""}`}>
        {!search && (
          <>
            <h1>Find your next job</h1>
            <p className="hero-sub">Search listings from LinkedIn, Indeed, Glassdoor and more, all in one place.</p>
          </>
        )}
        <SearchForm onSearch={handleSearch} initial={search} busy={status === "loading"} />
        {search && <Filters filters={filters} onChange={setFilters} />}
        {!apiKey && !demo && !search && (
          <p className="hero-hint">
            First time here? <button className="link-btn" onClick={() => setShowSettings(true)}>Add your free API key</button>
            {" "}or <button className="link-btn" onClick={() => startDemo()}>try the demo</button>.
          </p>
        )}
      </section>

      {demo && (
        <div className="banner">
          You're viewing <strong>demo data</strong>.{" "}
          <button className="link-btn" onClick={() => setShowSettings(true)}>Add an API key</button> to search real jobs.
        </div>
      )}

      {search && (
        <main className={`results-layout ${selected ? "has-selection" : ""}`}>
          <section className="results-list" aria-live="polite">
            <ResultsHeader
              status={status}
              count={visibleJobs.length}
              hidden={hiddenCount}
              search={search}
              onShowAll={() => setFilters((f) => ({ ...f, exactTitle: false }))}
            />

            {status === "loading" && <SkeletonList />}
            {status === "error" && <div className="error-box">{error}</div>}
            {status !== "loading" && status !== "error" && visibleJobs.length === 0 && (
              <EmptyState hidden={hiddenCount} onShowAll={() => setFilters((f) => ({ ...f, exactTitle: false }))} />
            )}

            {status !== "loading" &&
              visibleJobs.map((job) => (
                <JobCard key={job.id} job={job} active={job.id === selectedId} onSelect={() => setSelectedId(job.id)} />
              ))}

            {hasMore && status !== "loading" && status !== "error" && (
              <button className="btn btn-secondary load-more" onClick={() => run(search, page + 1)} disabled={status === "loadingMore"}>
                {status === "loadingMore" ? "Loading…" : "Load more jobs"}
              </button>
            )}
          </section>

          <JobDetail job={selected} onClose={() => setSelectedId(null)} />
        </main>
      )}

      <footer className="footer">
        Job data from the JSearch API. Applying takes you to the original posting.
      </footer>

      {showSettings && (
        <SettingsModal
          apiKey={apiKey}
          onSave={(k) => {
            setApiKey(k);
            setKey(k);
            setShowSettings(false);
            if (k) {
              setDemo(false);
              if (search) run(search, 1, false);
            }
          }}
          onDemo={() => startDemo()}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function ResultsHeader({ status, count, hidden, search, onShowAll }) {
  if (status === "loading") return <p className="results-meta">Searching for “{search.query}”…</p>;
  if (status !== "done") return null;
  return (
    <p className="results-meta">
      <strong>{count}</strong> {count === 1 ? "job" : "jobs"} for “{search.query}”
      {search.location ? ` in ${search.location}` : ""}
      {hidden > 0 && (
        <>
          {" · "}
          <button className="link-btn" onClick={onShowAll}>
            show {hidden} more with related titles
          </button>
        </>
      )}
    </p>
  );
}

function EmptyState({ hidden, onShowAll }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">🔍</div>
      <h3>No matching jobs</h3>
      {hidden > 0 ? (
        <p>
          {hidden} jobs have related titles.{" "}
          <button className="link-btn" onClick={onShowAll}>Show them</button>
        </p>
      ) : (
        <p>Try a broader title, a nearby city, or a longer “Posted” window.</p>
      )}
    </div>
  );
}

function SkeletonList() {
  return Array.from({ length: 5 }, (_, i) => (
    <div className="job-card skeleton" key={i} aria-hidden="true">
      <div className="sk sk-logo" />
      <div className="sk-lines">
        <div className="sk sk-line w60" />
        <div className="sk sk-line w40" />
        <div className="sk sk-line w30" />
      </div>
    </div>
  ));
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function dedupe(list) {
  const seen = new Set();
  return list.filter((j) => (seen.has(j.id) ? false : seen.add(j.id)));
}

function matchesDemoFilters(job, f) {
  if (f.remote && !job.remote) return false;
  if (f.employmentTypes.length && !f.employmentTypes.includes(job.type)) return false;
  return true;
}
