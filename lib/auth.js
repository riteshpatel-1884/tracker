import crypto from "crypto";

export const COOKIE_NAME = "jt_admin";

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();

// Login token derived from the password, so changing the password logs everyone out
export function makeToken() {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return null;
  return crypto
    .createHmac("sha256", pass)
    .update("job-tracker-admin")
    .digest("hex");
}

export function passwordMatches(input) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return false;
  return crypto.timingSafeEqual(sha(input), sha(pass));
}

export function isAdmin(request) {
  const token = makeToken();
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!token || !cookie) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}