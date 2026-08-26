"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast, ToastItem } from "@/context/ToastContext";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  const getColors = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-600 border-green-700 text-white";
      case "error":
        return "bg-red-600 border-red-700 text-white";
      case "warning":
        return "bg-amber-500 border-amber-600 text-black";
      case "info":
      default:
        return "bg-primary border-primary-container text-white";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return "check_circle";
      case "error":
        return "error";
      case "warning":
        return "warning";
      case "info":
      default:
        return "info";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${getColors(
              toast.type
            )}`}
            role="alert"
            aria-live="polite"
          >
            <span className="material-symbols-outlined mt-0.5">{getIcon(toast.type)}</span>
            <div className="flex-grow text-base font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-70 hover:opacity-100 p-0.5 cursor-pointer rounded-full"
              aria-label="Dismiss notification"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
