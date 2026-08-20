import type { Tables } from "@/types/database/database.types";
import { Trash2 } from "lucide-react";
import { triggerHaptic } from "@/utils/haptic";

type Conversation = Tables<"conversations">;

interface Props {
  conversation?: Conversation;
  currentUserId?: string;
  onClick: () => void | Promise<void>;
  unreadCount?: number;
  otherUserName: string;
  otherUserAvatar: string | null;
  isOnline?: boolean;
  onDelete?: () => void;
}

export default function ConversationItem({
  onClick,
  unreadCount = 0,
  otherUserName,
  otherUserAvatar,
  isOnline,
  onDelete,
}: Props) {
  const initial = otherUserName?.[0]?.toUpperCase() || "?";

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 w-full text-left relative group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
      <button 
        onClick={() => { triggerHaptic(); onClick(); }} 
        className="flex items-center gap-3 flex-1 min-w-0 outline-none"
      >
        <div className="relative shrink-0">
          {otherUserAvatar ? (
            <img src={otherUserAvatar} alt={otherUserName} className="w-12 h-12 rounded-full object-cover shadow-sm ring-1 ring-slate-100 dark:ring-slate-800" />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-[15px] shadow-sm bg-gradient-to-br from-primary to-primary-dark">
              {initial}
            </div>
          )}
          {isOnline && (
            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
          )}
        </div>
        
        <div className="flex-1 min-w-0 text-left">
          <div className="flex justify-between items-center mb-0.5">
            <p className={`text-[15px] font-bold truncate ${unreadCount > 0 ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>
              {otherUserName}
            </p>
          </div>
          <p className={`text-[13px] truncate ${unreadCount > 0 ? "font-semibold text-primary" : "text-slate-500 dark:text-slate-400"}`}>
            Tap to view messages
          </p>
        </div>
        
        {unreadCount > 0 && (
          <div className="shrink-0 ml-2">
            <span className="bg-primary text-white text-[11px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5 shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
        )}
      </button>
      
      {onDelete && (
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            triggerHaptic();
            if (confirm("Delete this conversation?")) onDelete(); 
          }}
          className="shrink-0 p-2.5 rounded-full text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors focus:outline-none"
          aria-label="Delete conversation"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}