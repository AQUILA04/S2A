"use client";

import { useState, useRef, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
    children: ReactNode;
}

export function PullToRefresh({ children }: PullToRefreshProps) {
    const router = useRouter();
    const [startY, setStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const MAX_PULL = 100;
    const THRESHOLD = 60;

    useEffect(() => {
        if (isRefreshing) {
            router.refresh();
            // Provide a minimum visual delay for the refresh animation
            const timer = setTimeout(() => {
                setIsRefreshing(false);
                setPullDistance(0);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isRefreshing, router]);

    const handleTouchStart = (e: React.TouchEvent) => {
        // Only allow pull-to-refresh if we are at the very top of the page
        if (window.scrollY <= 0) {
            setStartY(e.touches[0].clientY);
        } else {
            setStartY(0);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!startY || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const distance = currentY - startY;

        if (distance > 0 && window.scrollY <= 0) {
            // Apply friction to the pull distance
            setPullDistance(Math.min(distance * 0.4, MAX_PULL));
        }
    };

    const handleTouchEnd = () => {
        if (pullDistance > THRESHOLD && !isRefreshing) {
            setIsRefreshing(true);
        } else {
            // Spring back if threshold not met
            setPullDistance(0);
        }
        setStartY(0);
    };

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative min-h-full w-full"
        >
            <div
                className={cn(
                    "absolute top-0 left-0 right-0 flex justify-center items-end py-2 overflow-hidden transition-all duration-200 z-10",
                    isRefreshing ? "h-16" : ""
                )}
                style={{
                    height: isRefreshing ? 60 : pullDistance,
                    opacity: pullDistance > 10 ? Math.min(pullDistance / THRESHOLD, 1) : 0
                }}
            >
                <div className="bg-background border shadow-md rounded-full p-2 text-primary flex items-center justify-center">
                    <Loader2 className={cn("h-5 w-5", isRefreshing ? "animate-spin" : "")}
                        style={{ transform: `rotate(${pullDistance * 2}deg)` }} />
                </div>
            </div>

            <div
                className="transition-transform duration-200"
                style={{ transform: `translateY(${isRefreshing ? 60 : pullDistance}px)` }}
            >
                {children}
            </div>
        </div >
    );
}
