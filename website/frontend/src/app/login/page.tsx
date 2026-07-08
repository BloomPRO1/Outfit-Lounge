"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { login } from "@/lib/auth";
import { adminLogin } from "@/lib/adminAuth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      router.push(searchParams.get("next") || "/");
      router.refresh();
    } catch (customerErr) {
      // Not a customer account (or wrong password) — check whether these are
      // admin credentials before surfacing an error, so admins can log in
      // from the same customer-facing form and land straight on the dashboard.
      try {
        await adminLogin({ email, password });
        router.push("/admin");
        return;
      } catch {
        setError(customerErr instanceof Error ? customerErr.message : "Login failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout quote="&ldquo;Welcome back to the lounge — your next look awaits.&rdquo;">
      <div className="font-serif text-3xl text-ink">Log In</div>
      <div className="mt-2 text-sm text-text-muted">
        New here?{" "}
        <Link href="/register" className="text-gold-deep hover:text-ink">
          Create an account
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-9 flex flex-col gap-4.5">
        <div>
          <div className="mb-1.5 text-xs text-text-body">Email</div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded border border-border-light px-3.5 py-3 text-sm focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <div className="mb-1.5 text-xs text-text-body">Password</div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded border border-border-light px-3.5 py-3 text-sm focus:border-gold focus:outline-none"
          />
        </div>

        {error && <div className="text-[13px] text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1.5 rounded py-3.5 text-sm font-semibold text-white transition-colors bg-ink hover:bg-gold hover:text-ink disabled:opacity-50"
        >
          {submitting ? "Logging in…" : "Log In"}
        </button>
      </form>
    </AuthLayout>
  );
}
