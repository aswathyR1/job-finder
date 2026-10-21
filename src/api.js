// Job search via the JSearch API on RapidAPI (aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter, ...).
// The free "Basic" plan has a hard monthly limit, so it never charges you.

const HOST = "jsearch.p.rapidapi.com";
const KEY_STORAGE = "jobfinder.rapidapiKey";
const CACHE_PREFIX = "jobfinder.cache.";

// Optional site-wide key, injected at build time (GitHub secret VITE_RAPIDAPI_KEY) so visitors can
// search without their own key. It stops being used after VITE_SHARED_KEY_UNTIL (YYYY-MM-DD, inclusive).
const SHARED_KEY = import.meta.env.VITE_RAPIDAPI_KEY || "";
const SHARED_KEY_UNTIL = import.meta.env.VITE_SHARED_KEY_UNTIL || "";

export function sharedKeyInfo() {
  if (!SHARED_KEY) return { active: false, until: null };
  const until = SHARED_KEY_UNTIL ? new Date(`${SHARED_KEY_UNTIL}T23:59:59`) : null;
  const active = !until || Date.now() <= until.getTime();
  return { active, until };
}

/** The visitor's own key, saved in this browser. */
export function getApiKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

/** The key searches should use: the visitor's own, else the site's shared key while it's active. */
export function effectiveKey(personalKey) {
  if (personalKey) return { key: personalKey, shared: false };
  if (sharedKeyInfo().active) return { key: SHARED_KEY, shared: true };
  return { key: "", shared: false };
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

// JSearch v5 serves search at /search-v2; older versions used /search.
const SEARCH_PATHS = ["/search-v2", "/search"];

const ADD_OWN_KEY = "Add your own free key in Settings (⚙️) to keep searching.";

/**
 * @param {{query: string, location: string, country: string, datePosted: string,
 *          remote: boolean, employmentTypes: string[], page: number}} params
 * @param {{key: string, shared: boolean}} auth  from effectiveKey()
 */
export async function searchJobs(params, { key: apiKey, shared }) {
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
    throw new SearchError(
      shared
        ? `This site's shared searches aren't available right now. ${ADD_OWN_KEY}`
        : "Your RapidAPI key was rejected. Make sure you subscribed to JSearch (free Basic plan) and pasted the right key in Settings."
    );
  }
  if (res.status === 429) {
    throw new SearchError(
      shared
        ? `This site's free searches for the month have been used up. ${ADD_OWN_KEY}`
        : "You've hit the free plan's limit. Wait a little, or until next month's quota resets."
    );
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
