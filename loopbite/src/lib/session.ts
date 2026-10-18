import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error("AUTH_SECRET is missing or too short. Generate one with: openssl rand -base64 32");
}
const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const COOKIE = "lb_session";

export type Role = "donor" | "student" | "admin";
export type Session = { userId: string; role: Role };

export async function createSession(session: Session) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return { userId: payload.userId as string, role: payload.role as Role };
  } catch {
    return null; // tampered or expired
  }
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}