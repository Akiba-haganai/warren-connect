import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  onClose: () => void;
}

export default function BottomSheet({ children, onClose }: Props) {
  return (
    <motion.div
      className="fixed inset-0 flex items-end"
      style={{ zIndex: 60 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />
      <motion.div
        className="relative w-full rounded-t-3xl p-5 overflow-y-auto"
        style={{
          background: "var(--color-surface)",
          maxHeight: "85dvh",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full" style={{ background: "var(--color-border)" }} />
        {children}
      </motion.div>
    </motion.div>
  );
}
