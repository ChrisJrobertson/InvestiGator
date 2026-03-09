import { getPortalData } from "@/lib/actions/portal";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Shield, FileText, AlertTriangle } from "lucide-react";

interface PortalPageProps {
  params: Promise<{ token: string }>;
}

const severityVariant = (s: string) => {
  switch (s) {
    case "CRITICAL": return "danger" as const;
    case "HIGH": return "warning" as const;
    default: return "default" as const;
  }
};

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params;
  const data = await getPortalData(token);

  if ("error" in data && data.error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h1 className="text-xl font-bold text-text mb-2">Access Denied</h1>
          <p className="text-sm text-text-muted">{data.error}</p>
        </div>
      </div>
    );
  }

  const caseData = data.case as unknown as {
    ref: string; title: string; status: string; description: string | null; opened_at: string;
  };
  const findings = data.findings as unknown as {
    evidence_ref: string; title: string; description: string | null; finding_type: string; severity: string; found_at: string; status: string;
  }[];
  const reports = data.reports as unknown as {
    id: string; title: string; report_type: string; status: string; created_at: string;
  }[];

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-bold text-bg text-sm">iG</div>
            <span className="text-sm font-semibold text-text">{data.orgName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            <span className="text-xs text-text-muted">Secure Client Portal</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Case info */}
        <div className="rounded-xl border border-border bg-surface p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-sm text-accent">{caseData.ref}</span>
            <Badge>{caseData.status}</Badge>
          </div>
          <h1 className="text-xl font-bold text-text mb-1">{caseData.title}</h1>
          {caseData.description && <p className="text-sm text-text-muted">{caseData.description}</p>}
          <p className="text-xs text-text-muted mt-2">Opened: {formatDate(caseData.opened_at)}</p>
        </div>

        {/* Findings */}
        <h2 className="text-lg font-semibold text-text mb-4">Investigation Updates</h2>
        {findings.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8 rounded-xl border border-border bg-surface">
            No updates available yet.
          </p>
        ) : (
          <div className="relative space-y-4 pl-6 mb-8 before:absolute before:left-[9px] before:top-3 before:bottom-3 before:w-0.5 before:bg-accent/30">
            {findings.map((f, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-6 top-4 h-3 w-3 rounded-full border-2 border-bg bg-accent" />
                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-accent">{f.evidence_ref}</span>
                    <Badge>{f.finding_type}</Badge>
                    <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
                  </div>
                  <h3 className="text-sm font-medium text-text mb-1">{f.title}</h3>
                  {f.description && <p className="text-sm text-text-muted">{f.description}</p>}
                  <p className="text-xs text-text-muted mt-2">{formatDateTime(f.found_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reports */}
        {reports.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-text mb-4">Reports</h2>
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-text">{r.title}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">{formatDate(r.created_at)}</p>
                  </div>
                  <Badge variant="accent">{r.status}</Badge>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-text-muted">
            Powered by InvestiGator · This portal link is confidential
          </p>
        </div>
      </div>
    </div>
  );
}
