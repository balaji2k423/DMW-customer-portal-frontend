import { useState, useRef } from "react";
import {
  X, Plus, Paperclip, Loader2, AlertTriangle,
  ChevronDown, Building2, Tag, Flag, FolderOpen, FileText, Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ticketsService } from "@/services/tickets";
import { cn } from "@/lib/utils";

/* ─── Brand tokens ─── */
const BRAND       = "#E8510A";
const BRAND_LIGHT = "#FEF0E9";
const BRAND_MID   = "#F97316";

const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-all placeholder:text-muted-foreground/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15";

function initials(name: string) { return (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2); }
function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
function fileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return <ImageIcon className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />;
  return <FileText className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />;
}

type TicketForm = {
  subject: string;
  description: string;
  priority: string;
  category: string;
  project: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  projects?: { id: number | string; name: string }[];
}

export default function NewTicketModal({ open, onClose, onCreated, projects = [] }: Props) {
  const { user } = useAuth();
  const fileRef  = useRef<HTMLInputElement>(null);

  // Auto-fill customer info from session
  const customerName = user?.full_name ?? user?.name ?? user?.email ?? "";
  const customerOrg  = user?.company ?? user?.organization ?? "";
  const customerRole = user?.role ?? "";

  const [form, setForm] = useState<TicketForm>({
    subject: "", description: "", priority: "medium", category: "", project: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving, setSaving]   = useState(false);
  const [err,    setErr]      = useState<string | null>(null);

  const set = (k: keyof TicketForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setAttachments(prev => [...prev, ...files]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) { setErr("Subject is required."); return; }
    if (!form.project)        { setErr("Please select a project."); return; }
    setSaving(true); setErr(null);
    try {
      const ticket = await ticketsService.create({
        subject:     form.subject.trim(),
        description: form.description.trim(),
        priority:    form.priority,
        category:    form.category || undefined,
        project:     Number(form.project),
      });

      // Upload attachments after ticket created
      for (const file of attachments) {
        await ticketsService.uploadAttachment(ticket.id, file).catch(() => {});
      }

      onCreated();
    } catch {
      setErr("Failed to raise ticket. Please try again.");
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Accent bar */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${BRAND}, ${BRAND_MID})` }} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em]" style={{ color: BRAND }}>Support</p>
            <h2 className="mt-0.5 text-[18px] font-bold">Raise a Ticket</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 max-h-[80vh] overflow-y-auto">
          {err && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-[13px] text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
            </div>
          )}

          {/* ── Auto customer field (read-only, taken from session) ── */}
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">
              Customer
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: BRAND }}>
                {initials(customerName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold truncate">{customerName || "—"}</p>
                {customerOrg && <p className="text-[11px] text-muted-foreground/55 truncate">{customerOrg}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground/40" />
                <span className="text-[11px] font-semibold text-muted-foreground/40 rounded-lg border border-border bg-background px-2 py-0.5">
                  Auto-filled
                </span>
              </div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">
              Subject *
            </label>
            <input
              className={inputCls}
              required
              value={form.subject}
              onChange={set("subject")}
              placeholder="e.g. Robot arm calibration issue on Line 3"
            />
          </div>

          {/* Priority + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">
                Priority
              </label>
              <div className="relative">
                <Flag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                <select className={cn(inputCls, "appearance-none pl-10 pr-10")} value={form.priority} onChange={set("priority")}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">
                Category
              </label>
              <div className="relative">
                <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                <select className={cn(inputCls, "appearance-none pl-10 pr-10")} value={form.category} onChange={set("category")}>
                  <option value="">Select…</option>
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                  <option value="network">Network</option>
                  <option value="training">Training</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">
              Project {projects.length === 0 && <span className="text-rose-500 normal-case font-normal tracking-normal">— no projects available</span>}
            </label>
            <div className="relative">
              <FolderOpen className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <select
                required
                className={cn(inputCls, "appearance-none pl-10 pr-10", projects.length === 0 && "opacity-50 cursor-not-allowed")}
                value={form.project}
                onChange={set("project")}
                disabled={projects.length === 0}
              >
                <option value="">Select a project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">
              Description
            </label>
            <textarea
              className={`${inputCls} h-28 resize-none`}
              value={form.description}
              onChange={set("description")}
              placeholder="Describe the issue in detail — steps to reproduce, error messages, impacted equipment…"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">
              Attachments
            </label>

            {/* File list */}
            {attachments.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {attachments.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                      {fileIcon(f.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[13px] font-semibold">{f.name}</p>
                      <p className="text-[11px] text-muted-foreground/45">{fileSize(f.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground/30 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-[13px] font-semibold text-muted-foreground transition-all hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 hover:text-orange-600"
            >
              <Paperclip className="h-4 w-4" />
              {attachments.length > 0 ? "Add more files" : "Attach files (optional)"}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90"
              style={{ background: BRAND }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Raising…" : "Raise Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}