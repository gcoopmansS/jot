"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { ReactNode } from "react";

/**
 * Confirmation dialog for destructive actions.
 *
 * Uses Radix Dialog with design system styling.
 * Shows a warning icon, title, description, and cancel/confirm buttons.
 */

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "danger" | "default";
  disabled?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "danger",
  disabled = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[100] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)] p-6 shadow-[var(--shadow-pop)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ width: "calc(100% - 2rem)", maxWidth: "28rem" }}
        >
          <div className="mb-4 flex items-start gap-3">
            {variant === "danger" && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            )}
            <div className="flex-1">
              <Dialog.Title
                className="text-lg font-semibold text-[var(--ink)]"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                {title}
              </Dialog.Title>
              <Dialog.Description
                className="mt-2 text-sm text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                {description}
              </Dialog.Description>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="secondary">{cancelLabel}</Button>
            </Dialog.Close>
            <Button
              variant="primary"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              disabled={disabled}
              className={
                variant === "danger"
                  ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
                  : ""
              }
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
