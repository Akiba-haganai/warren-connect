import { useState, useEffect } from "react";

export function useScrollHeader(threshold: number = 20) {
  const [subHeaderVisible, setSubHeaderVisible] = useState(true);

  useEffect(() => {
    // Detect scroll container (MainLayout div with flex-1 overflow-y-auto) or window
    const getScrollTarget = (): Element | Window => {
      const container = document.querySelector(".flex-1.overflow-y-auto");
      return container || window;
    };

    const target = getScrollTarget();
    let lastScrollY = target instanceof Window ? window.scrollY : target.scrollTop;

    const updateScrollDirection = () => {
      const currentScrollY = target instanceof Window ? window.scrollY : target.scrollTop;

      if (currentScrollY <= threshold) {
        setSubHeaderVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY + 6) {
        // Scrolling down -> hide sub header
        setSubHeaderVisible(false);
      } else if (currentScrollY < lastScrollY - 6) {
        // Scrolling up -> reveal sub header
        setSubHeaderVisible(true);
      }
      lastScrollY = currentScrollY;
    };

    target.addEventListener("scroll", updateScrollDirection, { passive: true });
    return () => target.removeEventListener("scroll", updateScrollDirection);
  }, [threshold]);

  return { subHeaderVisible };
}
