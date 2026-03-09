import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, change, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-muted">{title}</p>
        <div className="rounded-lg bg-accent/10 p-2">
          <Icon className="h-5 w-5 text-accent" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-text font-mono">{value}</p>
      {change && (
        <p className="mt-1 text-xs text-text-muted">{change}</p>
      )}
    </div>
  );
}
