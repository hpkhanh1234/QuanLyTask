"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import ToastNotification, { registerToastCallback, unregisterToastCallback } from "./ToastNotification";

interface Toast {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [currentToast, setCurrentToast] = useState<Toast | null>(null);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const newToast: Toast = {
      ...toast,
      id: Math.random().toString(36).substr(2, 9),
    };
    setCurrentToast(newToast);
  }, []);

  useEffect(() => {
    registerToastCallback(showToast);
    return () => unregisterToastCallback();
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastNotification
        notification={currentToast}
        onDismiss={() => setCurrentToast(null)}
      />
    </ToastContext.Provider>
  );
}
