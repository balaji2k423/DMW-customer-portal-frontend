/**
 * NewTicketModal.tsx
 *
 * "Raise New Ticket" modal for customers.
 *  - Fetches only the projects that belong to the logged-in customer
 *  - Image  ≤ 2 MB  (jpeg / png / gif / webp)
 *  - Video  ≤ 10 MB (mp4 / webm / mov)
 *  - Admin / project_manager roles cannot open this modal at all
 *    (the "Raise new ticket" button is hidden in Tickets.tsx for those roles)
 */

import { useState, useRef, useEffect } from "react";
import {
  X, Plus, Paperclip, Loader2, AlertTriangle,
  ChevronDown, Image, Film, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ticketsService } from "@/services/tickets";
import { useAdminProjects } from "@/hooks/UseAdminProjects";  // ← real hook
import { notificationsService } from "@/services/notifications"; // ← real service
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface AttachedFile {
  file: File;
  kind: "image" | "video" | "other";
  preview?: string;         // object-URL for images
  error?: string;           // validation message
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;   // called after a ticket is successfully created
}

/* ── Constants ─────────────────────────────────────────────────────────────── */
const IMAGE_MAX  = 2  * 1024 * 1024;   // 2 MB
const VIDEO_MAX  = 10 * 1024 * 1024;   // 10 MB

const CATEGORIES = [
  { value: "technical",    label: "Technical" },
  { value: "commercial",   label: "Commercial" },
  { value: "installation", label: "Installation" },
  { value: "training",     label: "Training" },
  { value: "other",        label: "Other" },
];

const PRIORITIES = [
  { value: "low",      label: "Low",      color: "text-zinc-500" },
  { value: "medium",   label: "Medium",   color: "text-amber-600" },
  { value: "high",     label: "High",     color: "text-orange-600" },
  { value: "critical", label: "Critical", color: "text-rose-600" },
];

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function fileKind(f: File): "image" | "video" | "other" {
  if (f.type.startsWith("image/")) return "image";
  if (f.type.startsWith("video/")) return "video";
  return "other";
}

function validateFile(f: File): string | undefined {
  const kind = fileKind(f);
  if (kind === "image" && f.size > IMAGE_MAX) return `Images must be ≤ 2 MB (this file is ${(f.size / 1048576).toFixed(1)} MB)`;
  if (kind === "video" && f.size > VIDEO_MAX) return `Videos must be ≤ 10 MB (this file is ${(f.size / 1048576).toFixed(1)} MB)`;
  return undefined;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────────── */
export default function NewTicketModal({ open, onClose, onCreated }: Props) {
  const { user }  = useAuth();
  const { toast } = useToast();
  const fileRef    = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  /* ── Form state ── */
  const [subject,     setSubject]     = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState("technical");
  const [priority,    setPriority]    = useState("medium");
  const [projectId,   setProjectId]   = useState<number | "">("");
  const [files,       setFiles]       = useState<AttachedFile[]>([]);
  const [submitting,  setSubmitting]  = useState(false);

  /* ── Projects via React Query (replaces manual useEffect + fetch) ── */
  const { data: projects = [], isLoading: loadingProjects } = useAdminProjects();

  /* ── Close on overlay click ── */
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  /* ── Close on Escape ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* ── Reset on close ── */
  useEffect(() => {
    if (!open) {
      setSubject(""); setDescription(""); setCategory("technical");
      setPriority("medium"); setProjectId(""); setFiles([]);
    }
  }, [open]);

  /* ── File picker ── */
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    const newEntries: AttachedFile[] = picked.map(f => {
      const kind    = fileKind(f);
      const error   = validateFile(f);
      const preview = (kind === "image" && !error) ? URL.createObjectURL(f) : undefined;
      return { file: f, kind, preview, error };
    });
    setFiles(prev => [...prev, ...newEntries]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles(prev => {
      const copy = [...prev];
      if (copy[idx].preview) URL.revokeObjectURL(copy[idx].preview!);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const hasInvalidFiles = files.some(f => !!f.error);

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!subject.trim() || !projectId) return;
    if (hasInvalidFiles) return;

    setSubmitting(true);
    try {
      // 1. Create ticket
      const ticket = await ticketsService.create({
        project:     projectId as number,
        subject:     subject.trim(),
        description: description.trim(),
        category,
        priority,
      });

      // 2. Upload valid attachments sequentially
      const validFiles = files.filter(f => !f.error);
      for (const af of validFiles) {
        try {
          await ticketsService.uploadAttachment(ticket.id, af.file);
        } catch {
          toast({ title: `Failed to upload ${af.file.name}`, variant: "destructive" });
        }
      }

      // 3. Notify admins / project managers (best-effort)
      //    notificationsService has no `send()` — backend fires Django signals
      //    automatically on ticket creation, so no client call is needed here.

      toast({ title: "Ticket raised successfully", description: ticket.ticket_id });
      onCreated?.();
      onClose();
    } catch (err: any) {
      toast({
        title:       "Failed to raise ticket",
        description: err?.message ?? "Please try again.",
        variant:     "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  /* ─────────────────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center font-mono"
    >
      <div className="relative w-full max-w-2xl max-h-[95dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-background shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6 py-4">
          <div>
            <div className="mb-0.5 flex items-center gap-2">
              <div className="h-0.5 w-4 bg-orange-500" />
              <span className="text-[10px] font-bold uppercase tracking-[.2em] text-orange-500">Engineering Support</span>
            </div>
            <h2 className="text-[18px] font-black tracking-tight leading-none">Raise New Ticket</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="space-y-5 px-6 py-5">

          {/* Project selector */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/60">
              Project <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={projectId}
                onChange={e => setProjectId(Number(e.target.value))}
                disabled={loadingProjects}
                className={cn(
                  "w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-[14px] font-medium outline-none",
                  "focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10 transition-all",
                  "disabled:opacity-50",
                  !projectId && "text-muted-foreground/40"
                )}
              >
                <option value="" disabled>
                  {loadingProjects ? "Loading projects…" : "Select a project"}
                </option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            </div>
            {projects.length === 0 && !loadingProjects && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                You are not assigned to any projects yet.
              </p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/60">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              maxLength={255}
              placeholder="Brief, clear description of the issue…"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] font-medium placeholder:text-muted-foreground/30 outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/60">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explain the issue in detail — steps to reproduce, expected vs. actual behaviour…"
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-[14px] font-medium placeholder:text-muted-foreground/30 outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10 transition-all"
            />
          </div>

          {/* Category + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/60">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-[14px] font-medium outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10 transition-all"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/60">
                Priority
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-[14px] font-medium outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10 transition-all"
                >
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/60">
              Attachments
            </label>

            {/* Upload hint */}
            <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/50">
              <span className="flex items-center gap-1"><Image className="h-3 w-3" /> Images up to 2 MB</span>
              <span className="flex items-center gap-1"><Film className="h-3 w-3" /> Videos up to 10 MB</span>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mb-3 space-y-2">
                {files.map((af, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3",
                      af.error
                        ? "border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10"
                        : "border-border bg-card"
                    )}
                  >
                    {/* Thumbnail or icon */}
                    {af.preview ? (
                      <img src={af.preview} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                        {af.kind === "video"
                          ? <Film className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                          : <Paperclip className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                        }
                      </div>
                    )}

                    {/* Name + size / error */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "truncate text-[13px] font-semibold",
                        af.error && "text-rose-600 dark:text-rose-400"
                      )}>
                        {af.file.name}
                      </p>
                      {af.error
                        ? <p className="mt-0.5 text-[11px] font-medium text-rose-500">{af.error}</p>
                        : <p className="mt-0.5 text-[11px] text-muted-foreground/50">{fmtSize(af.file.size)}</p>
                      }
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFile(idx)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pick button */}
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={handleFilePick}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-[13px] font-semibold text-muted-foreground hover:border-orange-400/50 hover:bg-orange-500/5 hover:text-orange-600 transition-all w-full justify-center"
            >
              <Paperclip className="h-4 w-4" />
              Attach image / video / file
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-background/95 backdrop-blur px-6 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-border px-5 py-2.5 text-[14px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !subject.trim() || !projectId || hasInvalidFiles}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-[14px] font-bold text-white shadow-sm shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
            ) : (
              <><Plus className="h-4 w-4" /> Raise Ticket</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}