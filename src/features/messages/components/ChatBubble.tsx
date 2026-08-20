import { Trash2, Check, CheckCheck } from "lucide-react";
import { triggerHaptic } from "@/utils/haptic";

interface Props {
  content?: string;
  isMe?: boolean;
  timestamp?: string;
  onDelete?: () => void | Promise<void>;
  readAt?: string | null;
  isTemp?: boolean;
  attachmentUrl?: string | null;
}

export default function ChatBubble({
  content,
  isMe = false,
  timestamp,
  onDelete,
  readAt,
  isTemp = false,
  attachmentUrl,
}: Props) {
  const statusIcon = isTemp ? (
    <Check size={11} className="opacity-60" />
  ) : readAt ? (
    <CheckCheck size={12} className="text-white drop-shadow-xs" />
  ) : (
    <Check size={12} className="text-white/80" />
  );

  return (
    <div className={`flex w-full ${isMe ? "justify-end pl-10" : "justify-start pr-10"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div 
        className={`relative group flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5 shadow-sm transition-all ${
          isTemp ? "opacity-70 scale-[0.98]" : "scale-100"
        } ${
          isMe 
            ? "bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl rounded-br-sm" 
            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700/50 rounded-2xl rounded-bl-sm"
        }`}
      >
        {attachmentUrl && (
          <div className="overflow-hidden rounded-xl mb-1 border border-black/5 dark:border-white/5">
            <img src={attachmentUrl} alt="Attachment" className="max-w-full max-h-48 object-cover hover:scale-105 transition-transform duration-500 cursor-zoom-in" loading="lazy" />
          </div>
        )}
        
        {content && (
          <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">{content}</p>
        )}
        
        <div className={`flex items-center gap-1.5 mt-0.5 select-none ${isMe ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] font-medium ${isMe ? "text-white/70" : "text-slate-400 dark:text-slate-500"}`}>
            {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
          {isMe && statusIcon}
        </div>

        {onDelete && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              triggerHaptic();
              onDelete(); 
            }}
            className="absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 opacity-0 group-hover:opacity-100 transition-all shadow-xs scale-90 group-hover:scale-100"
            style={{ [isMe ? 'left' : 'right']: '-36px' }}
            aria-label="Delete message"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}