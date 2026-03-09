"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h1 className="mb-2 text-2xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Access your InvestiGator dashboard.
        </p>

        <div className="space-y-4">
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}

        <Button type="submit" className="mt-6 w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Need an account?{" "}
          <Link href="/sign-up" className="text-[var(--accent)]">
            Sign up
          </Link>
        </p>
      </form>
    </main>
  );
}
