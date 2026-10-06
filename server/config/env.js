import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });
if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "development-secret" || process.env.JWT_SECRET.length < 32)) {
  throw new Error("Production requires a JWT_SECRET of at least 32 characters.");
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const env = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || "development-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  cookieSameSite: process.env.COOKIE_SAME_SITE === "none" && process.env.NODE_ENV === "production" ? "none" : "lax",
  thirdPartyApiKey: process.env.THIRD_PARTY_API_KEY || (process.env.NODE_ENV === "production" ? "" : "development-read-only-api-key"),
  clientUrl: allowedOrigins[0] || "http://localhost:5173",
  clientUrls: allowedOrigins,
  allowedOrigins
};
