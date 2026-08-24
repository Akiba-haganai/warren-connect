import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { triggerHaptic } from '@/utils/haptic';

interface ImageLightboxProps {
  isOpen: boolean;
  imageUrl: string | null;
  altText?: string;
  onClose: () => void;
}

export default function ImageLightbox({
  isOpen,
  imageUrl,
  altText = 'Image preview',
  onClose,
}: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number }>({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
  });
  const touchStartRef = useRef<{ dist: number; scale: number }>({ dist: 0, scale: 1 });
  const lastTapRef = useRef<number>(0);

  // Lock background scroll on both body and document element
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      const origBodyOverflow = document.body.style.overflow;
      const origDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overflow = origDocOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic();
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic();
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      triggerHaptic();
      if (scale > 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(2.5);
      }
    }
    lastTapRef.current = now;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchStartRef.current = { dist, scale };
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        posX: position.x,
        posY: position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      if (touchStartRef.current.dist > 0) {
        const factor = dist / touchStartRef.current.dist;
        const newScale = Math.max(1, Math.min(touchStartRef.current.scale * factor, 4));
        setScale(newScale);
        if (newScale === 1) setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY * -0.005;
    setScale((prev) => {
      const next = Math.max(1, Math.min(prev + delta, 4));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || !imageUrl) return null;

  return createPortal(
    <div
      className='fixed inset-0 w-screen h-[100dvh] z-[9999] bg-black/95 flex flex-col items-center justify-center select-none animate-in fade-in duration-150 overflow-hidden touch-none'
      onClick={onClose}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
      }}
    >
      {/* Top Header Controls */}
      <div
        className='absolute top-0 left-0 right-0 p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent'
        onClick={(e) => e.stopPropagation()}
      >
        <span className='text-white/80 text-xs font-semibold tracking-wide'>
          {Math.round(scale * 100)}%
        </span>

        <button
          type='button'
          onClick={onClose}
          className='p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all backdrop-blur-md cursor-pointer'
          aria-label='Close image'
        >
          <X size={22} />
        </button>
      </div>

      {/* Centered Image Container - locked to screen borders */}
      <div
        className='relative w-screen h-[100dvh] flex items-center justify-center overflow-hidden p-3'
        onClick={handleDoubleTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        style={{
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          touchAction: 'none',
        }}
      >
        <img
          src={imageUrl}
          alt={altText}
          draggable={false}
          className='max-w-[95vw] max-h-[85dvh] w-auto h-auto object-contain transition-transform duration-75 ease-out rounded-lg shadow-2xl pointer-events-auto'
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            willChange: 'transform',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Floating Bottom Zoom Toolbar */}
      <div
        className='absolute bottom-6 pb-[env(safe-area-inset-bottom)] left-1/2 -translate-x-1/2 flex items-center gap-2 bg-neutral-900/90 border border-white/15 backdrop-blur-md rounded-full px-4 py-2 shadow-2xl z-20'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type='button'
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className='p-2 text-white/90 hover:text-white disabled:text-white/30 active:scale-90 transition-all rounded-full hover:bg-white/10 cursor-pointer'
          aria-label='Zoom out'
        >
          <ZoomOut size={20} />
        </button>

        <button
          type='button'
          onClick={handleReset}
          className='px-2.5 py-1 text-xs font-bold text-white/90 hover:text-white active:scale-90 transition-all rounded-full hover:bg-white/10 flex items-center gap-1 cursor-pointer'
          aria-label='Reset zoom'
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>

        <button
          type='button'
          onClick={handleZoomIn}
          disabled={scale >= 4}
          className='p-2 text-white/90 hover:text-white disabled:text-white/30 active:scale-90 transition-all rounded-full hover:bg-white/10 cursor-pointer'
          aria-label='Zoom in'
        >
          <ZoomIn size={20} />
        </button>
      </div>
    </div>,
    document.body
  );
}
