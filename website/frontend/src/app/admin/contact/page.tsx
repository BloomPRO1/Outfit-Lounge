"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  ContactSubmission,
  fetchAdminContactSubmissions,
  markContactSubmissionRead,
  deleteContactSubmission,
} from "@/lib/adminData";

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminContactPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetchAdminContactSubmissions()
      .then(setSubmissions)
      .catch(() => setError("Could not load contact messages"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggleRead(id: string) {
    const updated = await markContactSubmissionRead(id);
    setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    await deleteContactSubmission(id);
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  const unreadCount = submissions.filter((s) => s.status === "new").length;

  return (
    <AdminLayout>
      <div className="font-serif text-3xl text-ink">Contact Messages</div>
      <div className="mt-1 text-sm text-text-muted">
        {submissions.length} total{unreadCount > 0 ? ` — ${unreadCount} unread` : ""}, from the
        public Contact Us form.
      </div>

      {error && <div className="mt-6 text-sm text-red-600">{error}</div>}
      {loading && <div className="mt-10 text-center text-sm text-text-faint">Loading…</div>}

      {!loading && !error && submissions.length === 0 && (
        <div className="mt-10 text-center text-sm text-text-faint">No messages yet.</div>
      )}

      {!loading && !error && submissions.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-md border border-border-light bg-white">
          <table className="w-full min-w-220 text-sm">
            <thead>
              <tr className="border-b border-border-light bg-cream-soft text-left text-[12px] tracking-wide text-text-body">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-b border-border-light last:border-0 align-top">
                  <td className="px-4 py-3 font-semibold text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-text-body">
                    <div>{s.email}</div>
                    {s.phone && <div className="text-[12px] text-text-faint">{s.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-text-body">{s.subject || "—"}</td>
                  <td className="px-4 py-3 max-w-80 text-text-body">
                    <div className="line-clamp-3" title={s.message}>
                      {s.message}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2.5 py-1 text-[11px] capitalize " +
                        (s.status === "new"
                          ? "bg-gold-pale text-ink"
                          : "bg-cream-soft text-text-body")
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-text-faint">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 text-[12px]">
                      <button
                        onClick={() => handleToggleRead(s.id)}
                        className="cursor-pointer text-gold-deep hover:text-ink"
                      >
                        Mark {s.status === "new" ? "Read" : "Unread"}
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="cursor-pointer text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
