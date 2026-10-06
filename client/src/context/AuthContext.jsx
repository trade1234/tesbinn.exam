import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    localStorage.removeItem("exam_token");
    localStorage.removeItem("exam_user");
    api.get("/auth/me", { skipAuthRedirect: true }).then(({ data }) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => { api.get("/auth/me").catch(() => {}); }, 30000);
    return () => window.clearInterval(timer);
  }, [user?._id]);
  async function login(payload) {
    setLoading(true);
    try { const { data } = await api.post("/auth/login", payload); setUser(data.user); return data.user; }
    finally { setLoading(false); }
  }
  async function logout() {
    try { await api.post("/auth/logout", {}, { skipAuthRedirect: true }); }
    catch (error) { if (error.response?.status !== 401) throw error; }
    setUser(null);
  }
  async function refreshUser() { const { data } = await api.get("/auth/me"); setUser(data.user); return data.user; }
  const value = useMemo(() => ({ user, loading, login, logout, refreshUser, isAdmin: user?.role === "ADMIN", isCustomerService: user?.role === "CUSTOMER_SERVICE" }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
