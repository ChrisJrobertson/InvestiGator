"use client";

import { useEffect, useState } from "react";

export function Toast({
  message,
  show,
}: {
  message: string;
  show: boolean;
}) {
  const [visible, setVisible] = useState(show);

  useEffect(() => setVisible(show), [show]);
  if (!visible) return null;

  return (
    <div className="fixed right-4 bottom-4 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] shadow-lg">
      {message}
    </div>
  );
}
