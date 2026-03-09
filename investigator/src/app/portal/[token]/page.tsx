interface PortalPageProps {
  params: Promise<{ token: string }>;
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent font-bold text-bg">
            iG
          </div>
          <h1 className="text-xl font-bold text-text">Client Portal</h1>
          <p className="text-sm text-text-muted mt-1">
            Access your investigation reports and updates
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">
            Portal token: <code className="font-mono text-accent">{token}</code>
          </p>
          <p className="text-sm text-text-muted mt-2">
            Client portal functionality coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
