import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "kimon_wall_user";
const ONE_MONTH = 60 * 60 * 24 * 30;

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "wall-secret";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function hashPassword(password: string) {
  return createHmac("sha256", getSecret()).update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string) {
  const given = Buffer.from(hashPassword(password));
  const expected = Buffer.from(hash);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function setWallSession(profileId: string) {
  const cookieStore = await cookies();
  const value = `${profileId}.${sign(profileId)}`;
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_MONTH
  });
}

export async function getWallSessionProfileId() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return "";

  const [profileId, signature] = value.split(".");
  if (!profileId || !signature) return "";

  const given = Buffer.from(signature);
  const expected = Buffer.from(sign(profileId));

  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return "";
  return profileId;
}

export async function clearWallSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
