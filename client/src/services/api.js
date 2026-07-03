import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const isLocalApiUrl = configuredApiUrl && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?($|\/)/.test(configuredApiUrl);
const normalizedConfiguredApiUrl = configuredApiUrl && !configuredApiUrl.endsWith("/api") ? `${configuredApiUrl}/api` : configuredApiUrl;

export const apiBaseURL = import.meta.env.PROD && isLocalApiUrl ? "/api" : normalizedConfiguredApiUrl || "/api";

export const api = axios.create({
  baseURL: apiBaseURL
});
function apiOrigin() {
  if (!apiBaseURL || apiBaseURL === "/api") return window.location.origin;

  try {
    return new URL(apiBaseURL, window.location.origin).origin;
  } catch (_error) {
    return window.location.origin;
  }
}

export function assetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiOrigin()}${normalizedPath}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("exam_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isSessionInvalidated = error.response.data?.message?.includes("Session invalidated") || false;
      localStorage.removeItem("exam_token");
      localStorage.removeItem("exam_user");
      if (!window.location.hash.startsWith("#/login")) {
        window.location.href = isSessionInvalidated ? "/#/login?expired=true" : "/#/login";
      }
    }
    return Promise.reject(error);
  }
);

export function downloadFile(path, filename) {
  return api.get(path, { responseType: "blob" }).then((response) => {
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  });
}
