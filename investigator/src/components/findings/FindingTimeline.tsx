import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface TimelineItem {
  id: string;
  evidence_ref: string;
  title: string;
  finding_type: string;
  severity: string;
  found_at: string;
}

interface FindingTimelineProps {
  findings: TimelineItem[];
}

export function FindingTimeline({ findings }: FindingTimelineProps) {
  if (findings.length === 0) {
    return (
      <p className="text-sm text-text-muted py-4 text-center">
        No findings recorded yet.
      </p>
    );
  }

  return (
    <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
      {findings.map((f) => (
        <div key={f.id} className="relative">
          <div className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-accent border-2 border-bg" />
          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-accent">{f.evidence_ref}</span>
              <Badge>{f.finding_type}</Badge>
            </div>
            <p className="text-sm text-text">{f.title}</p>
            <p className="text-xs text-text-muted mt-1">{formatDateTime(f.found_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
