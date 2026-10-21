import { useState } from "react";

export function CompanyLogo({ job, size = 48 }) {
  const [failed, setFailed] = useState(false);
  if (job.logo && !failed) {
    return (
      <img
        className="logo"
        src={job.logo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="logo logo-fallback" style={{ width: size, height: size, background: colorFor(job.company) }} aria-hidden="true">
      {job.company.trim()[0]?.toUpperCase() || "?"}
    </div>
  );
}

const PUBLISHER_CLASS = { linkedin: "pub-linkedin", indeed: "pub-indeed", glassdoor: "pub-glassdoor", ziprecruiter: "pub-zip" };

export function PublisherBadge({ publisher }) {
  if (!publisher) return null;
  const cls = PUBLISHER_CLASS[publisher.toLowerCase().replace(/\s+/g, "")] || "";
  return <span className={`publisher ${cls}`}>via {publisher}</span>;
}

export function typeLabel(type) {
  return { FULLTIME: "Full-time", PARTTIME: "Part-time", CONTRACTOR: "Contract", INTERN: "Internship" }[type] || type;
}

export function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (Number.isNaN(diff)) return "";
  if (diff < 3600) return "just now";
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const LOGO_COLORS = ["#4f6bed", "#0e9384", "#c4320a", "#7a5af8", "#b54708", "#dd2590", "#1570ef", "#3b7c0f"];

function colorFor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return LOGO_COLORS[h % LOGO_COLORS.length];
}
