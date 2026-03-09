"use client";

interface ReportViewerProps {
  content: string;
  title: string;
}

export function ReportViewer({ content, title }: ReportViewerProps) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
      </div>
      <div className="px-6 py-4 prose prose-invert prose-sm max-w-none">
        <div className="whitespace-pre-wrap text-sm text-text leading-relaxed">
          {content || "No content generated yet."}
        </div>
      </div>
    </div>
  );
}
