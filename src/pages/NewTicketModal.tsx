/**
 * NewTicketModal.tsx
 *
 * Step 1 → pick Customer  (GET /projects/customers/)
 * Step 2 → pick Project   (GET /projects/?customer=<id>)
 * Step 3 → fill details   (POST /tickets/)
 */

import { useState, useEffect, useCallback } from "react";
import {
  X, ChevronDown, Loader2, AlertTriangle,
  Tag, Flag, AlignLeft, Building2, FolderKanban,
  TicketIcon, CheckCircle2, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { ticketsService } from "@/services/tickets";
import { useToast } from "@/hooks/use-toast";

/* ─── Types ──────────────────────────────────────────────────────────────────── */
interface Customer { id: number; full_name: string; email: string; }
interface Project   { id: number; name: string; }
interface Props     { open: boolean; onClose: () => void; onCreated: () => void; }

/* ─── Static options ─────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { value: "technical",    label: "Technical" },
  { value: "commercial",   label: "Commercial" },
  { value: "installation", label: "Installation" },
  { value: "training",     label: "Training" },
  { value: "other",        label: "Other" },
];

const PRIORITIES: { value: string; label: string; dot: string; active: string }[] = [
  { value: "low",      label: "Low",      dot: "bg-zinc-400",   active: "border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300" },
  { value: "medium",   label: "Medium",   dot: "bg-amber-400",  active: "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { value: "high",     label: "High",     dot: "bg-orange-500", active: "border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  { value: "critical", label: "Critical", dot: "bg-rose-500",   active: "border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400" },
];

/* ─── Tiny sub-components ────────────────────────────────────────────────────── */
function FieldLabel({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground/55">
      {children}{req && <span className="ml-0.5 text-rose-500">*</span>}
    </p>
  );
}

function SelectBox({
  value, onChange, disabled, placeholder, loading, children,
}: {
  value: string | number; onChange: (v: string) => void;
  disabled?: boolean; placeholder?: string; loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || loading}
        className={cn(
          "w-full appearance-none rounded-xl border border-border bg-background",
          "px-4 py-2.5 pr-9 text-[13.5px] font-medium outline-none transition-all",
          "focus:border-orange-400/70 focus:ring-2 focus:ring-orange-400/10",
          "disabled:cursor-not-allowed disabled:opacity-45",
          !value && "text-muted-foreground/35",
        )}
      >
        {placeholder && <option value="" disabled hidden>{placeholder}</option>}
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40">
        {loading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <ChevronDown className="h-3.5 w-3.5" />}
      </span>
    </div>
  );
}

function StepBadge({ n, done, active }: { n: number; done: boolean; active: boolean }) {
  return (
    <div className={cn(
      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black transition-all duration-300",
      done   ? "bg-emerald-500 text-white shadow shadow-emerald-500/25"
             : active
               ? "bg-orange-500 text-white shadow shadow-orange-500/30"
               : "border border-border bg-muted/60 text-muted-foreground/35",
    )}>
      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-4 py-2.5">
      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
      <span className="text-[13px] font-semibold text-rose-600 dark:text-rose-400">{msg}</span>
    </div>
  );
}

/* ─── Main modal ─────────────────────────────────────────────────────────────── */
export default function NewTicketModal({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();

  const [customers,   setCustomers]   = useState<Customer[]>([]);
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [loadingC,    setLoadingC]    = useState(false);
  const [loadingP,    setLoadingP]    = useState(false);
  const [errC,        setErrC]        = useState(false);
  const [errP,        setErrP]        = useState(false);

  const [customerId,  setCustomerId]  = useState("");
  const [projectId,   setProjectId]   = useState("");
  const [subject,     setSubject]     = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState("technical");
  const [priority,    setPriority]    = useState("medium");
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  /* load customers when modal opens */
  useEffect(() => {
    if (!open) return;
    setCustomers([]); setProjects([]);
    setCustomerId(""); setProjectId("");
    setSubject(""); setDescription("");
    setCategory("technical"); setPriority("medium");
    setSubmitted(false); setErrC(false); setErrP(false);

    setLoadingC(true);
    api.get("/projects/customers/")
      .then(r => setCustomers(r.data?.results ?? r.data ?? []))
      .catch(() => setErrC(true))
      .finally(() => setLoadingC(false));
  }, [open]);

  /* load projects filtered by customer */
  const handleCustomerChange = useCallback((cid: string) => {
    setCustomerId(cid);
    setProjectId("");
    setProjects([]);
    if (!cid) return;
    setLoadingP(true);
    setErrP(false);
    api.get("/projects/", { params: { customer: cid } })
      .then(r => setProjects(r.data?.results ?? r.data ?? []))
      .catch(() => setErrP(true))
      .finally(() => setLoadingP(false));
  }, []);

  const handleSubmit = async () => {
    if (!projectId || !subject.trim()) return;
    setSubmitting(true);
    try {
      await ticketsService.create({
        project: Number(projectId),
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
      });
      setSubmitted(true);
      toast({ title: "Ticket raised successfully" });
      setTimeout(onCreated, 1400);
    } catch {
      toast({ title: "Failed to create ticket", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const s1Done  = !!customerId;
  const s2Done  = !!projectId;
  const canSend = s2Done && subject.trim().length >= 3;
  const selCust = customers.find(c => String(c.id) === customerId);
  const selProj = projects.find(p => String(p.id) === projectId);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn(
        "font-mono relative flex w-full max-w-2xl flex-col overflow-hidden",
        "rounded-t-2xl sm:rounded-2xl border border-border bg-background shadow-2xl",
        "max-h-[94dvh]",
      )}>

        {/* top accent */}
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

        {/* header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10">
            <TicketIcon className="h-4 w-4 text-orange-500" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-black leading-tight">Raise a Support Ticket</h2>
            <p className="mt-0.5 text-[12px] font-medium text-muted-foreground/50 truncate">
              Engineering team responds within your SLA window.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground/40 transition-all hover:bg-muted/50 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* step bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/20 px-5 py-2.5">
          <StepBadge n={1} done={s1Done} active={!s1Done} />
          <div className={cn("h-px flex-1 transition-all duration-500", s1Done ? "bg-orange-400/50" : "bg-border")} />
          <StepBadge n={2} done={s2Done} active={s1Done && !s2Done} />
          <div className={cn("h-px flex-1 transition-all duration-500", s2Done ? "bg-orange-400/50" : "bg-border")} />
          <StepBadge n={3} done={submitted} active={s2Done && !submitted} />
          <p className="ml-3 w-36 shrink-0 text-[11px] font-bold tracking-wide text-muted-foreground/50">
            {!s1Done ? "Select customer" : !s2Done ? "Select project" : submitted ? "Ticket raised!" : "Fill in details"}
          </p>
        </div>

        {/* ── Success state ── */}
        {submitted ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 py-20">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
              </div>
              <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                <span className="text-[9px] font-black text-white">✓</span>
              </div>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-[20px] font-black">Ticket submitted!</p>
              <p className="text-[13px] text-muted-foreground/55">We'll be in touch within your SLA window.</p>
            </div>
          </div>
        ) : (

        /* ── Form body ── */
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 p-5">

            {/* Block 1: Customer & Project */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                <Building2 className="h-3.5 w-3.5 text-orange-500/70" strokeWidth={1.75} />
                <span className="text-[10.5px] font-bold uppercase tracking-[.16em] text-muted-foreground/55">
                  Customer &amp; Project
                </span>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2">

                {/* Customer */}
                <div>
                  <FieldLabel req>
                    <Users className="inline h-3 w-3 mr-1 -mt-px opacity-60" />Customer
                  </FieldLabel>
                  {errC
                    ? <ErrBox msg="Failed to load customers" />
                    : (
                      <SelectBox
                        value={customerId}
                        onChange={handleCustomerChange}
                        placeholder="— Select customer —"
                        loading={loadingC}
                      >
                        {customers.map(c => (
                          <option key={c.id} value={String(c.id)}>{c.full_name}</option>
                        ))}
                      </SelectBox>
                    )
                  }
                  {selCust && (
                    <p className="mt-1.5 truncate pl-1 text-[11px] font-medium text-muted-foreground/45">
                      {selCust.email}
                    </p>
                  )}
                </div>

                {/* Project */}
                <div>
                  <FieldLabel req>
                    <FolderKanban className="inline h-3 w-3 mr-1 -mt-px opacity-60" />Project
                  </FieldLabel>
                  {errP
                    ? <ErrBox msg="Failed to load projects" />
                    : (
                      <SelectBox
                        value={projectId}
                        onChange={setProjectId}
                        placeholder={
                          !customerId              ? "— Select a customer first —"
                          : loadingP               ? "Loading…"
                          : projects.length === 0  ? "— No projects found —"
                          : "— Select project —"
                        }
                        disabled={!customerId || (projects.length === 0 && !loadingP)}
                        loading={loadingP}
                      >
                        {projects.map(p => (
                          <option key={p.id} value={String(p.id)}>{p.name}</option>
                        ))}
                      </SelectBox>
                    )
                  }
                  {selProj && (
                    <p className="mt-1.5 flex items-center gap-1.5 pl-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {selProj.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Block 2: Details (locked until project selected) */}
            <div className={cn(
              "overflow-hidden rounded-xl border border-border bg-card transition-opacity duration-300",
              !s2Done && "pointer-events-none select-none opacity-35",
            )}>
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                <AlignLeft className="h-3.5 w-3.5 text-orange-500/70" strokeWidth={1.75} />
                <span className="text-[10.5px] font-bold uppercase tracking-[.16em] text-muted-foreground/55">
                  Ticket Details
                </span>
                {!s2Done && (
                  <span className="ml-auto text-[10px] font-semibold text-muted-foreground/35">
                    Complete steps 1 &amp; 2 first
                  </span>
                )}
              </div>

              <div className="space-y-4 p-4">

                {/* Subject */}
                <div>
                  <FieldLabel req>Subject</FieldLabel>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Brief one-line description of the issue…"
                    maxLength={255}
                    className={cn(
                      "w-full rounded-xl border border-border bg-background",
                      "px-4 py-2.5 text-[13.5px] font-medium outline-none transition-all",
                      "placeholder:text-muted-foreground/30",
                      "focus:border-orange-400/70 focus:ring-2 focus:ring-orange-400/10",
                    )}
                  />
                  <div className="mt-1 flex items-center justify-between px-0.5">
                    {subject.trim().length > 0 && subject.trim().length < 3 && (
                      <p className="text-[11px] font-semibold text-rose-500">Minimum 3 characters</p>
                    )}
                    <p className={cn(
                      "ml-auto text-[11px] tabular-nums text-muted-foreground/30",
                      subject.length > 230 && "text-rose-400",
                    )}>
                      {subject.length}/255
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Steps to reproduce · expected vs actual behaviour · any error messages…"
                    rows={4}
                    className={cn(
                      "w-full resize-none rounded-xl border border-border bg-background",
                      "px-4 py-2.5 text-[13.5px] font-medium leading-relaxed outline-none transition-all",
                      "placeholder:text-muted-foreground/30",
                      "focus:border-orange-400/70 focus:ring-2 focus:ring-orange-400/10",
                    )}
                  />
                </div>

                {/* Category + Priority */}
                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <FieldLabel>
                      <Tag className="inline h-3 w-3 mr-1 -mt-px opacity-60" />Category
                    </FieldLabel>
                    <SelectBox value={category} onChange={setCategory}>
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </SelectBox>
                  </div>

                  <div>
                    <FieldLabel>
                      <Flag className="inline h-3 w-3 mr-1 -mt-px opacity-60" />Priority
                    </FieldLabel>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PRIORITIES.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPriority(p.value)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-xl border py-2 text-[10px] font-bold uppercase tracking-wide transition-all",
                            priority === p.value
                              ? p.active
                              : "border-border bg-background text-muted-foreground/40 hover:bg-muted/40 hover:text-foreground",
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
        )}

        {/* footer */}
        {!submitted && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3.5">
            <p className="hidden text-[11.5px] font-medium text-muted-foreground/40 sm:block">
              <span className="text-rose-500">*</span> Required
            </p>
            <div className="ml-auto flex items-center gap-2.5">
              <button
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2 text-[13px] font-bold text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSend || submitting}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold text-white transition-all",
                  canSend && !submitting
                    ? "bg-orange-500 shadow-sm shadow-orange-500/25 hover:bg-orange-600"
                    : "cursor-not-allowed bg-muted/60 text-muted-foreground/35",
                )}
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Raising…" : "Raise Ticket"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}