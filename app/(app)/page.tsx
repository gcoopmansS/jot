"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Main authenticated app page.
 *
 * Redirects to /everything (Recent view) by default.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/everything");
  }, [router]);

  return null;
}
