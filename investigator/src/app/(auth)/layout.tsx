export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent font-bold text-bg text-xl">
            iG
          </div>
          <h1 className="text-2xl font-bold text-text">InvestiGator</h1>
          <p className="text-sm text-text-muted mt-1">Investigation Case Management</p>
        </div>
        {children}
      </div>
    </div>
  );
}
