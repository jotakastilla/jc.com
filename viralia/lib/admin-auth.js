import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "viralia_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function getCredentials() {
  return {
    password: process.env.VIRALIA_ADMIN_PASSWORD || "",
    sessionSecret: process.env.VIRALIA_ADMIN_SESSION_SECRET || "",
  };
}

function createSignature(payload, sessionSecret) {
  return createHmac("sha256", sessionSecret).update(payload).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionValue(sessionSecret) {
  const payload = Buffer.from(
    JSON.stringify({ expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000 })
  ).toString("base64url");

  return `${payload}.${createSignature(payload, sessionSecret)}`;
}

function isValidSession(sessionValue, sessionSecret) {
  if (!sessionValue || !sessionSecret) {
    return false;
  }

  const [payload, signature] = sessionValue.split(".");
  if (!payload || !signature || !safeEqual(signature, createSignature(payload, sessionSecret))) {
    return false;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).expiresAt > Date.now();
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  const { sessionSecret } = getCredentials();
  const cookieStore = await cookies();
  return isValidSession(cookieStore.get(COOKIE_NAME)?.value, sessionSecret);
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/viralia/admin/login");
  }
}

export async function startAdminSession(passwordAttempt) {
  const { password, sessionSecret } = getCredentials();
  if (!password || !sessionSecret || !safeEqual(passwordAttempt, password)) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionValue(sessionSecret), {
    httpOnly: true,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return true;
}

export async function endAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
