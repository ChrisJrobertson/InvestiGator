interface HeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{title}</h1>
        {description && (
          <div className="text-sm text-text-muted mt-0.5">{description}</div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 mt-3 sm:mt-0">{actions}</div>}
    </div>
  );
}
