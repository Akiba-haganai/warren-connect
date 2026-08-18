import { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const MAX_PULL = 80;
  const THRESHOLD = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only engage if we are at the very top of the page
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return;
    
    const y = e.touches[0].clientY;
    const distance = Math.max(0, y - startY);
    
    // Dampen the pull effect so it feels like stretching a rubber band
    if (distance > 0 && window.scrollY === 0) {
      const dampened = Math.min(distance * 0.4, MAX_PULL);
      setPullDistance(dampened);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > THRESHOLD && !isRefreshing) {
      // Trigger refresh
      setIsRefreshing(true);
      // Snap to loading position
      setPullDistance(50);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setStartY(0);
      }
    } else {
      // Snap back if threshold not met
      setPullDistance(0);
      setStartY(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-full w-full overflow-hidden"
    >
      {/* The pull indicator that slides down */}
      <div 
        className="absolute top-0 left-0 w-full flex justify-center items-end transition-all duration-200 pointer-events-none z-10"
        style={{ 
          height: pullDistance > 0 ? 60 : 0, 
          opacity: pullDistance / MAX_PULL,
          transform: `translateY(${pullDistance - 60}px)`
        }}
      >
        <div className="bg-surface rounded-full shadow-lg p-2.5 flex items-center justify-center border border-border/50">
          <RefreshCw 
            size={18} 
            className={`text-primary ${isRefreshing ? 'animate-spin' : ''}`} 
            style={{ transform: `rotate(${pullDistance * 4}deg)` }}
          />
        </div>
      </div>

      {/* The main content that gets pushed down */}
      <div 
        className="transition-transform duration-200" 
        style={{ transform: `translateY(${isRefreshing ? 50 : pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
