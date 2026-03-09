import { Users } from "lucide-react";
import Link from "next/link";

interface ClientCardProps {
  id: string;
  name: string;
  email?: string;
  contactPerson?: string;
  caseCount?: number;
}

export function ClientCard({ id, name, email, contactPerson, caseCount }: ClientCardProps) {
  return (
    <Link
      href={`/clients/${id}`}
      className="block rounded-xl border border-border bg-surface p-4 hover:bg-surface-light transition-colors"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-lg bg-accent/10 p-2">
          <Users className="h-4 w-4 text-accent" />
        </div>
        <h3 className="text-sm font-medium text-text">{name}</h3>
      </div>
      {contactPerson && (
        <p className="text-xs text-text-muted mb-1">Contact: {contactPerson}</p>
      )}
      {email && (
        <p className="text-xs text-text-muted mb-1">{email}</p>
      )}
      {caseCount !== undefined && (
        <p className="text-xs text-text-muted">{caseCount} case{caseCount !== 1 ? "s" : ""}</p>
      )}
    </Link>
  );
}
