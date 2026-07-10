import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  onChange?: (value: string) => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, disabled, onChange, type = "text", id, ...props }, ref) => {
    const inputId = id || React.useId();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block text-sm font-medium text-zinc-700 transition-colors dark:text-zinc-300",
              disabled && "text-zinc-400 dark:text-zinc-600"
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            onChange={handleChange}
            className={cn(
              "w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400",
              "focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10",
              "hover:border-zinc-300",
              "transition-all duration-200",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-50",
              "dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10 dark:hover:border-zinc-600",
              icon && "pl-10",
              error &&
                "border-red-500 focus:border-red-500 focus:ring-red-500/10 hover:border-red-500 dark:border-red-500",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-1 animate-[fadeIn_0.2s_ease-out]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
