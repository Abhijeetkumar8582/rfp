"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { auth as apiAuth, activity as activityApi, getStoredUser, getToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (token && stored) {
      setUser(stored);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const data = await apiAuth.login(email, password);
    setUser(data.user);
    try {
      await activityApi.create({
        actor: data.user?.name || data.user?.email || "User",
        event_action: "Login",
        target_resource: "Platform",
        severity: "info",
        system: "web",
      });
    } catch {
      /* non-blocking */
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    const currentUser = getStoredUser();
    try {
      await activityApi.create({
        actor: currentUser?.name || currentUser?.email || "User",
        event_action: "Logout",
        target_resource: "Platform",
        severity: "info",
        system: "web",
      });
    } catch {
      /* non-blocking */
    }
    await apiAuth.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
