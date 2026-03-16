"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Settings index: redirect to Team Directory (user management). */
export default function SettingsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/team-directory");
  }, [router]);
  return null;
}
