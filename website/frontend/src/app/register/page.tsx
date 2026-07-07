"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms & Privacy Policy");
      return;
    }

    setSubmitting(true);
    try {
      await register({ name, email, password, phone: phone || undefined });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      imageFirst={false}
      quote="&ldquo;Join the lounge — access every collection, rent or own.&rdquo;"
    >
      <div className="font-serif text-3xl text-ink">Create Account</div>
      <div className="mt-2 text-sm text-text-muted">
        Already a member?{" "}
        <Link href="/login" className="text-gold-deep hover:text-ink">
          Log in
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <div className="mb-1.5 text-xs text-text-body">Full Name</div>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded border border-border-light px-3.5 py-3 text-sm focus:border-gold focus:outline-none"
          />
        </div>
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
          <div className="mb-1.5 text-xs text-text-body">Phone</div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+94 77 123 4567"
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
        <div>
          <div className="mb-1.5 text-xs text-text-body">Confirm Password</div>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded border border-border-light px-3.5 py-3 text-sm focus:border-gold focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-[13px] text-text-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          I agree to the Terms &amp; Privacy Policy
        </label>

        {error && <div className="text-[13px] text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1.5 rounded py-3.5 text-sm font-semibold text-white transition-colors bg-ink hover:bg-gold hover:text-ink disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Create Account"}
        </button>
      </form>
    </AuthLayout>
  );
}
