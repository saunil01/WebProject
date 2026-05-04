import { createContext, useCallback, useEffect, useState } from "react";
import api from "../api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [requestCount, setRequestCount] = useState(0);

  const loadRequestCount = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const res = await api.get("/friends/requests/pending");
      setRequestCount(res.data?.count ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (!res.data?.token || !res.data?.user) {
      throw new Error("Invalid response from server");
    }
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    await api.post("/auth/register", { username, email, password });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setRequestCount(0);
  }, []);

  // Poll pending requests while logged in
  useEffect(() => {
    if (!user) return;
    loadRequestCount();
    const id = setInterval(loadRequestCount, 15000);
    return () => clearInterval(id);
  }, [user, loadRequestCount]);

  return (
    <AuthContext.Provider
      value={{ user, setUser, login, register, logout, requestCount, loadRequestCount }}
    >
      {children}
    </AuthContext.Provider>
  );
}
