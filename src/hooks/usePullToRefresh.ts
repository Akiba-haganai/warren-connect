import { useEffect, useRef, useCallback } from "react";

interface Options {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: Options) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let indicator: HTMLDivElement | null = null;

    const onTouchStart = (e: TouchEvent) => {
      // Only trigger when at the very top of the scroll
      if (container.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;

      // Create pull indicator
      if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "flex items-center justify-center text-xs font-medium transition-all";
        indicator.style.color = "var(--color-text-muted)";
        indicator.style.height = "0px";
        indicator.style.overflow = "hidden";
        indicator.textContent = "Pull to refresh";
        container.prepend(indicator);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || !indicator) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && container.scrollTop <= 0) {
        const height = Math.min(delta * 0.5, threshold);
        indicator.style.height = `${height}px`;
        if (height >= threshold) {
          indicator.textContent = "Release to refresh";
          indicator.style.color = "var(--color-primary)";
        } else {
          indicator.textContent = "Pull to refresh";
          indicator.style.color = "var(--color-text-muted)";
        }
      }
    };

    const onTouchEnd = async (e: TouchEvent) => {
      if (!pulling.current || !indicator) return;
      pulling.current = false;
      const delta = e.changedTouches[0].clientY - startY.current;
      if (delta >= threshold && container.scrollTop <= 0) {
        indicator.textContent = "Refreshing…";
        indicator.style.height = "40px";
        indicator.style.color = "var(--color-primary)";
        await handleRefresh();
      }
      // Collapse indicator
      indicator.style.height = "0px";
      setTimeout(() => {
        if (indicator) indicator.remove();
        indicator = null;
      }, 300);
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      if (indicator) indicator.remove();
    };
  }, [handleRefresh, threshold]);

  return { containerRef };
}