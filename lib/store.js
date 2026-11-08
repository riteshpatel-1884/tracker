import fs from "fs/promises";
import path from "path";

// All jobs are saved in this text file (as JSON)
const DIR = path.join(process.cwd(), "data");
const FILE = path.join(DIR, "jobs.txt");

let queue = Promise.resolve();

export async function readJobs() {
  try {
    const text = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(text || "[]");
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

// Read, change and save one request at a time so two requests never overwrite each other
export function updateJobs(change) {
  const run = queue.then(async () => {
    const jobs = await readJobs();
    const next = change(jobs);
    await fs.mkdir(DIR, { recursive: true });
    const tmp = `${FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
    await fs.rename(tmp, FILE);
    return next;
  });
  queue = run.catch(() => {});
  return run;
}