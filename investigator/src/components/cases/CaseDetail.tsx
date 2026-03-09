"use client";

import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

interface CaseDetailProps {
  caseData: {
    ref: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    opened_at: string;
    due_date?: string;
    tags: string[];
  };
}

export function CaseDetail({ caseData }: CaseDetailProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-accent text-sm">{caseData.ref}</span>
        <Badge>{caseData.status}</Badge>
        <Badge>{caseData.priority}</Badge>
      </div>
      <h2 className="text-xl font-bold text-text">{caseData.title}</h2>
      {caseData.description && (
        <p className="text-sm text-text-muted">{caseData.description}</p>
      )}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-text-muted">Opened</span>
          <p className="text-text">{formatDate(caseData.opened_at)}</p>
        </div>
        {caseData.due_date && (
          <div>
            <span className="text-text-muted">Due</span>
            <p className="text-text">{formatDate(caseData.due_date)}</p>
          </div>
        )}
      </div>
      {caseData.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {caseData.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
