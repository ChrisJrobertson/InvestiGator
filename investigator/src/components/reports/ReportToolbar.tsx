"use client";

import { Button } from "@/components/ui/Button";
import { FileText, Download, Sparkles } from "lucide-react";

interface ReportToolbarProps {
  onGenerateAI?: () => void;
  onExportPDF?: () => void;
  onExportDOCX?: () => void;
  generating?: boolean;
}

export function ReportToolbar({ onGenerateAI, onExportPDF, onExportDOCX, generating }: ReportToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {onGenerateAI && (
        <Button onClick={onGenerateAI} loading={generating} variant="primary" size="sm">
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
      )}
      {onExportPDF && (
        <Button onClick={onExportPDF} variant="secondary" size="sm">
          <FileText className="h-4 w-4" />
          Export PDF
        </Button>
      )}
      {onExportDOCX && (
        <Button onClick={onExportDOCX} variant="secondary" size="sm">
          <Download className="h-4 w-4" />
          Export DOCX
        </Button>
      )}
    </div>
  );
}
