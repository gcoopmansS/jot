import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { AcceptInviteButton, SwitchAccountButton } from "@/components/invite/invite-actions";

/**
 * Public invite-acceptance page. Reached by opening a link an owner
 * generated and shared manually (no email-sending in this app - see
 * jot-analysis/TODO.md). Works whether or not the visitor is signed in yet.
 *
 * The preview lookup below uses the service-role client directly, inline,
 * rather than a separate API route - deliberately, since that keeps this
 * exactly as narrow as it needs to be: no new URL exists that exposes an
 * invite's details except by rendering this specific page for its own
 * token. It only ever returns the minimal safe fields (project name,
 * invited email, status), never any note content.
 */

type InvitePreview = {
  projectName: string;
  invitedEmail: string;
  status: "pending" | "accepted";
};

async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_invites")
    .select("invited_email, status, projects(name)")
    .eq("token", token)
    .single();

  if (error || !data) return null;

  const project = Array.isArray(data.projects) ? data.projects[0] : data.projects;

  return {
    projectName: project?.name ?? "this project",
    invitedEmail: data.invited_email,
    status: data.status as "pending" | "accepted",
  };
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="border-b border-[var(--line)] bg-[var(--paper-raised)]">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Jot
          </Link>
        </div>
      </header>
      <main className="max-w-md mx-auto px-6 py-16">
        <div
          className="bg-[var(--paper-raised)] rounded-[var(--radius)] border border-[var(--line)] p-6"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInvitePreview(token);
  const user = await getUser();

  if (!invite) {
    return (
      <InviteShell>
        <p className="text-[var(--ink)]">
          This invite link is invalid, or has been revoked.
        </p>
      </InviteShell>
    );
  }

  if (invite.status === "accepted") {
    if (user) {
      redirect("/everything");
    }
    return (
      <InviteShell>
        <p className="text-[var(--ink)]">
          This invite has already been accepted. Sign in to your account to
          continue.
        </p>
        <Link
          href="/auth/sign-in"
          className="mt-4 inline-block text-[var(--accent)] hover:underline"
        >
          Sign in
        </Link>
      </InviteShell>
    );
  }

  const redirectParam = `/invite/${token}`;

  if (!user) {
    return (
      <InviteShell>
        <p className="text-[var(--ink)] mb-6">
          You&apos;ve been invited to join{" "}
          <strong>{invite.projectName}</strong> as{" "}
          <strong>{invite.invitedEmail}</strong>.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/auth/sign-in?redirect=${encodeURIComponent(redirectParam)}`}
            className="w-full text-center py-3 px-4 bg-[var(--ink)] text-[var(--paper)] rounded-[var(--radius)] font-medium hover:bg-[var(--accent)] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href={`/auth/sign-in?mode=sign-up&redirect=${encodeURIComponent(redirectParam)}`}
            className="w-full text-center py-3 px-4 border border-[var(--line)] rounded-[var(--radius)] font-medium text-[var(--ink)] hover:bg-[var(--paper)] transition-colors"
          >
            Create an account
          </Link>
        </div>
      </InviteShell>
    );
  }

  const emailsMatch =
    user.email?.toLowerCase() === invite.invitedEmail.toLowerCase();

  if (!emailsMatch) {
    return (
      <InviteShell>
        <p className="text-[var(--ink)] mb-6">
          This invite was sent to <strong>{invite.invitedEmail}</strong>, but
          you&apos;re signed in as <strong>{user.email}</strong>.
        </p>
        <SwitchAccountButton redirectTo={redirectParam} />
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <p className="text-[var(--ink)] mb-6">
        You&apos;ve been invited to join <strong>{invite.projectName}</strong>{" "}
        as <strong>{invite.invitedEmail}</strong>.
      </p>
      <AcceptInviteButton token={token} />
    </InviteShell>
  );
}
