import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  options: SelectOption[];
  onChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, icon, disabled, options, onChange, id, ...props }, ref) => {
    const selectId = id || React.useId();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
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
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            onChange={handleChange}
            className={cn(
              "w-full appearance-none bg-white border border-zinc-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-zinc-900",
              "focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10",
              "hover:border-zinc-300",
              "transition-all duration-200",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-50",
              "dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10 dark:hover:border-zinc-600",
              icon && "pl-10",
              error &&
                "border-red-500 focus:border-red-500 focus:ring-red-500/10 hover:border-red-500 dark:border-red-500",
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
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

Select.displayName = "Select";

export { Select };
