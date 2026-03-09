import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { Briefcase } from "lucide-react";
import Link from "next/link";

interface CaseCardProps {
  id: string;
  ref: string;
  title: string;
  status: string;
  priority: string;
  clientName?: string;
  createdAt: string;
}

const statusVariant = (s: string) => {
  switch (s) {
    case "OPEN": return "accent" as const;
    case "IN_PROGRESS": return "warning" as const;
    case "REVIEW": return "info" as const;
    default: return "default" as const;
  }
};

const priorityVariant = (p: string) => {
  switch (p) {
    case "CRITICAL": return "danger" as const;
    case "HIGH": return "warning" as const;
    default: return "default" as const;
  }
};

export function CaseCard({ id, ref: caseRef, title, status, priority, clientName, createdAt }: CaseCardProps) {
  return (
    <Link
      href={`/cases/${id}`}
      className="block rounded-xl border border-border bg-surface p-4 hover:bg-surface-light transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent" />
          <span className="text-xs font-mono text-accent">{caseRef}</span>
        </div>
        <div className="flex gap-1.5">
          <Badge variant={statusVariant(status)}>{status}</Badge>
          <Badge variant={priorityVariant(priority)}>{priority}</Badge>
        </div>
      </div>
      <h3 className="text-sm font-medium text-text mb-1 line-clamp-2">{title}</h3>
      <div className="flex items-center justify-between text-xs text-text-muted">
        {clientName && <span>{clientName}</span>}
        <span>{formatDate(createdAt)}</span>
      </div>
    </Link>
  );
}
