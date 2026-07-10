import * as React from "react";
import { Loader2 } from "@/components/MathIcon";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      icon,
      iconPosition = "left",
      disabled,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

    const variants = {
      primary:
        "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 hover:-translate-y-0.5 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:focus:ring-zinc-100/30",
      secondary:
        "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
      outline:
        "border border-zinc-300 bg-transparent text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800",
      ghost:
        "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
      danger:
        "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:-translate-y-0.5 focus:ring-red-500/40 dark:bg-red-700 dark:hover:bg-red-600",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-5 py-2.5 text-sm gap-2",
      lg: "px-7 py-3 text-base gap-2.5",
    };

    const spinnerSizes = {
      sm: 14,
      md: 16,
      lg: 18,
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        disabled={disabled || loading}
        onClick={onClick}
        {...props}
      >
        {loading && (
          <Loader2
            size={spinnerSizes[size]}
            className={cn("shrink-0", iconPosition === "right" && "order-last")}
          />
        )}
        {!loading && icon && iconPosition === "left" && (
          <span className="flex-shrink-0">{icon}</span>
        )}
        <span>{children}</span>
        {!loading && icon && iconPosition === "right" && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
