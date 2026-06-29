import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <button
            aria-label="Close"
            onClick={onCancel}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.35)" }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative w-[calc(100%-2rem)] max-w-md rounded-2xl"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
                  {title}
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  {message}
                </p>
              </div>

              <button
                onClick={onCancel}
                className="p-1 rounded-full"
                aria-label="Close"
                style={{ color: "var(--color-text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-4 py-3 flex items-center gap-2">
              <button
                onClick={onCancel}
                className="btn-ghost flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "var(--color-primary)", color: "var(--color-surface)" }}
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

