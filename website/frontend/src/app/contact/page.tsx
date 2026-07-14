"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { submitContactForm } from "@/lib/api";

const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const textItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await submitContactForm(form);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      {/* hero — signature motif: a breathing gold glow, distinct from Shop/Rent's shimmer beams */}
      <div className="relative flex h-[46vh] min-h-90 items-center justify-center overflow-hidden bg-[#f5f1e6] text-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="h-125 w-125 rounded-full animate-[pulseGlow_5s_ease-in-out_infinite]"
            style={{ background: "radial-gradient(circle, rgba(217,176,84,0.28), transparent 65%)" }}
          />
        </div>
        <motion.div
          className="relative z-10 px-6"
          variants={textContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={textItem}
            className="flex items-center justify-center text-[13px] tracking-[5px] text-gold-deep"
          >
            <span className="mr-3 inline-block h-px w-8 bg-gold-deep" />
            GET IN TOUCH
            <span className="ml-3 inline-block h-px w-8 bg-gold-deep" />
          </motion.div>
          <motion.div
            variants={textItem}
            className="mt-3.5 font-serif text-4xl leading-tight text-ink sm:text-5xl"
          >
            We&apos;d Love To Hear From You
          </motion.div>
          <motion.div variants={textItem} className="mx-auto mt-3.5 max-w-125 text-[15px] text-text-muted">
            Questions about a rental, a custom fit, or an order — reach out and our team will get
            back to you.
          </motion.div>
        </motion.div>
      </div>

      {/* form + info */}
      <div className="flex-1 px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 md:grid-cols-[1.3fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            {status === "success" ? (
              <div className="rounded-md border border-border-light p-8 text-center">
                <div className="font-serif text-2xl text-ink">Message Sent</div>
                <div className="mt-2 text-sm text-text-muted">
                  Thank you for reaching out — we&apos;ll be in touch shortly.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 text-xs text-text-body">Full Name</div>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                      className="w-full rounded border border-border-light px-3.5 py-3 text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-xs text-text-body">Email</div>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full rounded border border-border-light px-3.5 py-3 text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 text-xs text-text-body">Phone (optional)</div>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="071 234 5678"
                      className="w-full rounded border border-border-light px-3.5 py-3 text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-xs text-text-body">Subject (optional)</div>
                    <input
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="What's this about?"
                      className="w-full rounded border border-border-light px-3.5 py-3 text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-xs text-text-body">Message</div>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us how we can help"
                    className="w-full rounded border border-border-light px-3.5 py-3 text-sm focus:border-gold focus:outline-none"
                  />
                </div>
                {status === "error" && error && <div className="text-[13px] text-red-600">{error}</div>}
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="mt-1.5 cursor-pointer self-start rounded-sm bg-ink px-8 py-3.5 text-sm font-semibold tracking-wide text-cream transition-colors hover:bg-ink-soft disabled:opacity-50"
                >
                  {status === "submitting" ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="rounded-md border border-border-light bg-[#f9f7f1] p-8"
          >
            <div className="text-[13px] tracking-[4px] text-gold-deep">VISIT THE LOUNGE</div>
            <div className="mt-4 space-y-5 text-sm text-text-body">
              <div>
                <div className="font-semibold text-ink">Address</div>
                <div className="mt-1 text-text-muted">6, 02 Station Rd, Homagama 10200</div>
              </div>
              <div>
                <div className="font-semibold text-ink">Phone</div>
                <div className="mt-1 text-text-muted">071 785 1180</div>
              </div>
              <div>
                <div className="font-semibold text-ink">Hours</div>
                <div className="mt-1 text-text-muted">9:00 AM – 7:00 PM, daily</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
