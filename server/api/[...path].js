import { app } from "../server.js";

function normalizeRequestUrl(req) {
  const url = req.url || "/";
  if (url === "/" || url.startsWith("/api") || url.startsWith("/uploads")) return;

  req.url = `/api${url.startsWith("/") ? url : `/${url}`}`;
}

export default function handler(req, res) {
  normalizeRequestUrl(req);
  return app(req, res);
}