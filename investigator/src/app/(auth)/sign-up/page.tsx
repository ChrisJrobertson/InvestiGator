"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          company_name: companyName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
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
        <h1 className="mb-2 text-2xl font-semibold">Sign up</h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Create your InvestiGator workspace.
        </p>

        <div className="space-y-4">
          <Input
            placeholder="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            placeholder="Company name"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            required
          />
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
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-[var(--accent)]">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
