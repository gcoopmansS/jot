"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Check, Copy, X } from "lucide-react";
import { useCurrentUser } from "@/lib/use-current-user";
import { Project, ProjectInvite, ProjectMemberWithEmail } from "@/lib/types";

/**
 * "Manage Members" dialog - reachable from any project's sidebar dropdown.
 * Any member sees the roster and can leave; only the owner sees the invite
 * form, pending invites, and can remove other members.
 *
 * Uses z-[90] (below ConfirmDialog's z-[100]) since it nests a ConfirmDialog
 * for remove/leave confirmations.
 */

type ManageMembersDialogProps = {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ManageMembersDialog({
  project,
  open,
  onOpenChange,
}: ManageMembersDialogProps) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const isOwner = currentUser?.id === project.user_id;

  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [justInvitedEmail, setJustInvitedEmail] = useState<string | null>(null);
  const [justInvitedAccountExists, setJustInvitedAccountExists] = useState<
    boolean | null
  >(null);
  const [removeTarget, setRemoveTarget] = useState<ProjectMemberWithEmail | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ProjectInvite | null>(null);

  const { data: members, isLoading: membersLoading } = useQuery<
    ProjectMemberWithEmail[]
  >({
    queryKey: ["project-members", project.id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${project.id}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: open,
  });

  const { data: invites } = useQuery<ProjectInvite[]>({
    queryKey: ["project-invites", project.id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${project.id}/invites`);
      if (!res.ok) throw new Error("Failed to fetch invites");
      return res.json();
    },
    enabled: open && isOwner,
  });

  const inviteLink = (token: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${token}`
      : "";

  const handleCopyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error("Failed to copy invite link:", error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviting(true);

    try {
      const res = await fetch(`/api/projects/${project.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || "Failed to create invite");
      }

      const invitedEmail = email;
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["project-invites", project.id] });
      await handleCopyLink(body.token);
      setJustInvitedEmail(invitedEmail);
      setJustInvitedAccountExists(!!body.account_exists);
      setTimeout(() => {
        setJustInvitedEmail(null);
        setJustInvitedAccountExists(null);
      }, 6000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const res = await fetch(`/api/projects/${project.id}/members/${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["project-members", project.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const res = await fetch(`/api/projects/${project.id}/invites/${inviteId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["project-invites", project.id] });
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/40" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[90] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] bg-[var(--paper-raised)] p-6 max-h-[85vh] overflow-y-auto"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            <div className="flex items-start justify-between mb-1">
              <Dialog.Title
                className="text-lg font-semibold text-[var(--ink)]"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                {project.name}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description
              className="mb-4 text-sm text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Members
            </Dialog.Description>

            <div className="space-y-2 mb-6">
              {membersLoading && (
                <p className="text-sm text-[var(--ink-soft)]">Loading...</p>
              )}
              {members?.map((member) => {
                const memberIsOwner = member.user_id === project.user_id;
                const memberIsYou = member.user_id === currentUser?.id;
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between py-2 px-3 rounded-[var(--radius)] bg-[var(--paper)] border border-[var(--line)]"
                  >
                    <span
                      className="text-sm text-[var(--ink)]"
                      style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                    >
                      {member.email}
                      {memberIsOwner && (
                        <span className="ml-2 text-xs text-[var(--ink-soft)] uppercase tracking-wide">
                          Owner
                        </span>
                      )}
                      {memberIsYou && !memberIsOwner && (
                        <span className="ml-2 text-xs text-[var(--ink-soft)] uppercase tracking-wide">
                          You
                        </span>
                      )}
                    </span>
                    {!memberIsOwner && (isOwner || memberIsYou) && (
                      <button
                        className="text-xs text-[var(--ink-soft)] hover:text-red-600 transition-colors"
                        onClick={() => setRemoveTarget(member)}
                      >
                        {memberIsYou ? "Leave" : "Remove"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {isOwner && (
              <>
                <div className="border-t border-[var(--line)] pt-4 mb-4">
                  <h3
                    className="text-sm font-semibold text-[var(--ink)] mb-1"
                    style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                  >
                    Invite a teammate
                  </h3>
                  <p
                    className="text-xs text-[var(--ink-soft)] mb-2"
                    style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                  >
                    Generates a link — copy and share it with the invitee
                    (email, Slack, however you like). Only that exact email
                    address can accept it.
                  </p>
                  <form onSubmit={handleInvite} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="teammate@example.com"
                      style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                      className="flex-1 min-w-0 px-3 py-2 text-sm border border-[var(--line)] rounded-[var(--radius)] bg-[var(--paper)] focus:outline-none focus:border-[var(--accent)] transition-colors text-[var(--ink)]"
                    />
                    <Button type="submit" size="sm" disabled={inviting}>
                      {inviting ? "..." : "Generate link"}
                    </Button>
                  </form>
                  {inviteError && (
                    <p className="mt-2 text-xs text-red-600">{inviteError}</p>
                  )}
                  {justInvitedEmail && (
                    <div className="mt-2 text-xs">
                      <p
                        className="flex items-center gap-1.5"
                        style={{ color: "var(--accent)" }}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Link copied — paste it somewhere and send it to{" "}
                        {justInvitedEmail}.
                      </p>
                      <p className="mt-1 text-[var(--ink-soft)]">
                        {justInvitedAccountExists
                          ? "This email already has a Jot account — they'll see it right in the app too, or can use the link."
                          : "This email doesn't have a Jot account yet — they'll create one when they open the link."}
                      </p>
                    </div>
                  )}
                </div>

                {invites && invites.length > 0 && (
                  <div className="border-t border-[var(--line)] pt-4">
                    <h3
                      className="text-sm font-semibold text-[var(--ink)] mb-2"
                      style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                    >
                      Pending invites
                    </h3>
                    <div className="space-y-2">
                      {invites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between py-2 px-3 rounded-[var(--radius)] bg-[var(--paper)] border border-[var(--line)]"
                        >
                          <span
                            className="text-sm text-[var(--ink)] truncate"
                            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                          >
                            {invite.invited_email}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                              onClick={() => handleCopyLink(invite.token)}
                            >
                              {copiedToken === invite.token ? (
                                <>
                                  <Check className="h-3 w-3" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copy link
                                </>
                              )}
                            </button>
                            <button
                              className="text-xs text-[var(--ink-soft)] hover:text-red-600 transition-colors"
                              onClick={() => setRevokeTarget(invite)}
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={
          removeTarget?.user_id === currentUser?.id
            ? "Leave project?"
            : "Remove member?"
        }
        description={
          removeTarget?.user_id === currentUser?.id
            ? `You'll lose access to "${project.name}". Notes you've already filed will remain, attributed to you.`
            : `${removeTarget?.email} will lose access to "${project.name}". Their already-filed notes will remain.`
        }
        confirmLabel={removeTarget?.user_id === currentUser?.id ? "Leave" : "Remove"}
        onConfirm={() => removeTarget && handleRemoveMember(removeTarget.user_id)}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="Revoke invite?"
        description={`The link sent to ${revokeTarget?.invited_email} will stop working.`}
        confirmLabel="Revoke"
        onConfirm={() => revokeTarget && handleRevokeInvite(revokeTarget.id)}
      />
    </>
  );
}
