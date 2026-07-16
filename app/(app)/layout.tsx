import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";

/**
 * Layout for the authenticated app area.
 *
 * This layout wraps all pages inside /app/(app)/ and ensures the user is logged in.
 * If they're not logged in, they're redirected to the sign-in page.
 *
 * The (app) folder name with parentheses is a Next.js "route group" - it doesn't
 * show up in the URL, it just groups pages that share this layout.
 *
 * Layout structure: Sidebar on the left (fixed width), main content on the right,
 * with capture overlay available globally.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if the user is logged in
  const user = await getUser();

  // If not logged in, redirect to the sign-in page
  if (!user) {
    redirect("/auth/sign-in");
  }

  // User is logged in, show the app shell with sidebar and capture overlay
  return <AppShell>{children}</AppShell>;
}
