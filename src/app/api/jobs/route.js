import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isAdmin } from "../../../../lib/auth";
import { readJobs, updateJobs } from "../../../../lib/store";

const STATUSES = ["Applied", "Interview", "Offer", "Rejected"];

const denied = () =>
  NextResponse.json({ error: "Admin password required." }, { status: 401 });

const bad = (msg) => NextResponse.json({ error: msg }, { status: 400 });

// Anyone can read the jobs
export async function GET(request) {
  const jobs = await readJobs();
  return NextResponse.json({ jobs, isAdmin: isAdmin(request) });
}

// Add a job (admin only)
export async function POST(request) {
  if (!isAdmin(request)) return denied();
  const body = await request.json().catch(() => ({}));

  const company = String(body.company || "").trim().slice(0, 200);
  const role = String(body.role || "").trim().slice(0, 200);
  const date = String(body.date || "").slice(0, 16);
  const jd = String(body.jd || "").slice(0, 20000);
  const status = STATUSES.includes(body.status) ? body.status : "Applied";

  // Application link: add https:// if missing, and make sure it is a real URL
  let link = String(body.link || "").trim().slice(0, 500);
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (link) {
    try {
      new URL(link);
    } catch {
      return bad("Application link is not a valid URL.");
    }
  }

  const email = String(body.email || "").trim().slice(0, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return bad("Email address is not valid.");
  }

  if (!company || !role) return bad("Company and role are required.");

  const job = { id: randomUUID(), company, role, date, status, link, email, jd };
  const jobs = await updateJobs((list) => [job, ...list]);
  return NextResponse.json({ jobs });
}

// Change status (admin only)
export async function PATCH(request) {
  if (!isAdmin(request)) return denied();
  const { id, status } = await request.json().catch(() => ({}));
  if (!id || !STATUSES.includes(status)) return bad("Invalid request.");

  const jobs = await updateJobs((list) =>
    list.map((j) => (j.id === id ? { ...j, status } : j))
  );
  return NextResponse.json({ jobs });
}

// Delete a job (admin only)
export async function DELETE(request) {
  if (!isAdmin(request)) return denied();
  const { id } = await request.json().catch(() => ({}));
  if (!id) return bad("Invalid request.");

  const jobs = await updateJobs((list) => list.filter((j) => j.id !== id));
  return NextResponse.json({ jobs });
}