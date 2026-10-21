import { CompanyLogo, PublisherBadge, typeLabel, timeAgo } from "./shared.jsx";

export default function JobCard({ job, active, onSelect }) {
  return (
    <article
      className={`job-card ${active ? "active" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
      tabIndex={0}
      aria-current={active ? "true" : undefined}
    >
      <CompanyLogo job={job} />
      <div className="job-card-body">
        <h3 className="job-title">{job.title}</h3>
        <p className="job-company">{job.company}</p>
        <p className="job-meta">
          {job.location && <span>{job.location}</span>}
          {job.remote && job.location !== "Remote" && <span className="tag tag-remote">Remote</span>}
          {job.type && <span className="tag">{typeLabel(job.type)}</span>}
        </p>
        <div className="job-foot">
          {job.salary && <span className="salary">{job.salary}</span>}
          <span className="posted">{timeAgo(job.postedAt)}</span>
          <PublisherBadge publisher={job.publisher} />
        </div>
      </div>
    </article>
  );
}
