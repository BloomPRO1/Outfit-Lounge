"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { register } from "@/lib/auth";

const fieldContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } },
};
const fieldItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

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
      <motion.div variants={fieldContainer} initial="hidden" animate="show">
        <motion.div variants={fieldItem} className="font-serif text-3xl text-ink">
          Create Account
        </motion.div>
        <motion.div variants={fieldItem} className="mt-2 text-sm text-text-muted">
          Already a member?{" "}
          <Link href="/login" className="text-gold-deep hover:text-ink">
            Log in
          </Link>
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <motion.div variants={fieldItem}>
            <div className="mb-1.5 text-xs text-text-body">Full Name</div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded border border-border-light px-3.5 py-3 text-sm transition-colors focus:border-gold focus:outline-none"
            />
          </motion.div>
          <motion.div variants={fieldItem}>
            <div className="mb-1.5 text-xs text-text-body">Email</div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded border border-border-light px-3.5 py-3 text-sm transition-colors focus:border-gold focus:outline-none"
            />
          </motion.div>
          <motion.div variants={fieldItem}>
            <div className="mb-1.5 text-xs text-text-body">Phone</div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94 77 123 4567"
              className="w-full rounded border border-border-light px-3.5 py-3 text-sm transition-colors focus:border-gold focus:outline-none"
            />
          </motion.div>
          <motion.div variants={fieldItem}>
            <div className="mb-1.5 text-xs text-text-body">Password</div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded border border-border-light px-3.5 py-3 text-sm transition-colors focus:border-gold focus:outline-none"
            />
          </motion.div>
          <motion.div variants={fieldItem}>
            <div className="mb-1.5 text-xs text-text-body">Confirm Password</div>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded border border-border-light px-3.5 py-3 text-sm transition-colors focus:border-gold focus:outline-none"
            />
          </motion.div>

          <motion.label
            variants={fieldItem}
            className="flex items-center gap-2 text-[13px] text-text-muted"
          >
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I agree to the Terms &amp; Privacy Policy
          </motion.label>

          {error && <div className="text-[13px] text-red-600">{error}</div>}

          <motion.button
            variants={fieldItem}
            type="submit"
            disabled={submitting}
            className="mt-1.5 cursor-pointer rounded py-3.5 text-sm font-semibold text-white transition-colors bg-ink hover:bg-gold hover:text-ink disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Create Account"}
          </motion.button>
        </form>
      </motion.div>
    </AuthLayout>
  );
}
