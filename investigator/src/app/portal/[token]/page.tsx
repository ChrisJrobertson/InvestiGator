export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Client Portal</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Token: <span className="mono">{token}</span>
      </p>
    </main>
  );
}
