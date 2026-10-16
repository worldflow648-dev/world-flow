import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: boolean;
  icon?: React.ReactNode;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, error, success, icon, type, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue);

    const inputId = id || `floating-${label.replace(/\s+/g, "-").toLowerCase()}`;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    const isFloating = isFocused || hasValue;

    return (
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          type={type}
          id={inputId}
          ref={ref}
          className={cn(
            "peer w-full h-14 px-4 pt-5 pb-2 rounded-xl bg-secondary/50 border-2 border-transparent",
            "text-base font-medium text-foreground",
            "placeholder-transparent",
            "transition-all duration-200",
            "focus:outline-none focus:border-primary focus:bg-card",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            icon && "pr-12",
            error && "border-destructive focus:border-destructive animate-shake",
            success && "border-success focus:border-success",
            className
          )}
          placeholder={label}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />

        {/* Floating Label */}
        <label
          htmlFor={inputId}
          className={cn(
            "absolute right-4 transition-all duration-200 pointer-events-none",
            "text-muted-foreground",
            icon && "right-12",
            isFloating
              ? "top-2 text-xs font-medium text-primary"
              : "top-1/2 -translate-y-1/2 text-base"
          )}
        >
          {label}
        </label>

        {/* Status Icons */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          {success && !error && (
            <CheckCircle2 className="w-5 h-5 text-success animate-scale-in" />
          )}
          {error && (
            <AlertCircle className="w-5 h-5 text-destructive animate-scale-in" />
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-1.5 text-xs text-destructive flex items-center gap-1 animate-slide-up">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
