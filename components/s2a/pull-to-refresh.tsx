"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
    children: ReactNode;
}

export function PullToRefresh({ children }: PullToRefreshProps) {
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [{ y }, api] = useSpring(() => ({ y: 0 }));

    const MAX_PULL = 100;
    const THRESHOLD = 60;

    useEffect(() => {
        if (isRefreshing) {
            router.refresh();
            const timer = setTimeout(() => {
                setIsRefreshing(false);
                api.start({ y: 0 });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isRefreshing, router, api]);

    const bind = useDrag(
        ({ movement: [, my], down, cancel }) => {
            if (isRefreshing) return;
            // Only trigger if at the very top of the page
            if (window.scrollY > 0) {
                if (down) cancel();
                return;
            }

            if (down) {
                // Apply friction to the pull distance and prevent pushing up (negative y)
                const pull = Math.min(Math.max(0, my * 0.4), MAX_PULL);
                api.start({ y: pull, immediate: true });
            } else {
                if (my * 0.4 > THRESHOLD) {
                    setIsRefreshing(true);
                    api.start({ y: 60 });
                } else {
                    api.start({ y: 0 });
                }
            }
        },
        { axis: "y" }
    );

    return (
        <div {...bind()} className="relative min-h-full w-full touch-pan-x touch-pan-down">
            <animated.div
                className="absolute top-0 left-0 right-0 flex justify-center items-end py-2 overflow-hidden z-10"
                style={{
                    height: y,
                    opacity: y.to((v) => (v > 10 ? Math.min(v / THRESHOLD, 1) : 0)),
                }}
            >
                <div className="bg-background border shadow-md rounded-full p-2 text-primary flex items-center justify-center">
                    <animated.div style={{ transform: y.to((v) => `rotate(${v * 2}deg)`) }}>
                        <Loader2 className={cn("h-5 w-5", isRefreshing ? "animate-spin" : "")} />
                    </animated.div>
                </div>
            </animated.div>

            <animated.div style={{ y }}>
                {children}
            </animated.div>
        </div>
    );
}
