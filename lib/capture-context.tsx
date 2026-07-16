"use client";

import { createContext, useContext, useState, useCallback } from "react";

/**
 * Context for managing the capture overlay state.
 *
 * This provides a global way to open/close the capture overlay from anywhere in the app.
 */
type CaptureContextType = {
  isOpen: boolean;
  openCapture: () => void;
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

  const openCapture = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCapture = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <CaptureContext.Provider value={{ isOpen, openCapture, closeCapture }}>
      {children}
    </CaptureContext.Provider>
  );
}
