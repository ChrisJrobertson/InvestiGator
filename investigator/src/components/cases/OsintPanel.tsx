"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ExternalLink, Search, Globe } from "lucide-react";

const OSINT_TOOLS = [
  { name: "Companies House", url: "https://find-and-update.company-information.service.gov.uk/search?q={q}", icon: "🏛️" },
  { name: "Land Registry", url: "https://search-property-information.service.gov.uk/", icon: "🏠" },
  { name: "Electoral Roll", url: "https://www.192.com/", icon: "📋" },
  { name: "Court Records", url: "https://www.courtserve.net/", icon: "⚖️" },
  { name: "Gazette", url: "https://www.thegazette.co.uk/", icon: "📰" },
  { name: "LinkedIn", url: "https://www.linkedin.com/search/results/people/?keywords={q}", icon: "💼" },
  { name: "Facebook", url: "https://www.facebook.com/search/people/?q={q}", icon: "📘" },
  { name: "Google", url: "https://www.google.co.uk/search?q={q}", icon: "🔍" },
];

interface OsintPanelProps {
  defaultSearch: string;
  onQuickCapture?: (source: string) => void;
}

export function OsintPanel({ defaultSearch, onQuickCapture }: OsintPanelProps) {
  const [searchTerm, setSearchTerm] = useState(defaultSearch);

  const openTool = (tool: typeof OSINT_TOOLS[0]) => {
    const url = tool.url.replace("{q}", encodeURIComponent(searchTerm));
    window.open(url, "_blank");
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text">OSINT Tools</h3>
      </div>
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search term..."
            className="w-full rounded-lg border border-border bg-bg pl-9 pr-3 py-1.5 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {OSINT_TOOLS.map((tool) => (
          <div key={tool.name} className="flex items-center gap-1">
            <button
              onClick={() => openTool(tool)}
              className="flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-light transition-colors cursor-pointer text-left"
            >
              <span>{tool.icon}</span>
              <span className="truncate">{tool.name}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
            </button>
            {onQuickCapture && (
              <button
                onClick={() => onQuickCapture(tool.name)}
                className="rounded px-1.5 py-1 text-[10px] text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                title="Quick capture finding"
              >
                +EV
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
