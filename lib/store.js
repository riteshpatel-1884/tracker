import fs from "fs/promises";
import path from "path";
import { Redis } from "@upstash/redis";

// Where jobs are saved:
//  - On Vercel (or anywhere the Redis variables exist): in an Upstash Redis database
//  - On your own computer without those variables: in the text file data/jobs.txt
const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis =
  REDIS_URL && REDIS_TOKEN
    ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
    : null;

const REDIS_KEY = "job-tracker:jobs";

const DIR = path.join(process.cwd(), "data");
const FILE = path.join(DIR, "jobs.txt");

let queue = Promise.resolve();

async function readFromFile() {
  try {
    const text = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(text || "[]");
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

async function writeToFile(jobs) {
  await fs.mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(jobs, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

export async function readJobs() {
  if (redis) {
    const data = await redis.get(REDIS_KEY);
    return Array.isArray(data) ? data : [];
  }
  return readFromFile();
}

// Read, change and save one request at a time so two requests never overwrite each other
export function updateJobs(change) {
  const run = queue.then(async () => {
    const jobs = await readJobs();
    const next = change(jobs);
    if (redis) {
      await redis.set(REDIS_KEY, next);
    } else {
      await writeToFile(next);
    }
    return next;
  });
  queue = run.catch(() => {});
  return run;
}