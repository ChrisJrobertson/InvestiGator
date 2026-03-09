import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

interface FindingCardProps {
  evidenceRef: string;
  title: string;
  findingType: string;
  severity: string;
  status: string;
  foundAt: string;
  foundBy?: string;
}

const severityVariant = (s: string) => {
  switch (s) {
    case "CRITICAL": return "danger" as const;
    case "HIGH": return "warning" as const;
    case "MEDIUM": return "warning" as const;
    case "LOW": return "default" as const;
    default: return "info" as const;
  }
};

export function FindingCard({ evidenceRef, title, findingType, severity, status, foundAt, foundBy }: FindingCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-mono text-accent">{evidenceRef}</span>
        <div className="flex gap-1.5">
          <Badge variant={severityVariant(severity)}>{severity}</Badge>
          <Badge>{status}</Badge>
        </div>
      </div>
      <h3 className="text-sm font-medium text-text mb-1">{title}</h3>
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span>{findingType}</span>
        <span>{formatDateTime(foundAt)}</span>
        {foundBy && <span>by {foundBy}</span>}
      </div>
    </div>
  );
}
