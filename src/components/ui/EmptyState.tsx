import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5 shadow-sm ring-4 ring-primary/5">
        <Icon size={36} className="text-primary opacity-80" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary px-6 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
