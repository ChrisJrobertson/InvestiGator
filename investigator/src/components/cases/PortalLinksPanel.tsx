"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { generatePortalLink, revokePortalLink } from "@/lib/actions/portal";
import { formatDate } from "@/lib/utils";
import { Share2, Copy, X, Link2, Eye } from "lucide-react";

interface PortalLink {
  id: string;
  token: string;
  expires_at: string;
  revoked_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
}

interface Props {
  caseId: string;
  links: PortalLink[];
}

export function PortalLinksPanel({ caseId, links }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [newUrl, setNewUrl] = useState<string | null>(null);

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const { url } = await generatePortalLink(caseId, 30);
        setNewUrl(url);
        toast("success", "Portal link created");
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleCopy = (token: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${baseUrl}/portal/${token}`);
    toast("success", "Link copied to clipboard");
  };

  const handleRevoke = (linkId: string) => {
    startTransition(async () => {
      try {
        await revokePortalLink(linkId);
        toast("success", "Link revoked");
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const activeLinks = links.filter((l) => !l.revoked_at && new Date(l.expires_at) > new Date());

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text">Client Portal</h3>
        </div>
        <Button size="sm" variant="secondary" onClick={handleGenerate} loading={isPending}>
          <Link2 className="h-3.5 w-3.5" />
          New Link
        </Button>
      </div>

      {newUrl && (
        <div className="rounded-lg bg-accent/10 border border-accent/30 p-3 mb-3">
          <p className="text-xs text-text-muted mb-1">Share this link with your client:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-accent truncate">{newUrl}</code>
            <button onClick={() => { navigator.clipboard.writeText(newUrl); toast("success", "Copied!"); }} className="text-accent hover:text-accent-dim cursor-pointer">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {activeLinks.length === 0 && !newUrl ? (
        <p className="text-xs text-text-muted text-center py-3">
          No active portal links. Generate one to share with your client.
        </p>
      ) : (
        <div className="space-y-2">
          {activeLinks.map((link) => (
            <div key={link.id} className="flex items-center justify-between rounded-lg bg-surface-light px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <code className="font-mono text-text-muted truncate">...{link.token.slice(-8)}</code>
                  <Badge>Expires {formatDate(link.expires_at)}</Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                  <Eye className="h-3 w-3" />
                  <span>{link.access_count} views</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button onClick={() => handleCopy(link.token)} className="rounded p-1 text-text-muted hover:text-accent cursor-pointer" title="Copy link">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleRevoke(link.id)} className="rounded p-1 text-text-muted hover:text-danger cursor-pointer" title="Revoke">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
