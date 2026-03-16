"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../context/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes — don't refetch on remount if data is fresh
      gcTime: 10 * 60 * 1000,  // 10 minutes cache (formerly cacheTime)
    },
  },
});

export function AuthProviderWrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

export { AuthProvider };
