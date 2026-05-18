// src/pages/admin/AdminCompanyPage.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Building2, Plus, X, ChevronDown, AlertTriangle, Loader2,
  Check, Search, Trash2, Pencil, CheckCircle2, Phone,
  Mail, Globe, MapPin, Calendar, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { companyMasterService, type Company, type CompanyPayload } from "@/services/companyMaster";
import { useAuth } from "@/contexts/AuthContext";

// ─── Constants ───────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Other",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Shared input class (mirrors Milestones page) ────────────────────────────

const inputCls = [
  "w-full rounded-xl border border-slate-200 dark:border-slate-700",
  "bg-white dark:bg-slate-900 px-4 py-2.5 text-[14px] outline-none",
  "transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600",
  "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15",
].join(" ");

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/50">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ value, label, color, icon }: { value: number; label: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={cn("text-3xl font-black tabular-nums leading-none", color)}>{value}</span>
        <span className="text-muted-foreground/30">{icon}</span>
      </div>
      <span className="text-[12px] font-semibold text-muted-foreground/60">{label}</span>
    </div>
  );
}

// ─── Form types ──────────────────────────────────────────────────────────────

interface CompanyForm {
  company_name: string;
  phone_number: string;
  email: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
}

interface FormErrors {
  company_name?: string;
  phone_number?: string;
  email?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

const EMPTY_FORM: CompanyForm = {
  company_name: "", phone_number: "", email: "", website: "",
  address_line1: "", address_line2: "", city: "", state: "", pincode: "",
};

// ─── Field wrapper ───────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">
        {label}{required && <span className="ml-1 text-indigo-500">*</span>}
      </label>
      {children}
      {error && (
        <span className="flex items-center gap-1.5 text-[12px] text-rose-500">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
        </span>
      )}
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ company, loading, onConfirm, onClose }: {
  company: Company; loading: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
        <div className="p-6">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10">
              <Trash2 className="h-5 w-5 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold">Delete company?</h3>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">"{company.company_name}"</span> will be permanently removed. This action cannot be undone.
          </p>
          <div className="mt-6 flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 text-[14px] font-bold text-white hover:bg-rose-600 disabled:opacity-60 transition-all">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {loading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create / Edit Modal ─────────────────────────────────────────────────────

function CompanyModal({ initial, onSave, onClose }: {
  initial?: Company;
  onSave: (payload: CompanyPayload, id?: number) => Promise<void>;
  onClose: () => void;
}) {
  const isEdit = !!initial;

  const [form, setForm] = useState<CompanyForm>(
    initial
      ? {
          company_name: initial.company_name,
          phone_number: initial.phone_number,
          email: initial.email ?? "",
          website: initial.website ?? "",
          address_line1: initial.address_line1,
          address_line2: initial.address_line2 ?? "",
          city: initial.city,
          state: initial.state,
          pincode: initial.pincode,
        }
      : EMPTY_FORM
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState<string | null>(null);

  const set = (k: keyof CompanyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }));
      setErrors(prev => { const n = { ...prev }; delete n[k as keyof FormErrors]; return n; });
    };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.company_name.trim()) e.company_name = "Company name is required.";
    if (!form.phone_number.trim() || !/^\+?[\d\s\-]{7,15}$/.test(form.phone_number))
      e.phone_number = "Enter a valid phone number.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email.";
    if (!form.address_line1.trim()) e.address_line1 = "Address is required.";
    if (!form.city.trim()) e.city = "City is required.";
    if (!form.state) e.state = "Please select a state.";
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) e.pincode = "Enter a valid 6-digit pincode.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setApiErr(null);
    const payload: CompanyPayload = {
      company_name:  form.company_name.trim(),
      phone_number:  form.phone_number.trim(),
      email:         form.email.trim() || null,
      website:       form.website.trim() || null,
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || null,
      city:          form.city.trim(),
      state:         form.state,
      pincode:       form.pincode.trim(),
    };
    try {
      await onSave(payload, initial?.id);
    } catch (err: any) {
      const msg = err?.data
        ? Object.entries(err.data).map(([k, v]) => `${k}: ${v}`).join(" | ")
        : "Something went wrong.";
      setApiErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-indigo-500">
              {isEdit ? "Edit company" : "New company"}
            </p>
            <h2 className="mt-0.5 text-[18px] font-bold">
              {isEdit ? "Update company" : "Create company"}
            </h2>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-5 p-6">

            {apiErr && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/8 px-4 py-3 text-[13px] text-rose-700 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />{apiErr}
              </div>
            )}

            {/* Basic info */}
            <div className="flex items-center gap-3 pb-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/50">Basic info</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Field label="Company Name" required error={errors.company_name}>
              <input className={cn(inputCls, errors.company_name && "border-rose-300 focus:border-rose-400 focus:ring-rose-400/15")}
                value={form.company_name} onChange={set("company_name")} placeholder="e.g. Acme Corporation" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone Number" required error={errors.phone_number}>
                <input className={cn(inputCls, errors.phone_number && "border-rose-300 focus:border-rose-400 focus:ring-rose-400/15")}
                  type="tel" value={form.phone_number} onChange={set("phone_number")} placeholder="+91 99999 99999" />
              </Field>
              <Field label="Email" error={errors.email}>
                <input className={cn(inputCls, errors.email && "border-rose-300 focus:border-rose-400 focus:ring-rose-400/15")}
                  type="email" value={form.email} onChange={set("email")} placeholder="contact@company.com" />
              </Field>
            </div>

            <Field label="Website">
              <input className={inputCls} type="url" value={form.website} onChange={set("website")} placeholder="https://www.company.com" />
            </Field>

            {/* Address */}
            <div className="flex items-center gap-3 pb-1 pt-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/50">Address</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Field label="Address Line 1" required error={errors.address_line1}>
              <input className={cn(inputCls, errors.address_line1 && "border-rose-300 focus:border-rose-400 focus:ring-rose-400/15")}
                value={form.address_line1} onChange={set("address_line1")} placeholder="Street / Building name" />
            </Field>

            <Field label="Address Line 2">
              <input className={inputCls} value={form.address_line2} onChange={set("address_line2")} placeholder="Area / Landmark (optional)" />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="City" required error={errors.city}>
                <input className={cn(inputCls, errors.city && "border-rose-300 focus:border-rose-400 focus:ring-rose-400/15")}
                  value={form.city} onChange={set("city")} placeholder="City" />
              </Field>

              <Field label="State" required error={errors.state}>
                <div className="relative">
                  <select className={cn(inputCls, "appearance-none pr-9", errors.state && "border-rose-300 focus:border-rose-400 focus:ring-rose-400/15")}
                    value={form.state} onChange={set("state")}>
                    <option value="">Select…</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                </div>
              </Field>

              <Field label="Pincode" required error={errors.pincode}>
                <input className={cn(inputCls, errors.pincode && "border-rose-300 focus:border-rose-400 focus:ring-rose-400/15")}
                  value={form.pincode} maxLength={6} onChange={e => { set("pincode")({ ...e, target: { ...e.target, value: e.target.value.replace(/\D/g, "") } } as any); }}
                  placeholder="600001" />
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-border px-6 py-4">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-2.5 text-[14px] font-semibold text-white hover:from-indigo-600 hover:to-violet-600 disabled:opacity-60 transition-all shadow-sm shadow-indigo-500/20">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save Changes" : "Create Company")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Company Detail slide-in panel ───────────────────────────────────────────

function CompanyDetail({ company, onBack, onEdit, onDelete, canManage }: {
  company: Company;
  onBack: () => void;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
  canManage: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-y-auto bg-background transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
        mounted ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
      style={{ zIndex: 10 }}
    >
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-3">
          <button onClick={onBack}
            className="group flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground">
            <ChevronRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
          {canManage && (
            <div className="flex gap-2">
              <button onClick={() => onEdit(company)}
                className="flex items-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/5 px-4 py-2 text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 transition-all hover:bg-indigo-100 dark:hover:bg-indigo-500/10">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={() => onDelete(company)}
                className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/5 px-4 py-2 text-[13px] font-semibold text-rose-600 dark:text-rose-400 transition-all hover:bg-rose-100 dark:hover:bg-rose-500/10">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="border-b border-border px-6 py-8">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-[.2em] text-muted-foreground/50">Company</p>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-[20px] font-black text-white shadow-lg shadow-indigo-500/25">
            {initials(company.company_name)}
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight leading-tight">{company.company_name}</h2>
            <p className="mt-1 text-[14px] text-muted-foreground">{company.city}, {company.state}</p>
          </div>
        </div>

        {/* Meta chips */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2">
            <Phone className="h-4 w-4 text-muted-foreground/50" />
            <span className="text-[13px] font-semibold">{company.phone_number}</span>
          </div>
          {company.email && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2">
              <Mail className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-[13px] font-semibold">{company.email}</span>
            </div>
          )}
          {company.website && (
            <a href={company.website} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/5 transition-colors">
              <Globe className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400">{company.website.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground/50" />
            <span className="text-[13px] text-muted-foreground">Created</span>
            <span className="text-[13px] font-bold">{fmt(company.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-8 space-y-8">
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/10 to-violet-500/10">
              <MapPin className="h-4 w-4 text-indigo-500" />
            </div>
            <h3 className="text-[17px] font-bold">Address</h3>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
            <p className="text-[14px] font-semibold">{company.address_line1}</p>
            {company.address_line2 && <p className="text-[14px] text-muted-foreground">{company.address_line2}</p>}
            <p className="text-[14px] text-muted-foreground">{company.city}, {company.state} — {company.pincode}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCompanyPage() {
  const { user } = useAuth();
  const isAdmin   = user?.role === "admin";
  const isManager = user?.role === "project_manager";
  const canManage = isAdmin || isManager;

  const [companies, setCompanies]   = useState<Company[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Company | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<Company | null>(null);
  const [deleting, setDeleting]     = useState<Company | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    companyMasterService.list()
      .then(setCompanies)
      .catch(() => setError("Failed to load companies."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = companies.filter(c =>
    [c.company_name, c.city, c.state, c.phone_number, c.email ?? ""]
      .some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async (payload: CompanyPayload, id?: number) => {
    if (id) {
      const updated = await companyMasterService.update(id, payload);
      setCompanies(prev => prev.map(c => c.id === id ? updated : c));
      if (selected?.id === id) setSelected(updated);
      setEditing(null);
    } else {
      await companyMasterService.create(payload);
      setShowCreate(false);
      load();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await companyMasterService.delete(deleting.id);
      setCompanies(prev => prev.filter(c => c.id !== deleting.id));
      if (selected?.id === deleting.id) setSelected(null);
      setDeleting(null);
    } catch {
      setDeleteLoading(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Stats ──
  const total      = companies.length;
  const withEmail  = companies.filter(c => c.email).length;
  const withWebsite = companies.filter(c => c.website).length;

  /* Loading */
  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="h-12 w-12 rounded-full border-2 border-slate-200 dark:border-slate-700" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-500" />
        </div>
        <p className="text-[13px] font-semibold text-muted-foreground/60">Loading companies…</p>
      </div>
    </div>
  );

  /* Error */
  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
          <AlertTriangle className="h-7 w-7 text-rose-500" />
        </div>
        <div>
          <p className="text-[15px] font-bold">{error}</p>
          <button onClick={load}
            className="mt-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-4 py-1.5 text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors">
            Try again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative overflow-hidden">

      {/* ── List view ── */}
      <div className={cn(
        "transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
        selected ? "-translate-x-12 opacity-0 pointer-events-none" : "translate-x-0 opacity-100"
      )}>

        {/* Page header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div>
              <div className="mb-1.5 flex items-center gap-2.5">
                <div className="h-0.5 w-5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                <span className="text-[11px] font-bold uppercase tracking-[.2em] text-indigo-500">
                  Admin · Master Data
                </span>
              </div>
              <h1 className="text-[28px] font-black tracking-tight leading-none">Company Master</h1>
              <p className="mt-1.5 text-[14px] font-medium text-muted-foreground">
                Manage registered companies
              </p>
            </div>

            {canManage && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-indigo-500/25 transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-indigo-500/35 self-start">
                <Plus className="h-4 w-4" /> New Company
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatCard value={total}       label="Total Companies" color="text-foreground"                         icon={<Building2 className="h-5 w-5" />} />
            <StatCard value={withEmail}   label="With Email"      color="text-indigo-600 dark:text-indigo-400"   icon={<Mail className="h-5 w-5 text-indigo-500" />} />
            <StatCard value={withWebsite} label="With Website"    color="text-violet-600 dark:text-violet-400"   icon={<Globe className="h-5 w-5 text-violet-500" />} />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            <input
              ref={searchRef}
              className={cn(inputCls, "pl-11")}
              placeholder="Search by name, city, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-24">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-200/50 dark:border-indigo-500/20">
              <Building2 className="h-8 w-8 text-indigo-400/40" />
            </div>
            <p className="text-[16px] font-bold text-muted-foreground/60">
              {search ? "No companies match your search" : "No companies yet"}
            </p>
            <p className="mt-1.5 text-[14px] text-muted-foreground/40">
              {canManage && !search ? "Create the first company using the button above." : "Try a different search term."}
            </p>
          </div>
        )}

        {/* Company list */}
        {filtered.length > 0 && (
          <div className="space-y-1">
            <Divider label={`${filtered.length} compan${filtered.length !== 1 ? "ies" : "y"}`} />
            <div className="space-y-2 pt-2">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={cn(
                    "group w-full border-l-[3px] border-l-indigo-400 rounded-xl border border-border bg-card text-left transition-all duration-200",
                    "hover:shadow-md hover:-translate-y-px hover:border-slate-200 dark:hover:border-slate-600"
                  )}
                >
                  <div className="flex items-center gap-5 px-5 py-4">
                    {/* Avatar */}
                    <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-200/50 dark:border-indigo-500/20 text-[13px] font-black text-indigo-600 dark:text-indigo-400 sm:flex">
                      {initials(c.company_name)}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 mb-1">
                        <p className="text-[15px] font-bold leading-snug">{c.company_name}</p>
                        <span className="rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                          {c.city}, {c.state}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground/60">
                        <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{c.phone_number}</span>
                        {c.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{c.email}</span>}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="hidden shrink-0 items-center gap-4 md:flex">
                      {c.website && (
                        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-500">
                          <Globe className="h-3.5 w-3.5" />
                          {c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </span>
                      )}
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground/40">Created</p>
                        <p className="mt-0.5 text-[13px] font-bold tabular-nums">{fmt(c.created_at)}</p>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <CompanyDetail
          company={selected}
          onBack={() => setSelected(null)}
          onEdit={(c) => { setEditing(c); }}
          onDelete={(c) => setDeleting(c)}
          canManage={canManage}
        />
      )}

      {/* Create modal */}
      {showCreate && canManage && (
        <CompanyModal onSave={handleSave} onClose={() => setShowCreate(false)} />
      )}

      {/* Edit modal */}
      {editing && canManage && (
        <CompanyModal initial={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}

      {/* Delete modal */}
      {deleting && (
        <DeleteModal
          company={deleting} loading={deleteLoading}
          onConfirm={handleDelete} onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}