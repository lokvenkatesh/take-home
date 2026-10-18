import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";

export type Limit = { ok: boolean; retryAfterSec: number };

// Fixed-window counter in Postgres, shared by every server instance.
// One atomic upsert either starts a new window or adds 1 to the current one.
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<Limit> {
  try {
    const rows = await db.execute<{ count: number; window_start: Date }>(sql`
      insert into rate_limits (key, count, window_start) values (${key}, 1, now())
      on conflict (key) do update set
        count = case when rate_limits.window_start < now() - (${windowSec}::int * interval '1 second')
                     then 1 else rate_limits.count + 1 end,
        window_start = case when rate_limits.window_start < now() - (${windowSec}::int * interval '1 second')
                     then now() else rate_limits.window_start end
      returning count, window_start`);
    const row = rows[0];
    const count = Number(row.count);
    const resetAt = new Date(row.window_start).getTime() + windowSec * 1000;
    return { ok: count <= limit, retryAfterSec: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) };
  } catch (e) {
    // Fail open: a problem with rate limiting should never lock everyone out
    console.error("Rate limit check failed, allowing the request.", e);
    return { ok: true, retryAfterSec: 0 };
  }
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export function tooMany(retryAfterSec: number) {
  const m = Math.ceil(retryAfterSec / 60);
  return `Too many tries. Please wait ${m} minute${m === 1 ? "" : "s"} and try again.`;
}

// Per email (stops guessing one account) and per network (stops trying many accounts)
export async function limitLogin(email: string): Promise<string | null> {
  const ip = await clientIp();
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`login:email:${email}`, 10, 15 * 60),
    rateLimit(`login:ip:${ip}`, 30, 15 * 60),
  ]);
  if (!byEmail.ok) return tooMany(byEmail.retryAfterSec);
  if (!byIp.ok) return tooMany(byIp.retryAfterSec);
  return null;
}
