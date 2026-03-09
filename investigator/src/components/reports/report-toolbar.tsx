import { Button } from "@/components/ui/button";

export function ReportToolbar() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost">Edit</Button>
      <Button variant="ghost">Approve</Button>
      <Button variant="ghost">Export PDF</Button>
      <Button variant="ghost">Export Word</Button>
      <Button>Regenerate</Button>
    </div>
  );
}
