import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, icon, rightIcon, ...props }, ref) => {
        return (
            <div className="relative flex items-center">
                {icon && (
                    <span className="absolute left-3 text-muted-foreground">{icon}</span>
                )}
                <input
                    type={type}
                    className={cn(
                        "flex h-12 w-full rounded-lg border border-input bg-background py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        icon ? "pl-10 pr-4" : "px-4",
                        rightIcon ? "pr-10" : "",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {rightIcon && (
                    <span className="absolute right-3 text-muted-foreground">{rightIcon}</span>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
