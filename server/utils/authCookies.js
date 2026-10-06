import { env } from "../config/env.js";
export const authCookieName = process.env.NODE_ENV === "production" ? "__Host-exam_session" : "exam_session";
export function cookieToken(req) {
  const entry = (req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${authCookieName}=`));
  try { return entry ? decodeURIComponent(entry.slice(authCookieName.length + 1)) : null; } catch { return null; }
}
export function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: env.cookieSameSite, path: "/" };
}
export function setAuthCookie(res, token, expiresAt) { res.cookie(authCookieName, token, { ...cookieOptions(), expires: expiresAt }); }
export function clearAuthCookie(res) { res.clearCookie(authCookieName, cookieOptions()); }
export function requireBrowserRequest(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.headers["x-exam-request"] === "1") return next();
  return res.status(403).json({ message: "Request verification failed. Refresh the page and try again." });
}
