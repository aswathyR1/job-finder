import { useEffect, useRef, useState } from "react";
import { CompanyLogo, PublisherBadge, typeLabel, timeAgo } from "./shared.jsx";

export default function JobDetail({ job, onClose }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
    ref.current?.scrollTo({ top: 0 });
  }, [job?.id]);

  useEffect(() => {
    if (!job) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [job, onClose]);

  if (!job) {
    return (
      <aside className="detail detail-empty">
        <div>
          <div className="empty-icon" aria-hidden="true">👈</div>
          <p>Select a job to see the details and apply.</p>
        </div>
      </aside>
    );
  }

  const highlights = Object.entries(job.highlights || {}).filter(([, items]) => items?.length);
  const longDescription = job.description.length > 1200;
  const otherOptions = job.applyOptions.filter((o) => o.link !== job.applyLink).slice(0, 5);

  return (
    <aside className="detail open" ref={ref} aria-label={`${job.title} details`}>
      <button className="detail-back" onClick={onClose}>← Back to results</button>

      <div className="detail-head">
        <CompanyLogo job={job} size={56} />
        <div>
          <h2>{job.title}</h2>
          <p className="job-company">
            {job.website ? <a href={job.website} target="_blank" rel="noopener noreferrer">{job.company}</a> : job.company}
          </p>
        </div>
      </div>

      <div className="detail-facts">
        {job.location && <Fact icon="📍" text={job.location} />}
        {job.type && <Fact icon="💼" text={typeLabel(job.type)} />}
        {job.remote && <Fact icon="🏠" text="Remote" />}
        {job.salary && <Fact icon="💰" text={job.salary} />}
        {job.postedAt && <Fact icon="🕒" text={`Posted ${timeAgo(job.postedAt)}`} />}
      </div>

      <div className="apply-row">
        {job.applyLink ? (
          <a className="btn btn-primary btn-lg" href={job.applyLink} target="_blank" rel="noopener noreferrer">
            Apply now ↗
          </a>
        ) : (
          <span className="muted">No apply link was provided for this listing.</span>
        )}
        <PublisherBadge publisher={job.publisher} />
      </div>

      {otherOptions.length > 0 && (
        <div className="apply-options">
          <span className="filter-label">Also listed on</span>
          {otherOptions.map((o) => (
            <a key={o.link} className="chip" href={o.link} target="_blank" rel="noopener noreferrer">
              {o.publisher} ↗
            </a>
          ))}
        </div>
      )}

      {highlights.map(([title, items]) => (
        <section className="detail-section" key={title}>
          <h3>{title}</h3>
          <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </section>
      ))}

      <section className="detail-section">
        <h3>About the job</h3>
        <div className={`description ${longDescription && !expanded ? "clamped" : ""}`}>{job.description}</div>
        {longDescription && (
          <button className="link-btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show less" : "Show full description"}
          </button>
        )}
      </section>
    </aside>
  );
}

function Fact({ icon, text }) {
  return (
    <span className="fact">
      <span aria-hidden="true">{icon}</span> {text}
    </span>
  );
}
