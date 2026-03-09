import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  const styles: Record<Variant, string> = {
    primary:
      "bg-[var(--accent)] text-[#062018] hover:bg-[var(--accent-dim)] font-medium",
    ghost:
      "bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-light)]",
    danger: "bg-[var(--danger)] text-white hover:opacity-90",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
