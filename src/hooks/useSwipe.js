import { useRef, useCallback } from 'react';

const SWIPE_THRESHOLD = 50;

export default function useSwipe(onSwipeLeft, onSwipeRight, threshold = SWIPE_THRESHOLD) {
    const touchStart = useRef(null);
    const touchEnd = useRef(null);

    const handleTouchStart = useCallback((e) => {
        touchEnd.current = null;
        touchStart.current = e.targetTouches[0].clientX;
    }, []);

    const handleTouchMove = useCallback((e) => {
        touchEnd.current = e.targetTouches[0].clientX;
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;
        if (Math.abs(distance) >= threshold) {
            if (distance > 0 && onSwipeLeft) onSwipeLeft();
            if (distance < 0 && onSwipeRight) onSwipeRight();
        }
    }, [onSwipeLeft, onSwipeRight, threshold]);

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };
}
