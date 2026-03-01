import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sundown-gold disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-sundown-gold text-black hover:bg-sundown-gold-hover":
              variant === "primary",
            "bg-sundown-card text-sundown-text hover:bg-sundown-border":
              variant === "secondary",
            "border border-sundown-border bg-transparent hover:bg-sundown-card text-sundown-text":
              variant === "outline",
            "hover:bg-sundown-card text-sundown-text": variant === "ghost",
            "bg-sundown-red text-white hover:bg-red-700": variant === "danger",
            "h-9 px-4 py-2": size === "sm",
            "h-12 px-6 py-3 text-base": size === "md", // Large touch target default
            "h-14 px-8 text-lg": size === "lg",
            "h-12 w-12": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
