"use client";

import { useCallback, useEffect, useState } from "react";

const STATUSES = ["Applied", "Interview", "Offer", "Rejected"];
const THEME_KEY = "job-tracker-theme";
const TZ = "Asia/Kolkata";

// Current date + time in IST, formatted for <input type="datetime-local">
const nowIST = () =>
  new Date()
    .toLocaleString("sv-SE", { timeZone: TZ })
    .slice(0, 16)
    .replace(" ", "T");

// Show a saved IST date/time nicely (also handles date-only entries)
const formatIST = (v) => {
  if (!v) return "-";
  if (v.length === 10) {
    return new Date(`${v}T00:00:00+05:30`).toLocaleDateString("en-IN", {
      timeZone: TZ,
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return new Date(`${v}:00+05:30`).toLocaleString("en-IN", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Small helper for talking to our API routes
async function api(url, options = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong.");
    err.status = res.status;
    throw err;
  }
  return data;
}

const emptyForm = {
  company: "",
  role: "",
  date: "",
  status: "Applied",
  link: "",
  email: "",
  jd: "",
};

// Only allow normal web links in href
const isWebLink = (v) => /^https?:\/\//i.test(v || "");

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("All");

  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");

  const [theme, setTheme] = useState("light");
  const [themeReady, setThemeReady] = useState(false);

  // Get the latest jobs from the server
  const load = useCallback(async () => {
    try {
      const data = await api("/api/jobs");
      setJobs(data.jobs);
      setIsAdmin(data.isAdmin);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  // On first load: theme, current IST time and jobs
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setTheme(savedTheme || (prefersDark ? "dark" : "light"));
    } catch (e) {
      console.error("Could not read theme", e);
    }
    setThemeReady(true);
    setForm((f) => ({ ...f, date: nowIST() }));
    load();
  }, [load]);

  // Refresh when you come back to the tab, so changes from other devices show up
  useEffect(() => {
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);

  // Apply + save theme
  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.error("Could not save theme", e);
    }
  }, [theme, themeReady]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  // Run an action and show any error. If the login expired, drop back to view-only.
  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
      if (e.status === 401) setIsAdmin(false);
    } finally {
      setBusy(false);
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const login = (e) => {
    e.preventDefault();
    run(async () => {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      setShowLogin(false);
      await load();
    });
  };

  const logout = () =>
    run(async () => {
      await api("/api/login", { method: "DELETE" });
      setIsAdmin(false);
    });

  const addJob = (e) => {
    e.preventDefault();
    run(async () => {
      const data = await api("/api/jobs", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setJobs(data.jobs);
      setForm({ ...emptyForm, date: nowIST() });
    });
  };

  const updateStatus = (id, status) =>
    run(async () => {
      const data = await api("/api/jobs", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      setJobs(data.jobs);
    });

  const deleteJob = (job) => {
    if (!window.confirm(`Delete ${job.role} at ${job.company}?`)) return;
    run(async () => {
      const data = await api("/api/jobs", {
        method: "DELETE",
        body: JSON.stringify({ id: job.id }),
      });
      setJobs(data.jobs);
    });
  };

  const count = (s) => jobs.filter((j) => j.status === s).length;

  const visible = (filter === "All"
    ? jobs
    : jobs.filter((j) => j.status === filter)
  )
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <main className="jt-main">
      <header className="jt-header">
        <div>
          <h1 className="jt-title">Job tracker</h1>
          <p className="jt-sub">Keep track of every application in one place.</p>
        </div>
        <div className="jt-header-actions">
          <span className={`jt-badge ${isAdmin ? "jt-badge-admin" : ""}`}>
            {isAdmin ? "Admin" : "View only"}
          </span>
          {isAdmin ? (
            <button type="button" className="jt-ghost" onClick={logout}>
              Log out
            </button>
          ) : (
            <button
              type="button"
              className="jt-ghost"
              onClick={() => setShowLogin(!showLogin)}
            >
              Admin login
            </button>
          )}
          <button
            type="button"
            className="jt-theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle light and dark theme"
          >
            {theme === "dark" ? "☀ Light" : "☾ Dark"}
          </button>
        </div>
      </header>

      {error && <div className="jt-error">{error}</div>}

      {!isAdmin && showLogin && (
        <form className="jt-card jt-login" onSubmit={login}>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          <button type="submit" className="jt-primary" disabled={busy}>
            Log in
          </button>
        </form>
      )}

      <section className="jt-stats">
        <div className="jt-stat">
          <span className="jt-stat-num">{jobs.length}</span>
          <span className="jt-stat-label">Total</span>
        </div>
        {STATUSES.map((s) => (
          <div className="jt-stat" key={s}>
            <span className={`jt-stat-num jt-num-${s.toLowerCase()}`}>
              {count(s)}
            </span>
            <span className="jt-stat-label">{s}</span>
          </div>
        ))}
      </section>

      {isAdmin && (
        <form className="jt-card jt-form" onSubmit={addJob}>
          <h2 className="jt-card-title">Add application</h2>
          <label className="jt-field">
            <span>Company</span>
            <input
              name="company"
              placeholder="e.g. Google"
              value={form.company}
              onChange={handleChange}
              required
            />
          </label>
          <label className="jt-field">
            <span>Role</span>
            <input
              name="role"
              placeholder="e.g. Frontend Developer"
              value={form.role}
              onChange={handleChange}
              required
            />
          </label>
          <label className="jt-field">
            <span>Applied on (IST)</span>
            <input
              type="datetime-local"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </label>
          <label className="jt-field">
            <span>Status</span>
            <select name="status" value={form.status} onChange={handleChange}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="jt-field">
            <span>Application link</span>
            <input
              type="text"
              inputMode="url"
              name="link"
              placeholder="https://company.com/careers/123"
              value={form.link}
              onChange={handleChange}
            />
          </label>
          <label className="jt-field">
            <span>HR / company email</span>
            <input
              type="email"
              name="email"
              placeholder="hr@company.com"
              value={form.email}
              onChange={handleChange}
            />
          </label>
          <label className="jt-field jt-full">
            <span>Job description</span>
            <textarea
              name="jd"
              placeholder="Paste the job description here. You can read it later by hovering over the role."
              value={form.jd}
              onChange={handleChange}
              rows={4}
            />
          </label>
          <div className="jt-form-actions jt-full">
            <button type="submit" className="jt-primary" disabled={busy}>
              Add application
            </button>
            <button
              type="button"
              className="jt-ghost"
              onClick={() => setForm({ ...form, date: nowIST() })}
            >
              Set to current IST time
            </button>
          </div>
        </form>
      )}

      <div className="jt-filters">
        {["All", ...STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={filter === s ? "jt-active-filter" : ""}
          >
            {s}
            <span className="jt-pill-count">
              {s === "All" ? jobs.length : count(s)}
            </span>
          </button>
        ))}
      </div>

      {!loaded ? (
        <div className="jt-card jt-empty">Loading applications…</div>
      ) : visible.length === 0 ? (
        <div className="jt-card jt-empty">
          {jobs.length === 0
            ? isAdmin
              ? "No applications yet. Add your first one above."
              : "No applications yet."
            : `No applications with status "${filter}".`}
        </div>
      ) : (
        <div className="jt-table-scroll">
          <div className="jt-card jt-table-card">
            <table className="jt-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Applied on (IST)</th>
                  <th>Status</th>
                  <th>Links</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {visible.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <div className="jt-company-cell">
                        <span className="jt-avatar">
                          {job.company.trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="jt-company">{job.company}</span>
                      </div>
                    </td>
                    <td>
                      <span className="jt-hover-target" tabIndex={0}>
                        {job.role}
                        <span className="jt-popup" role="tooltip">
                          <span className="jt-popup-head">
                            {job.role} at {job.company}
                          </span>
                          <span className="jt-popup-body">
                            {job.jd && job.jd.trim()
                              ? job.jd
                              : "No job description saved."}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="jt-date">{formatIST(job.date)}</td>
                    <td>
                      {isAdmin ? (
                        <select
                          className={`jt-status jt-status-${job.status.toLowerCase()}`}
                          value={job.status}
                          disabled={busy}
                          onChange={(e) => updateStatus(job.id, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`jt-status jt-status-static jt-status-${job.status.toLowerCase()}`}
                        >
                          {job.status}
                        </span>
                      )}
                    </td>
                    <td className="jt-links">
                      {isWebLink(job.link) && (
                        <a href={job.link} target="_blank" rel="noopener noreferrer">
                          Application link
                        </a>
                      )}
                      {job.email && (
                        <a href={`mailto:${job.email}`}>{job.email}</a>
                      )}
                      {!isWebLink(job.link) && !job.email && (
                        <span className="jt-none">-</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          type="button"
                          className="jt-delete"
                          disabled={busy}
                          onClick={() => deleteJob(job)}
                          aria-label={`Delete ${job.role} at ${job.company}`}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}