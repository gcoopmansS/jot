"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Account Settings page.
 *
 * Allows users to:
 * - Update their email address
 * - Change their password
 * - Delete their account permanently
 *
 * All operations use Supabase Auth's built-in flows.
 */
export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  // Email update state
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password update state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Account deletion state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

  // Get current user email when delete dialog opens
  const handleOpenDeleteDialog = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      setCurrentUserEmail(user.email);
    }
    setDeleteConfirmOpen(true);
  };

  // Handle email update
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus({ type: null, message: "" });
    setIsUpdatingEmail(true);

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        setEmailStatus({
          type: "error",
          message: error.message,
        });
      } else {
        setEmailStatus({
          type: "success",
          message:
            "Check your new email address for a confirmation link to complete the change.",
        });
        setNewEmail("");
      }
    } catch (error) {
      setEmailStatus({
        type: "error",
        message: "An unexpected error occurred.",
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Handle password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({ type: null, message: "" });

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: "New passwords do not match.",
      });
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setPasswordStatus({
        type: "error",
        message: "Password must be at least 6 characters.",
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      // Supabase doesn't natively require the old password for password updates
      // when the user is already authenticated, but we can verify the current
      // password by trying to sign in with it first
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setPasswordStatus({
          type: "error",
          message: "User not found.",
        });
        setIsUpdatingPassword(false);
        return;
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordStatus({
          type: "error",
          message: "Current password is incorrect.",
        });
        setIsUpdatingPassword(false);
        return;
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordStatus({
          type: "error",
          message: error.message,
        });
      } else {
        setPasswordStatus({
          type: "success",
          message: "Password updated successfully.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      setPasswordStatus({
        type: "error",
        message: "An unexpected error occurred.",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    // Verify email confirmation matches
    if (deleteEmailConfirm !== currentUserEmail) {
      return; // ConfirmDialog will handle validation display
    }

    setIsDeleting(true);

    try {
      // Call the delete account API route (server-side)
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete account. Please try again.");
        setIsDeleting(false);
        return;
      }

      // Sign out and redirect to landing page
      await supabase.auth.signOut();
      router.push("/?deleted=true");
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-10 py-12">
      <h1
        className="text-3xl font-semibold tracking-tight text-[var(--ink)]"
        style={{ fontFamily: "var(--font-space-grotesk)" }}
      >
        Account Settings
      </h1>
      <p
        className="mt-2 text-sm text-[var(--ink-soft)]"
        style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
      >
        Manage your account preferences and data
      </p>

      {/* Email Update Section */}
      <section className="mt-8">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)] p-6">
          <h2
            className="text-xl font-semibold text-[var(--ink)]"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Email Address
          </h2>
          <p
            className="mt-1 text-sm text-[var(--ink-soft)]"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            Update the email address associated with your account. You'll need
            to confirm the new address via email.
          </p>

          <form onSubmit={handleUpdateEmail} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="new-email"
                className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
              >
                New Email Address
              </label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-white"
              />
            </div>

            {emailStatus.type && (
              <div
                className={`rounded-[var(--radius)] border px-4 py-3 text-sm ${
                  emailStatus.type === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                {emailStatus.message}
              </div>
            )}

            <Button type="submit" disabled={isUpdatingEmail || !newEmail}>
              {isUpdatingEmail ? "Updating..." : "Update Email"}
            </Button>
          </form>
        </div>
      </section>

      {/* Password Update Section */}
      <section className="mt-6">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)] p-6">
          <h2
            className="text-xl font-semibold text-[var(--ink)]"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Password
          </h2>
          <p
            className="mt-1 text-sm text-[var(--ink-soft)]"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            Change your account password. You'll need to enter your current
            password to confirm.
          </p>

          <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="current-password"
                className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
              >
                Current Password
              </label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
              >
                New Password
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
              >
                Confirm New Password
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-white"
              />
            </div>

            {passwordStatus.type && (
              <div
                className={`rounded-[var(--radius)] border px-4 py-3 text-sm ${
                  passwordStatus.type === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                {passwordStatus.message}
              </div>
            )}

            <Button
              type="submit"
              disabled={
                isUpdatingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </section>

      {/* Danger Zone - Account Deletion */}
      <section className="mt-12">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)] p-6">
          <h2
            className="text-xl font-semibold text-red-600"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Danger Zone
          </h2>
          <p
            className="mt-1 text-sm text-[var(--ink-soft)]"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>

          <div className="mt-6 rounded-[var(--radius)] border border-red-200 bg-red-50 p-6">
            <h3
              className="font-semibold text-red-900"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Delete Your Account
            </h3>
            <p
              className="mt-2 text-sm text-red-800"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              This will permanently delete your account, all your projects,
              meetings, topics, and notes. This action is immediate and cannot
              be reversed.
            </p>
            <Button
              variant="destructive"
              onClick={handleOpenDeleteDialog}
              className="mt-4"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Account"
        description={
          <div>
            <div className="mb-4">
              This will permanently delete your account and ALL of your data:
            </div>
            <ul className="mb-4 ml-6 list-disc space-y-1 text-sm">
              <li>All projects</li>
              <li>All meetings and meeting notes</li>
              <li>All topics and general notes</li>
              <li>Your account credentials</li>
            </ul>
            <div className="mb-4 font-semibold">
              This action cannot be undone. There is no way to recover your data
              after deletion.
            </div>
            <div className="mb-2">
              To confirm, type your email address:{" "}
              <span className="font-semibold">{currentUserEmail}</span>
            </div>
            <Input
              value={deleteEmailConfirm}
              onChange={(e) => setDeleteEmailConfirm(e.target.value)}
              placeholder="Type your email to confirm"
              className="mt-2 bg-white"
            />
          </div>
        }
        confirmLabel={isDeleting ? "Deleting..." : "Delete Everything"}
        cancelLabel="Cancel"
        onConfirm={handleDeleteAccount}
        variant="danger"
        disabled={deleteEmailConfirm !== currentUserEmail || isDeleting}
      />
    </div>
  );
}
