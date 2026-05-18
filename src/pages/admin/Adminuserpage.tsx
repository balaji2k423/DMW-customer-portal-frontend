// src/pages/admin/AdminUsersPage.tsx
//
// Changes vs previous version:
//  • `company` field is now a <select> dropdown (mandatory) instead of a free-text input.
//  • Dropdown options are fetched from /company/companies/ via useCompanies().
//  • Form validation: company is required — cannot submit without selecting one.
//  • Displays city + state next to each company name for easy identification.
//  • Loading / error states are handled gracefully in the dropdown.

import { useState } from "react";
import {
  Users, Plus, Pencil, Trash2, X, Search,
  AlertTriangle, Loader2, Shield, Building2,
  Phone, Mail, ChevronDown, CheckCircle2, UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useCompanies,
  type Company,
} from "@/hooks/UseAdminUsers";

// ─── Types ────────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "admin",            label: "Admin",            color: "text-rose-600    bg-rose-50    border-rose-200    dark:bg-rose-500/10    dark:border-rose-500/25    dark:text-rose-400"    },
  { value: "project_manager",  label: "Project Manager",  color: "text-violet-600  bg-violet-50  border-violet-200  dark:bg-violet-500/10  dark:border-violet-500/25  dark:text-violet-400"  },
  { value: "customer_admin",   label: "Customer Admin",   color: "text-indigo-600  bg-indigo-50  border-indigo-200  dark:bg-indigo-500/10  dark:border-indigo-500/25  dark:text-indigo-400"  },
  { value: "customer_user",    label: "Customer User",    color: "text-sky-600     bg-sky-50     border-sky-200     dark:bg-sky-500/10     dark:border-sky-500/25     dark:text-sky-400"     },
  { value: "guest",            label: "Guest",            color: "text-slate-600   bg-slate-100  border-slate-200   dark:bg-slate-700      dark:border-slate-600      dark:text-slate-300"   },
];

function roleMeta(value: string) {
  return ROLES.find(r => r.value === value) ?? ROLES[4];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function avatarColor(email: string) {
  const palette = [
    "from-indigo-500 to-violet-500",
    "from-sky-500 to-indigo-500",
    "from-orange-400 to-rose-500",
    "from-emerald-500 to-teal-500",
    "from-violet-500 to-fuchsia-500",
    "from-amber-400 to-orange-500",
  ];
  let hash = 0;
  for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return palette[Math.abs(hash) % palette.length];
}

// ─── Shared input class ───────────────────────────────────────────────────────

const inputCls = [
  "w-full rounded-xl border border-slate-200 dark:border-slate-700",
  "bg-white dark:bg-slate-900 px-4 py-2.5 text-[14px] outline-none",
  "transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600",
  "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15",
].join(" ");

const selectCls = [
  "w-full rounded-xl border border-slate-200 dark:border-slate-700",
  "bg-white dark:bg-slate-900 px-4 py-2.5 text-[14px] outline-none",
  "transition-all appearance-none cursor-pointer",
  "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15",
].join(" ");

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">
        {label}
        {required && <span className="ml-1 text-indigo-500">*</span>}
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

// ─── Company Dropdown ─────────────────────────────────────────────────────────

function CompanySelect({
  value,
  onChange,
  error,
  companies,
  isLoading,
  isError,
}: {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  companies: Company[];
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <Field label="Company" required error={error}>
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
        <select
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={isLoading || isError}
          className={cn(
            selectCls,
            "pl-10 pr-9",
            error && "border-rose-400 focus:border-rose-400 focus:ring-rose-400/15",
            (isLoading || isError) && "opacity-60 cursor-not-allowed",
          )}
        >
          {isLoading && <option value="">Loading companies…</option>}
          {isError  && <option value="">Failed to load companies</option>}
          {!isLoading && !isError && (
            <>
              <option value="">Select a company…</option>
              {companies.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.company_name}
                  {c.city  ? ` — ${c.city}` : ""}
                  {c.state ? `, ${c.state}` : ""}
                </option>
              ))}
            </>
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
      </div>
      {isError && (
        <span className="text-[12px] text-amber-600 dark:text-amber-400">
          Could not load company list. Please refresh the page.
        </span>
      )}
    </Field>
  );
}

// ─── User Form types ──────────────────────────────────────────────────────────

interface UserForm {
  email:      string;
  first_name: string;
  last_name:  string;
  role:       string;
  company:    string;   // stores company ID as string from the select
  phone:      string;
  password:   string;
  is_active:  boolean;
}

interface FormErrors {
  email?:      string;
  first_name?: string;
  last_name?:  string;
  role?:       string;
  company?:    string;
  password?:   string;
}

const EMPTY_FORM: UserForm = {
  email: "", first_name: "", last_name: "",
  role: "customer_user", company: "", phone: "",
  password: "", is_active: true,
};

function validate(form: UserForm, isEdit: boolean): FormErrors {
  const e: FormErrors = {};
  if (!form.email.trim())      e.email      = "Email is required";
  else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
  if (!form.first_name.trim()) e.first_name = "First name is required";
  if (!form.last_name.trim())  e.last_name  = "Last name is required";
  if (!form.role)              e.role       = "Role is required";
  if (!form.company)           e.company    = "Company is required";   // ← mandatory
  if (!isEdit && !form.password) {
    // password optional on edit (blank = keep existing), but show hint
  }
  if (form.password && form.password.length < 8) {
    e.password = "Password must be at least 8 characters";
  }
  return e;
}

// ─── User Modal ───────────────────────────────────────────────────────────────

function UserModal({
  initial,
  companies,
  companiesLoading,
  companiesError,
  onSave,
  onClose,
}: {
  initial?: any;
  companies: Company[];
  companiesLoading: boolean;
  companiesError: boolean;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const isEdit = !!initial;

  // When editing, `initial.company` might be a name string (from the list endpoint).
  // We resolve it to an ID for the dropdown.
  const resolveCompanyId = (): string => {
    if (!initial?.company) return "";
    // If already an integer ID stored as string
    if (!isNaN(Number(initial.company))) return String(initial.company);
    // If it's a company_name string, find matching company
    const match = companies.find(
      c => c.company_name.toLowerCase() === String(initial.company).toLowerCase()
    );
    return match ? String(match.id) : "";
  };

  const [form, setForm] = useState<UserForm>(
    initial
      ? {
          email:      initial.email      ?? "",
          first_name: initial.first_name ?? "",
          last_name:  initial.last_name  ?? "",
          role:       initial.role       ?? "customer_user",
          company:    resolveCompanyId(),
          phone:      initial.phone      ?? "",
          password:   "",
          is_active:  initial.is_active  ?? true,
        }
      : EMPTY_FORM
  );

  const [errors,  setErrors]  = useState<FormErrors>({});
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key: keyof UserForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const val = e.target.type === "checkbox"
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSubmit = async () => {
    const errs = validate(form, isEdit);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      // Find the company_name for the selected company ID
      const selectedCompany = companies.find(c => String(c.id) === form.company);
      const payload: any = {
        email:      form.email.trim(),
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        role:       form.role,
        // Send company_name string (matching CustomUser.company CharField on backend)
        company:    selectedCompany?.company_name ?? form.company,
        phone:      form.phone.trim(),
        is_active:  form.is_active,
      };
      if (form.password) payload.password = form.password;

      await onSave(payload);
      setSuccess(true);
      setTimeout(onClose, 800);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
              {isEdit
                ? <Pencil className="h-4 w-4 text-indigo-500" />
                : <Plus   className="h-4 w-4 text-indigo-500" />
              }
            </div>
            <h2 className="text-[15px] font-bold">
              {isEdit ? "Edit User" : "Create New User"}
            </h2>
          </div>
          <button onClick={onClose} disabled={saving}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required error={errors.first_name}>
              <input
                className={cn(inputCls, errors.first_name && "border-rose-400")}
                placeholder="Jane"
                value={form.first_name}
                onChange={set("first_name")}
              />
            </Field>
            <Field label="Last Name" required error={errors.last_name}>
              <input
                className={cn(inputCls, errors.last_name && "border-rose-400")}
                placeholder="Doe"
                value={form.last_name}
                onChange={set("last_name")}
              />
            </Field>
          </div>

          {/* Email */}
          <Field label="Email" required error={errors.email}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <input
                type="email"
                className={cn(inputCls, "pl-10", errors.email && "border-rose-400")}
                placeholder="jane@company.com"
                value={form.email}
                onChange={set("email")}
              />
            </div>
          </Field>

          {/* Role */}
          <Field label="Role" required error={errors.role}>
            <div className="relative">
              <Shield className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <select
                value={form.role}
                onChange={set("role")}
                className={cn(selectCls, "pl-10 pr-9", errors.role && "border-rose-400")}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            </div>
          </Field>

          {/* ── Company (mandatory dropdown) ─────────────────────────────── */}
          <CompanySelect
            value={form.company}
            onChange={val => {
              setForm(f => ({ ...f, company: val }));
              if (errors.company) setErrors(p => ({ ...p, company: undefined }));
            }}
            error={errors.company}
            companies={companies}
            isLoading={companiesLoading}
            isError={companiesError}
          />

          {/* Phone */}
          <Field label="Phone">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <input
                className={cn(inputCls, "pl-10")}
                placeholder="+91 99999 00000"
                value={form.phone}
                onChange={set("phone")}
              />
            </div>
          </Field>

          {/* Password */}
          <Field
            label={isEdit ? "New Password (leave blank to keep current)" : "Password"}
            error={errors.password}
          >
            <input
              type="password"
              className={cn(inputCls, errors.password && "border-rose-400")}
              placeholder={isEdit ? "••••••••" : "Min. 8 characters"}
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
            />
          </Field>

          {/* Active toggle (edit only) */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2.5">
                {form.is_active
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  : <UserX        className="h-4 w-4 text-rose-500"    />
                }
                <span className="text-[14px] font-medium">
                  {form.is_active ? "Account is active" : "Account is deactivated"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors duration-200",
                  form.is_active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200",
                  form.is_active ? "left-5" : "left-0.5"
                )} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex gap-3 border-t border-border bg-card px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || success || companiesLoading}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold text-white transition-all",
              success
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-sm shadow-indigo-500/25",
              (saving || companiesLoading) && "opacity-70 cursor-not-allowed"
            )}
          >
            {success ? (
              <><CheckCircle2 className="h-4 w-4" /> Saved!</>
            ) : saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              isEdit ? "Save Changes" : "Create User"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteModal({
  user, loading, onConfirm, onClose,
}: {
  user: any; loading: boolean; onConfirm: () => void; onClose: () => void;
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
            <h3 className="text-lg font-bold">Delete user?</h3>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">
              "{user.first_name} {user.last_name}"
            </span>{" "}
            will be permanently removed. This action cannot be undone.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose} disabled={loading}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm} disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 text-[14px] font-bold text-white hover:bg-rose-600 disabled:opacity-60 transition-all"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                : <><Trash2  className="h-4 w-4" /> Delete</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onEdit,
  onDelete,
}: {
  user: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = roleMeta(user.role);

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:shadow-sm hover:-translate-y-px">

      {/* Avatar */}
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[13px] font-black text-white",
        avatarColor(user.email)
      )}>
        {initials(user.first_name, user.last_name)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <p className="text-[14px] font-bold leading-tight">
            {user.first_name} {user.last_name}
          </p>
          <span className={cn(
            "rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
            meta.color
          )}>
            {meta.label}
          </span>
          {!user.is_active && (
            <span className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              Inactive
            </span>
          )}
        </div>
        <p className="text-[12px] text-muted-foreground truncate">{user.email}</p>
        {user.company && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground/60">
            <Building2 className="h-3 w-3" />{user.company}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { data: users = [],    isLoading: usersLoading } = useUsers();
  const {
    data:    companies  = [],
    isLoading: companiesLoading,
    isError:   companiesError,
  } = useCompanies();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [search,    setSearch]    = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modal,     setModal]     = useState<null | "create" | any>(null);
  const [deleting,  setDeleting]  = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = (users as any[]).filter(u => {
    const text = `${u.first_name} ${u.last_name} ${u.email} ${u.company ?? ""}`.toLowerCase();
    const matchSearch = !search || text.includes(search.toLowerCase());
    const matchRole   = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleSave = async (payload: any) => {
    if (modal === "create") {
      await createUser.mutateAsync(payload);
    } else {
      await updateUser.mutateAsync({ id: modal.id, ...payload });
    }
    setModal(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteUser.mutateAsync(deleting.id);
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <div className="h-0.5 w-5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
            <span className="text-[11px] font-bold uppercase tracking-[.2em] text-indigo-500">
              Admin · User Management
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none">Users</h1>
          <p className="mt-1.5 text-[14px] font-medium text-muted-foreground">
            {usersLoading ? "Loading…" : `${users.length} registered user${users.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <button
          onClick={() => setModal("create")}
          className="flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-indigo-500/25 transition-all hover:from-indigo-600 hover:to-violet-600"
        >
          <Plus className="h-4 w-4" /> New User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, company…"
            className={cn(inputCls, "pl-11")}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative sm:w-48">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className={cn(selectCls, "pr-9")}
          >
            <option value="">All roles</option>
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
        </div>
      </div>

      {/* List */}
      {usersLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-3" />Loading users…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-24">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-200/50 dark:border-indigo-500/20">
            <Users className="h-8 w-8 text-indigo-400/40" />
          </div>
          <p className="text-[16px] font-bold text-muted-foreground/60">
            {search || roleFilter ? "No users match your filters" : "No users yet"}
          </p>
          <p className="mt-1.5 text-[14px] text-muted-foreground/40">
            {!search && !roleFilter && "Create the first user using the button above."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u: any) => (
            <UserRow
              key={u.id}
              user={u}
              onEdit={() => setModal(u)}
              onDelete={() => setDeleting(u)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modal !== null && (
        <UserModal
          initial={modal === "create" ? undefined : modal}
          companies={companies}
          companiesLoading={companiesLoading}
          companiesError={companiesError}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete modal */}
      {deleting && (
        <DeleteModal
          user={deleting}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}