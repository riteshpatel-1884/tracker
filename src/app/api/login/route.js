import { NextResponse } from "next/server";
import { COOKIE_NAME, makeToken, passwordMatches } from "../../../../lib/auth";

const isHttps = (request) =>
  request.headers.get("x-forwarded-proto") === "https" ||
  request.nextUrl.protocol === "https:";

// Log in
export async function POST(request) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not set in .env.local." },
      { status: 500 }
    );
  }

  const { password } = await request.json().catch(() => ({}));

  if (!passwordMatches(password || "")) {
    await new Promise((r) => setTimeout(r, 500)); // slows down guessing
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(request),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

// Log out
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}