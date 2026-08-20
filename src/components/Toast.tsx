import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export interface ToastMessage {
  id: string;
  message: string;
  emoji?: string;
  type?: "info" | "success" | "warning" | "error";
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, emoji?: string, type?: "info" | "success" | "warning" | "error", duration?: number) => void;
  success: (message: string, emoji?: string) => void;
  info: (message: string, emoji?: string) => void;
  warning: (message: string, emoji?: string) => void;
  error: (message: string, emoji?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let globalToastFn: ((message: string, emoji?: string, type?: "info" | "success" | "warning" | "error", duration?: number) => void) | null = null;

export const showToast = (message: string, emoji: string = "🩺", type: "info" | "success" | "warning" | "error" = "info", duration = 3000) => {
  if (globalToastFn) {
    globalToastFn(message, emoji, type, duration);
  }
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, emoji = "🩺", type: "info" | "success" | "warning" | "error" = "info", duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => {
      // Keep maximum 4 active toasts to avoid clutter
      const filtered = prev.length >= 4 ? prev.slice(1) : prev;
      return [...filtered, { id, message, emoji, type, duration }];
    });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Set global function for non-React context access if needed
  globalToastFn = addToast;

  const success = useCallback((msg: string, emoji = "✅") => addToast(msg, emoji, "success"), [addToast]);
  const info = useCallback((msg: string, emoji = "ℹ️") => addToast(msg, emoji, "info"), [addToast]);
  const warning = useCallback((msg: string, emoji = "⚠️") => addToast(msg, emoji, "warning"), [addToast]);
  const error = useCallback((msg: string, emoji = "🚨") => addToast(msg, emoji, "error"), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, info, warning, error }}>
      {children}
      {/* Toast Render Container - Bottom Right Floating Bar */}
      <div className="fixed bottom-16 right-4 md:bottom-20 md:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-xl shadow-lg text-xs font-semibold ${
                t.type === "error"
                  ? "bg-rose-900/90 border-rose-700 text-rose-100 dark:bg-rose-950/90"
                  : t.type === "warning"
                  ? "bg-amber-900/90 border-amber-700 text-amber-100 dark:bg-amber-950/90"
                  : t.type === "success"
                  ? "bg-emerald-900/90 border-emerald-700 text-emerald-100 dark:bg-emerald-950/90"
                  : "bg-slate-900/90 dark:bg-slate-950/95 border-slate-700/80 text-slate-100 dark:text-slate-100"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-base shrink-0 leading-none">{t.emoji || "🩺"}</span>
                <span className="truncate">{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0"
                aria-label="Close Toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
