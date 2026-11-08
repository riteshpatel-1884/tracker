"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const STATUSES = ["Applied", "Interview", "Offer", "Rejected"];
const STORAGE_KEY = "job-tracker-jobs";

const emptyForm = {
  company: "",
  role: "",
  date: new Date().toISOString().slice(0, 10),
  status: "Applied",
  jd: "",
};

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("All");
  const [loaded, setLoaded] = useState(false);

  // Load saved jobs once on the client
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setJobs(JSON.parse(saved));
    } catch (e) {
      console.error("Could not read saved jobs", e);
    }
    setLoaded(true);
  }, []);

  // Save whenever jobs change (after the first load)
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    } catch (e) {
      console.error("Could not save jobs", e);
    }
  }, [jobs, loaded]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const addJob = (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return;
    setJobs([{ ...form, id: Date.now() }, ...jobs]);
    setForm({ ...emptyForm, date: form.date });
  };

  const updateStatus = (id, status) =>
    setJobs(jobs.map((j) => (j.id === id ? { ...j, status } : j)));

  const deleteJob = (id) => setJobs(jobs.filter((j) => j.id !== id));

  const visible =
    filter === "All" ? jobs : jobs.filter((j) => j.status === filter);

  const count = (s) => jobs.filter((j) => j.status === s).length;

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Job tracker</h1>
      <p className={styles.sub}>
        {jobs.length} applications · {count("Interview")} interviewing ·{" "}
        {count("Offer")} offers
      </p>

      <form className={styles.form} onSubmit={addJob}>
        <input
          name="company"
          placeholder="Company"
          value={form.company}
          onChange={handleChange}
          required
        />
        <input
          name="role"
          placeholder="Role"
          value={form.role}
          onChange={handleChange}
          required
        />
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
        />
        <select name="status" value={form.status} onChange={handleChange}>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <textarea
          name="jd"
          placeholder="Paste the job description here (shown when you hover the job later)"
          value={form.jd}
          onChange={handleChange}
          rows={4}
        />
        <button type="submit">Add application</button>
      </form>

      <div className={styles.filters}>
        {["All", ...STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={filter === s ? styles.activeFilter : ""}
          >
            {s}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className={styles.empty}>
          {jobs.length === 0
            ? "No applications yet. Add your first one above."
            : `No applications with status "${filter}".`}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Applied on</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((job) => (
                <tr key={job.id}>
                  <td className={styles.company}>{job.company}</td>
                  <td>
                    <span className={styles.hoverTarget} tabIndex={0}>
                      {job.role}
                      <span className={styles.popup} role="tooltip">
                        <strong>
                          {job.role} at {job.company}
                        </strong>
                        {job.jd.trim() ? job.jd : "No job description saved."}
                      </span>
                    </span>
                  </td>
                  <td>{job.date}</td>
                  <td>
                    <select
                      className={`${styles.status} ${
                        styles[job.status.toLowerCase()]
                      }`}
                      value={job.status}
                      onChange={(e) => updateStatus(job.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.delete}
                      onClick={() => deleteJob(job.id)}
                      aria-label={`Delete ${job.role} at ${job.company}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}