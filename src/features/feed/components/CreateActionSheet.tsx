import { MessageSquarePlus, ShoppingBag, Home, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: "post" | "product" | "accommodation") => void;
}

export default function CreateActionSheet({ isOpen, onClose, onSelectAction }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/70 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Create on PLAWZA
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              What would you like to share today?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Options */}
        <div className="flex flex-col gap-2.5">
          {/* Option 1: Social / Campus Post */}
          <button
            type="button"
            onClick={() => {
              onSelectAction("post");
              onClose();
            }}
            className="w-full p-3.5 rounded-2xl bg-teal-500/10 hover:bg-teal-500/15 border border-teal-500/20 flex items-center gap-3.5 text-left transition-all group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquarePlus size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-teal-800 dark:text-teal-200">
                💬 Post to Campus
              </div>
              <div className="text-[10px] text-teal-700/80 dark:text-teal-300/80 truncate">
                Discussions, questions, lost &amp; found, campus news
              </div>
            </div>
          </button>

          {/* Option 2: Marketplace Item */}
          <button
            type="button"
            onClick={() => {
              onSelectAction("product");
              onClose();
            }}
            className="w-full p-3.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 flex items-center gap-3.5 text-left transition-all group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <ShoppingBag size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-blue-800 dark:text-blue-200">
                🛍️ Sell an Item
              </div>
              <div className="text-[10px] text-blue-700/80 dark:text-blue-300/80 truncate">
                Textbooks, electronics, clothing, stationery
              </div>
            </div>
          </button>

          {/* Option 3: Housing / Accommodation */}
          <button
            type="button"
            onClick={() => {
              onSelectAction("accommodation");
              onClose();
            }}
            className="w-full p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 flex items-center gap-3.5 text-left transition-all group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <Home size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-amber-800 dark:text-amber-200">
                🏠 List Accommodation
              </div>
              <div className="text-[10px] text-amber-700/80 dark:text-amber-300/80 truncate">
                Boarding houses, rooms, shared bedspaces
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
