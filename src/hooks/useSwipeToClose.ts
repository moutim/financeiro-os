import { TouchEvent, useState, useRef } from 'react';

export function useSwipeToClose(onClose: () => void) {
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const [translateY, setTranslateY] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartY.current = e.targetTouches[0].clientY;
    setHasInteracted(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchCurrentY.current = e.targetTouches[0].clientY;
    const deltaY = touchCurrentY.current - touchStartY.current;
    
    // Only allow swiping down
    if (deltaY > 0) {
      setTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    const deltaY = touchCurrentY.current - touchStartY.current;
    
    if (deltaY > 80) {
      // Swiped down enough to close
      onClose();
    }
    
    // Reset
    setTranslateY(0);
    touchStartY.current = 0;
    touchCurrentY.current = 0;
  };

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    style: {
      transform: translateY > 0 ? `translateY(${translateY}px)` : undefined,
      transition: translateY === 0 ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
      animation: hasInteracted ? 'none' : undefined,
    }
  };
}
