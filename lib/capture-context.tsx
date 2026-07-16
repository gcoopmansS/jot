"use client";

import { createContext, useContext, useState, useCallback } from "react";

/**
 * Context for managing the capture overlay state.
 *
 * This provides a global way to open/close the capture overlay from anywhere in the app.
 * Supports opening with initial text and ID (e.g., to restore a draft).
 */
type CaptureContextType = {
  isOpen: boolean;
  initialText: string;
  initialId?: string;
  openCapture: (text?: string, id?: string) => void;
  closeCapture: () => void;
};

const CaptureContext = createContext<CaptureContextType | undefined>(undefined);

export function useCaptureOverlay() {
  const context = useContext(CaptureContext);
  if (!context) {
    throw new Error("useCaptureOverlay must be used within CaptureProvider");
  }
  return context;
}

export function CaptureProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialText, setInitialText] = useState("");
  const [initialId, setInitialId] = useState<string | undefined>(undefined);

  const openCapture = useCallback((text = "", id?: string) => {
    setInitialText(text);
    setInitialId(id);
    setIsOpen(true);
  }, []);

  const closeCapture = useCallback(() => {
    setIsOpen(false);
    setInitialText("");
    setInitialId(undefined);
  }, []);

  return (
    <CaptureContext.Provider
      value={{ isOpen, initialText, initialId, openCapture, closeCapture }}
    >
      {children}
    </CaptureContext.Provider>
  );
}
