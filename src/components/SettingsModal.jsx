import { useEffect, useState } from "react";

const JSEARCH_URL = "https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing";

export default function SettingsModal({ apiKey, shared, onSave, onDemo, onClose }) {
  const [value, setValue] = useState(apiKey);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 id="settings-title">{shared.active ? "Your own API key (optional)" : "Connect job search"}</h2>
        {shared.active && (
          <div className="shared-note">
            ✅ This site includes free shared searches
            {shared.until ? ` until ${shared.until.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}` : ""}.
            You only need your own key if they run out.
          </div>
        )}
        <p className="muted">
          JobFinder uses the free JSearch API to search jobs. The free Basic plan stops at its monthly limit, so
          you're never charged.
        </p>

        <ol className="steps">
          <li>
            Open <a href={JSEARCH_URL} target="_blank" rel="noopener noreferrer">JSearch on RapidAPI</a> and sign up (free).
          </li>
          <li>Subscribe to the <strong>Basic (free)</strong> plan.</li>
          <li>Copy the <code>X-RapidAPI-Key</code> shown on the API page and paste it below.</li>
        </ol>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(value.trim());
          }}
        >
          <label className="key-field">
            <span className="filter-label">RapidAPI key</span>
            <div className="key-input">
              <input
                type={reveal ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Paste your key"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="button" className="btn btn-ghost" onClick={() => setReveal((v) => !v)}>
                {reveal ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <p className="small muted">
            Your key is saved only in this browser. It never goes into your GitHub code.
          </p>
          <div className="modal-actions">
            {apiKey && (
              <button type="button" className="btn btn-ghost danger" onClick={() => onSave("")}>
                Remove key
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onDemo}>Try demo instead</button>
            <button type="submit" className="btn btn-primary" disabled={!value.trim()}>Save key</button>
          </div>
        </form>
      </div>
    </div>
  );
}
