import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "kimon_admin";
const ONE_WEEK = 60 * 60 * 24 * 7;

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createAdminSessionValue() {
  const timestamp = Date.now().toString();
  return `${timestamp}.${sign(timestamp)}`;
}

export function isValidAdminSession(value?: string) {
  if (!value) return false;

  const [timestamp, signature] = value.split(".");
  if (!timestamp || !signature) return false;

  const expected = sign(timestamp);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) return false;

  const age = Date.now() - Number(timestamp);
  return age > 0 && age < ONE_WEEK * 1000 && timingSafeEqual(signatureBuffer, expectedBuffer);
}

export async function isAdmin() {
  const cookieStore = await cookies();
  return isValidAdminSession(cookieStore.get(COOKIE_NAME)?.value);
}

export async function setAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createAdminSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK
  });
}

export async function clearAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
