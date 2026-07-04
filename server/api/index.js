import { app } from "../app.js";
import { connectDB } from "../config/db.js";

function normalizeRequestUrl(req) {
  const url = req.url || "/";
  if (url.startsWith("/api") || url.startsWith("/uploads")) return;

  req.url = `/api${url.startsWith("/") ? url : `/${url}`}`;
}

function isHealthCheck(req) {
  const pathname = (req.url || "").split("?")[0];
  return pathname === "/api/health" || pathname === "/health";
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  normalizeRequestUrl(req);

  if (isHealthCheck(req)) {
    return app(req, res);
  }

  try {
    await connectDB();
  } catch (error) {
    console.error("Database connection failed", error);
    return res.status(500).json({
      message: "Database connection failed. Check MONGO_URI and MongoDB Atlas network access in Vercel.",
      code: "DATABASE_CONNECTION_FAILED"
    });
  }

  return app(req, res);
}
