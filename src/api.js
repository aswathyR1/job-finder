// Job search via the JSearch API on RapidAPI (aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter, ...).
// The free "Basic" plan has a hard monthly limit, so it never charges you.

const HOST = "jsearch.p.rapidapi.com";
const KEY_STORAGE = "jobfinder.rapidapiKey";
const CACHE_PREFIX = "jobfinder.cache.";

export function getApiKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || import.meta.env.VITE_RAPIDAPI_KEY || "";
  } catch {
    return import.meta.env.VITE_RAPIDAPI_KEY || "";
  }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* storage blocked — key lasts for this page only */
  }
}

export class SearchError extends Error {}

/**
 * @param {{query: string, location: string, country: string, datePosted: string,
 *          remote: boolean, employmentTypes: string[], page: number}} params
 */
// JSearch v5 serves search at /search-v2; older versions used /search.
const SEARCH_PATHS = ["/search-v2", "/search"];

export async function searchJobs(params, apiKey) {
  const query = new URLSearchParams();
  query.set("query", params.location ? `${params.query} in ${params.location}` : params.query);
  query.set("page", String(params.page || 1));
  query.set("num_pages", "1");
  query.set("country", params.country || "us");
  query.set("date_posted", params.datePosted || "all");
  if (params.remote) query.set("work_from_home", "true");
  if (params.employmentTypes?.length) query.set("employment_types", params.employmentTypes.join(","));

  // Cache each search for the browser session so repeat searches don't use up the free quota.
  const cacheKey = CACHE_PREFIX + query;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  let res;
  for (const path of SEARCH_PATHS) {
    try {
      res = await fetch(`https://${HOST}${path}?${query}`, {
        headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": HOST },
      });
    } catch {
      throw new SearchError("Couldn't reach the job search service. Check your internet connection.");
    }
    if (res.status !== 404) break;
  }
  if (res.status === 401 || res.status === 403) {
    throw new SearchError("Your RapidAPI key was rejected. Make sure you subscribed to JSearch (free Basic plan) and pasted the right key in Settings.");
  }
  if (res.status === 429) {
    throw new SearchError("You've hit the free plan's limit. Wait a little, or until next month's quota resets.");
  }
  if (!res.ok) {
    const detail = await res.json().then((b) => b.message || b.error, () => "");
    throw new SearchError(`Job search failed (error ${res.status}${detail ? `: ${detail}` : ""}). Try again in a moment.`);
  }

  const body = await res.json();
  // v5 returns { data: { jobs: [...] } }; older versions returned { data: [...] }.
  const list = Array.isArray(body.data) ? body.data : body.data?.jobs || body.jobs || [];
  const jobs = list.map(normalize);
  writeCache(cacheKey, jobs);
  return jobs;
}

function normalize(j) {
  const place = [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ");
  const applyOptions = (j.apply_options || []).filter((o) => o.apply_link);
  return {
    id: j.job_id,
    title: j.job_title || "Untitled role",
    company: j.employer_name || "Unknown company",
    logo: j.employer_logo || null,
    website: j.employer_website || null,
    location: place || (j.job_is_remote ? "Remote" : ""),
    remote: Boolean(j.job_is_remote),
    type: j.job_employment_type || null,
    postedAt: j.job_posted_at_datetime_utc || null,
    publisher: j.job_publisher || null,
    salary: formatSalary(j),
    description: j.job_description || "",
    highlights: j.job_highlights || {},
    applyLink: j.job_apply_link || applyOptions[0]?.apply_link || null,
    applyOptions: applyOptions.map((o) => ({ publisher: o.publisher, link: o.apply_link, direct: o.is_direct })),
  };
}

function formatSalary(j) {
  const { job_min_salary: min, job_max_salary: max, job_salary_currency: cur } = j;
  if (!min && !max) return null;
  const period = { YEAR: "/yr", MONTH: "/mo", WEEK: "/wk", HOUR: "/hr" }[j.job_salary_period] || "";
  const fmt = (n) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: cur || "USD", maximumFractionDigits: 0 }).format(n);
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}${period}`;
  return `${fmt(min || max)}${period}`;
}

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* full or blocked — skip caching */
  }
}

// ---- Matching your job name ----

const STOPWORDS = new Set(["and", "or", "the", "a", "an", "of", "for", "in", "at", "to", "with", "jr", "sr"]);

export function titleWords(query) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

/** True when every meaningful word of the search appears in the job title. */
export function titleMatches(job, query) {
  const title = job.title.toLowerCase();
  return titleWords(query).every((w) => title.includes(w));
}
