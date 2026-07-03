import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("exam_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("exam_token");
    if (!token) return;
    api.get("/auth/me").then((res) => {
      setUser(res.data.user);
      localStorage.setItem("exam_user", JSON.stringify(res.data.user));
    }).catch(() => logout());
  }, []);

  async function login(payload) {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", payload);
      localStorage.setItem("exam_token", data.token);
      localStorage.setItem("exam_user", JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("exam_token");
    localStorage.removeItem("exam_user");
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, logout, isAdmin: user?.role === "ADMIN" }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

