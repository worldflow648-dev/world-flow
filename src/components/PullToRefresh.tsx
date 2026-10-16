import React, { useState, useRef, useCallback, ReactNode, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

const THRESHOLD = 80;
const MAX_PULL = 120;

export const PullToRefresh = forwardRef<HTMLDivElement, PullToRefreshProps>(
  function PullToRefresh({ 
    onRefresh, 
    children, 
    disabled = false,
    className 
  }, ref) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const isPulling = useRef(false);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      
      // Only start pull if page is at the top (using window scroll)
      if (window.scrollY <= 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    }, [disabled, isRefreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      if (!isPulling.current || disabled || isRefreshing) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      
      // Only prevent default and show pull indicator when:
      // 1. User is pulling DOWN (diff > 0)
      // 2. Page is still at the top
      if (diff > 0 && window.scrollY <= 0) {
        const resistance = Math.min(diff * 0.5, MAX_PULL);
        setPullDistance(resistance);
        
        // Only prevent scroll when actively pulling
        if (resistance > 10) {
          e.preventDefault();
        }
      } else {
        // User scrolling down the page normally - cancel pull gesture
        if (isPulling.current && pullDistance === 0) {
          isPulling.current = false;
        }
      }
    }, [disabled, isRefreshing, pullDistance]);

    const handleTouchEnd = useCallback(async () => {
      if (!isPulling.current || disabled) return;
      
      isPulling.current = false;
      
      if (pullDistance >= THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(60); // Keep spinner visible
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    }, [pullDistance, isRefreshing, disabled, onRefresh]);

    const progress = Math.min(pullDistance / THRESHOLD, 1);
    const shouldTrigger = pullDistance >= THRESHOLD;

    return (
      <div
        ref={containerRef}
        className={cn("relative", className)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull indicator */}
        <div
          className={cn(
            "absolute left-0 right-0 flex items-center justify-center transition-all duration-200 z-10",
            "pointer-events-none"
          )}
          style={{
            height: pullDistance,
            top: 0,
            opacity: progress,
          }}
        >
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              shouldTrigger || isRefreshing
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-secondary text-muted-foreground"
            )}
            style={{
              transform: `rotate(${progress * 360}deg) scale(${0.5 + progress * 0.5})`,
            }}
          >
            <Loader2 
              className={cn(
                "h-5 w-5",
                isRefreshing && "animate-spin"
              )} 
            />
          </div>
        </div>

        {/* Content with transform */}
        <div
          style={{
            transform: `translateY(${pullDistance}px)`,
            transition: isPulling.current ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);
