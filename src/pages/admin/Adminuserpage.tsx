// src/pages/admin/AdminUsersPage.tsx

import { useState } from "react";
import {
  Users, Plus, Pencil, Trash2, X, Search,
  AlertTriangle, Loader2, Shield, Building2,
  Phone, Mail, ChevronDown, CheckCircle2, UserX,
  KeyRound, LayoutDashboard, Ticket, Milestone,
  Check, ChevronRight, Eye, TrendingUp, Wifi,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useCompanies,
  useGuestPermissions,
  useSaveGuestPermissions,
  useCustomersByCompany,
  type Company,
  type GuestModule,
  type GuestPermissionPayload,
} from "@/hooks/UseAdminUsers";

// ─── Brand tokens (mirrors Dashboard) ────────────────────────────────────────
const BRAND       = "#E8510A";
const BRAND_LIGHT = "#FEF0E9";

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = [
  { value: "admin",           label: "Admin",           color: "text-rose-600   bg-rose-50    border-rose-200   dark:bg-rose-500/10   dark:border-rose-500/25   dark:text-rose-400"   },
  { value: "project_manager", label: "Project Manager", color: "text-violet-600 bg-violet-50  border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/25 dark:text-violet-400" },
  { value: "customer_admin",  label: "Customer Admin",  color: "text-indigo-600 bg-indigo-50  border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/25 dark:text-indigo-400" },
  { value: "customer_user",   label: "Customer User",   color: "text-sky-600    bg-sky-50     border-sky-200    dark:bg-sky-500/10    dark:border-sky-500/25    dark:text-sky-400"    },
  { value: "guest",           label: "Guest",           color: "text-slate-600  bg-slate-100  border-slate-200  dark:bg-slate-700     dark:border-slate-600     dark:text-slate-300"  },
];

const MODULES: { value: GuestModule; label: string; Icon: React.ElementType; desc: string }[] = [
  { value: "dashboard",  label: "Dashboard",      Icon: LayoutDashboard, desc: "Overview & analytics" },
  { value: "tickets",    label: "Support Tickets", Icon: Ticket,          desc: "Issue tracker"        },
  { value: "milestones", label: "Milestones",      Icon: Milestone,       desc: "Project milestones"   },
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

// ─── Shared field classes ─────────────────────────────────────────────────────
const inputCls = [
  "w-full rounded-xl border border-border",
  "bg-background px-4 py-2.5 text-[14px] outline-none",
  "transition-all placeholder:text-muted-foreground/40",
  "focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15",
].join(" ");

const selectCls = [
  "w-full rounded-xl border border-border",
  "bg-background px-4 py-2.5 text-[14px] outline-none",
  "transition-all appearance-none cursor-pointer",
  "focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15",
].join(" ");

// ─── KPI Stat Card ────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, iconBg,
}: {
  label: string; value: string; sub: string;
  icon: React.ElementType; iconBg: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
        style={{ background: iconBg }}>
        <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight mt-0.5 tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
      </div>
    </div>
  );
}

// ─── Field Wrapper ────────────────────────────────────────────────────────────
function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground/60">
        {label}{required && <span className="ml-1" style={{ color: BRAND }}>*</span>}
      </label>
      {children}
      {error && (
        <span className="flex items-center gap-1.5 text-[12px] text-red-500">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
        </span>
      )}
    </div>
  );
}

// ─── Company Dropdown ─────────────────────────────────────────────────────────
function CompanySelect({
  value, onChange, error, companies, isLoading, isError,
}: {
  value: string; onChange: (val: string) => void; error?: string;
  companies: Company[]; isLoading: boolean; isError: boolean;
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
            selectCls, "pl-10 pr-9",
            error && "border-red-400 focus:border-red-400 focus:ring-red-400/15",
            (isLoading || isError) && "opacity-60 cursor-not-allowed",
          )}
        >
          {isLoading && <option value="">Loading companies…</option>}
          {isError   && <option value="">Failed to load</option>}
          {!isLoading && !isError && (
            <>
              <option value="">Select a company…</option>
              {companies.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.company_name}{c.city ? ` — ${c.city}` : ""}{c.state ? `, ${c.state}` : ""}
                </option>
              ))}
            </>
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
      </div>
    </Field>
  );
}

// ─── Guest Permissions Modal ──────────────────────────────────────────────────
function GuestPermissionsModal({
  user, companies, companiesLoading, companiesError, onClose,
}: {
  user: any; companies: Company[]; companiesLoading: boolean;
  companiesError: boolean; onClose: () => void;
}) {
  const { data: existingPerms = [], isLoading: permsLoading } = useGuestPermissions(user.id);
  const savePerms = useSaveGuestPermissions();

  const [selectedModules, setSelectedModules] = useState<Set<GuestModule>>(
    () => new Set(existingPerms.map(p => p.module as GuestModule))
  );
  const [companyId, setCompanyId]           = useState<string>("");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(
    () => new Set(existingPerms.map(p => p.customer_id).filter(Boolean) as number[])
  );
  const [step, setStep]     = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]   = useState<string>("");

  const parsedCompanyId = companyId ? Number(companyId) : null;
  const { data: customers = [], isLoading: customersLoading, isError: customersError } =
    useCustomersByCompany(parsedCompanyId);

  function toggleModule(m: GuestModule) {
    setSelectedModules(prev => { const n = new Set(prev); n.has(m) ? n.delete(m) : n.add(m); return n; });
  }
  function toggleCustomer(id: number) {
    setSelectedCustomers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAllCustomers() {
    setSelectedCustomers(
      selectedCustomers.size === customers.length ? new Set() : new Set(customers.map(c => c.id))
    );
  }

  function goToStep2() {
    if (selectedModules.size === 0) { setError("Select at least one module."); return; }
    setError(""); setStep(2);
  }
  function goToStep3() {
    if (!companyId) { setError("Please select a company."); return; }
    setError(""); setStep(3);
  }

  async function handleSave() {
    if (selectedCustomers.size === 0) { setError("Select at least one customer."); return; }
    setError(""); setSaving(true);
    const permissions: GuestPermissionPayload[] = [];
    for (const module of selectedModules)
      for (const customer_id of selectedCustomers)
        permissions.push({ module, customer_id, project_id: null });
    try {
      await savePerms.mutateAsync({ userId: user.id, permissions });
      setSuccess(true);
      setTimeout(onClose, 800);
    } catch {
      setError("Failed to save permissions. Please try again.");
      setSaving(false);
    }
  }

  const STEPS = ["Modules", "Company", "Customers"];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">

        {/* Accent bar */}
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(to right, #8b5cf6, #6366f1)` }} />

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/10">
              <KeyRound className="h-4.5 w-4.5 text-violet-500" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold leading-tight">Guest Permissions</h2>
              <p className="text-[11px] text-muted-foreground">{user.first_name} {user.last_name}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-3.5 border-b border-border/50 bg-muted/20">
          {STEPS.map((label, i) => {
            const sn = (i + 1) as 1 | 2 | 3;
            const isActive = step === sn, isDone = step > sn;
            return (
              <div key={label} className="flex items-center">
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all",
                  isDone   && "bg-violet-500 text-white",
                  isActive && "text-white ring-4 ring-violet-400/20",
                  !isDone && !isActive && "bg-muted text-muted-foreground",
                )} style={isActive ? { background: BRAND } : {}}>
                  {isDone ? <Check className="h-3 w-3" /> : sn}
                </div>
                <span className={cn(
                  "ml-2 text-[12px] font-semibold",
                  isActive ? "text-foreground" : "text-muted-foreground/50",
                )}>{label}</span>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="mx-3 h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        {permsLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <div className="space-y-3 p-6">
            {/* STEP 1: Modules */}
            {step === 1 && (
              <>
                <p className="text-[13px] text-muted-foreground">Choose which modules this guest user can access.</p>
                <div className="space-y-2">
                  {MODULES.map(({ value, label, Icon, desc }) => {
                    const active = selectedModules.has(value);
                    return (
                      <button key={value} type="button" onClick={() => toggleModule(value)}
                        className={cn(
                          "w-full flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all",
                          active
                            ? "border-orange-300 dark:border-orange-500/50"
                            : "border-border hover:border-border/60",
                        )}
                        style={active ? { background: BRAND_LIGHT } : {}}>
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                          active ? "text-white" : "bg-muted text-muted-foreground",
                        )} style={active ? { background: BRAND } : {}}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold">{label}</p>
                          <p className="text-[12px] text-muted-foreground">{desc}</p>
                        </div>
                        <div className={cn(
                          "h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all",
                          active ? "text-white" : "border-border",
                        )} style={active ? { background: BRAND, borderColor: BRAND } : {}}>
                          {active && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* STEP 2: Company */}
            {step === 2 && (
              <>
                <p className="text-[13px] text-muted-foreground">Select the company whose customers this guest should access.</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(selectedModules).map(m => {
                    const mod = MODULES.find(x => x.value === m)!;
                    return (
                      <span key={m} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold border"
                        style={{ background: BRAND_LIGHT, color: BRAND, borderColor: "#fed7aa" }}>
                        <mod.Icon className="h-3 w-3" /> {mod.label}
                      </span>
                    );
                  })}
                </div>
                <CompanySelect
                  value={companyId}
                  onChange={val => { setCompanyId(val); setSelectedCustomers(new Set()); }}
                  companies={companies} isLoading={companiesLoading} isError={companiesError}
                />
              </>
            )}

            {/* STEP 3: Customers */}
            {step === 3 && (
              <>
                <p className="text-[13px] text-muted-foreground">Pick the customers whose data this guest can view.</p>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  <span className="text-[13px] font-semibold text-foreground">
                    {companies.find(c => String(c.id) === companyId)?.company_name ?? "—"}
                  </span>
                  <span className="mx-1 text-muted-foreground/30">·</span>
                  <span className="text-[13px] text-muted-foreground">
                    {selectedModules.size} module{selectedModules.size !== 1 ? "s" : ""}
                  </span>
                </div>
                {customersLoading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading customers…
                  </div>
                ) : customersError ? (
                  <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
                    Failed to load customers. Please go back and try again.
                  </div>
                ) : customers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-8 text-center text-[13px] text-muted-foreground">
                    No customers found for this company.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <button type="button" onClick={toggleAllCustomers}
                      className="w-full flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-2.5 text-[13px] font-semibold text-muted-foreground hover:border-orange-300 hover:text-foreground transition-colors">
                      <div className={cn(
                        "h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all",
                        selectedCustomers.size === customers.length && customers.length > 0
                          ? "text-white" : "border-border",
                      )} style={selectedCustomers.size === customers.length && customers.length > 0
                          ? { background: BRAND, borderColor: BRAND } : {}}>
                        {selectedCustomers.size === customers.length && customers.length > 0 && <Check className="h-3 w-3" />}
                      </div>
                      Select all ({customers.length})
                    </button>
                    {customers.map(c => {
                      const checked = selectedCustomers.has(c.id);
                      return (
                        <button key={c.id} type="button" onClick={() => toggleCustomer(c.id)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                            checked ? "border-orange-300 dark:border-orange-500/50" : "border-border hover:border-border/60",
                          )}
                          style={checked ? { background: BRAND_LIGHT } : {}}>
                          <div className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black text-white bg-gradient-to-br",
                            avatarColor(c.name),
                          )}>
                            {c.name[0]?.toUpperCase() ?? "?"}
                          </div>
                          <span className="flex-1 text-[14px] font-medium">{c.name}</span>
                          <div className={cn(
                            "h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all",
                            checked ? "text-white" : "border-border",
                          )} style={checked ? { background: BRAND, borderColor: BRAND } : {}}>
                            {checked && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-4 py-2.5 text-[13px] text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex gap-3 border-t border-border bg-card px-6 py-4">
          {step > 1 ? (
            <button onClick={() => { setStep(s => (s - 1) as 1 | 2 | 3); setError(""); }} disabled={saving}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
              Back
            </button>
          ) : (
            <button onClick={onClose} disabled={saving}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
          )}
          {step < 3 ? (
            <button onClick={step === 1 ? goToStep2 : goToStep3} disabled={permsLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold text-white shadow-sm transition-all hover:opacity-90"
              style={{ background: BRAND }}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || success}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold text-white transition-all",
                success ? "bg-emerald-500" : "hover:opacity-90",
                saving && "opacity-70 cursor-not-allowed",
              )}
              style={!success ? { background: BRAND } : {}}>
              {success ? (
                <><CheckCircle2 className="h-4 w-4" /> Saved!</>
              ) : saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : "Save Permissions"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── User Form ────────────────────────────────────────────────────────────────
interface UserForm {
  email: string; first_name: string; last_name: string;
  role: string; company: string; phone: string;
  password: string; is_active: boolean;
}
interface FormErrors {
  email?: string; first_name?: string; last_name?: string;
  role?: string; company?: string; password?: string;
}

const CUSTOMER_ROLES  = new Set(["customer_admin", "customer_user"]);
const DEFAULT_COMPANY = "DMW";
const EMPTY_FORM: UserForm = {
  email: "", first_name: "", last_name: "", role: "customer_user",
  company: "", phone: "", password: "", is_active: true,
};

function validate(form: UserForm): FormErrors {
  const e: FormErrors = {};
  if (!form.email.trim())                                    e.email      = "Email is required";
  else if (!/\S+@\S+\.\S+/.test(form.email))               e.email      = "Enter a valid email";
  if (!form.first_name.trim())                              e.first_name = "First name is required";
  if (!form.last_name.trim())                               e.last_name  = "Last name is required";
  if (!form.role)                                           e.role       = "Role is required";
  if (CUSTOMER_ROLES.has(form.role) && !form.company)       e.company    = "Company is required";
  if (form.password && form.password.length < 8)            e.password   = "Password must be at least 8 characters";
  return e;
}

// ─── User Modal ───────────────────────────────────────────────────────────────
function UserModal({
  initial, companies, companiesLoading, companiesError, onSave, onClose,
}: {
  initial?: any; companies: Company[]; companiesLoading: boolean;
  companiesError: boolean; onSave: (data: any) => Promise<void>; onClose: () => void;
}) {
  const isEdit = !!initial;

  const resolveCompanyId = (): string => {
    if (!initial?.company) return "";
    if (!isNaN(Number(initial.company))) return String(initial.company);
    const match = companies.find(
      c => c.company_name.toLowerCase() === String(initial.company).toLowerCase()
    );
    return match ? String(match.id) : "";
  };

  const [form, setForm] = useState<UserForm>(
    initial ? {
      email:      initial.email      ?? "",
      first_name: initial.first_name ?? "",
      last_name:  initial.last_name  ?? "",
      role:       initial.role       ?? "customer_user",
      company:    resolveCompanyId(),
      phone:      initial.phone      ?? "",
      password:   "",
      is_active:  initial.is_active  ?? true,
    } : EMPTY_FORM
  );
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key: keyof UserForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(f => {
      const next = { ...f, [key]: val };
      if (key === "role" && !CUSTOMER_ROLES.has(val as string)) next.company = "";
      return next;
    });
    if (errors[key as keyof FormErrors]) setErrors(p => ({ ...p, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const isCustomerRole    = CUSTOMER_ROLES.has(form.role);
      const selectedCompany   = isCustomerRole
        ? companies.find(c => String(c.id) === form.company)?.company_name ?? form.company
        : DEFAULT_COMPANY;
      const payload: any = {
        email:      form.email.trim(),
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        role:       form.role,
        company:    selectedCompany,
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

        {/* Accent bar */}
        <div className="h-1 rounded-t-2xl" style={{ background: BRAND }} />

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: BRAND_LIGHT }}>
              {isEdit
                ? <Pencil className="h-4 w-4" style={{ color: BRAND }} />
                : <Plus   className="h-4 w-4" style={{ color: BRAND }} />}
            </div>
            <div>
              <h2 className="text-[15px] font-bold">{isEdit ? "Edit User" : "Create New User"}</h2>
              <p className="text-[11px] text-muted-foreground">{isEdit ? "Update account details" : "Fill in the details below"}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required error={errors.first_name}>
              <input className={cn(inputCls, errors.first_name && "border-red-400")}
                placeholder="Jane" value={form.first_name} onChange={set("first_name")} />
            </Field>
            <Field label="Last Name" required error={errors.last_name}>
              <input className={cn(inputCls, errors.last_name && "border-red-400")}
                placeholder="Doe" value={form.last_name} onChange={set("last_name")} />
            </Field>
          </div>

          <Field label="Email" required error={errors.email}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <input type="email"
                className={cn(inputCls, "pl-10", errors.email && "border-red-400")}
                placeholder="jane@company.com" value={form.email} onChange={set("email")} />
            </div>
          </Field>

          <Field label="Role" required error={errors.role}>
            <div className="relative">
              <Shield className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <select value={form.role} onChange={set("role")}
                className={cn(selectCls, "pl-10 pr-9", errors.role && "border-red-400")}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            </div>
          </Field>

          {CUSTOMER_ROLES.has(form.role) ? (
            <CompanySelect
              value={form.company}
              onChange={val => { setForm(f => ({ ...f, company: val })); if (errors.company) setErrors(p => ({ ...p, company: undefined })); }}
              error={errors.company} companies={companies}
              isLoading={companiesLoading} isError={companiesError}
            />
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              <span className="text-[13px] text-muted-foreground">
                Company: <span className="font-semibold text-foreground">{DEFAULT_COMPANY}</span>
                <span className="ml-1.5 text-[11px] text-muted-foreground/50">(auto-assigned)</span>
              </span>
            </div>
          )}

          <Field label="Phone">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <input className={cn(inputCls, "pl-10")}
                placeholder="+49 123 456789" value={form.phone} onChange={set("phone")} />
            </div>
          </Field>

          <Field label={isEdit ? "New Password (leave blank to keep current)" : "Password"} error={errors.password}>
            <input type="password"
              className={cn(inputCls, errors.password && "border-red-400")}
              placeholder={isEdit ? "••••••••" : "Min. 8 characters"}
              value={form.password} onChange={set("password")} autoComplete="new-password" />
          </Field>

          {isEdit && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2.5">
                {form.is_active
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  : <UserX        className="h-4 w-4 text-red-500" />}
                <span className="text-[14px] font-medium">
                  {form.is_active ? "Account is active" : "Account is deactivated"}
                </span>
              </div>
              <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors duration-200",
                  form.is_active ? "bg-emerald-500" : "bg-muted-foreground/20"
                )}>
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
          <button onClick={onClose} disabled={saving}
            className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || success || companiesLoading}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold text-white transition-all",
              success ? "bg-emerald-500" : "hover:opacity-90",
              (saving || companiesLoading) && "opacity-70 cursor-not-allowed",
            )}
            style={!success ? { background: BRAND } : {}}>
            {success ? (
              <><CheckCircle2 className="h-4 w-4" /> Saved!</>
            ) : saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({
  user, loading, onConfirm, onClose,
}: {
  user: any; loading: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-1 bg-red-500 rounded-t-2xl" />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="text-[16px] font-bold">Delete user?</h3>
          </div>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">"{user.first_name} {user.last_name}"</span>{" "}
            will be permanently removed. This action cannot be undone.
          </p>
          <div className="mt-6 flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-[14px] font-bold text-white hover:bg-red-600 disabled:opacity-60 transition-all">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : <><Trash2 className="h-4 w-4" /> Delete</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────
function UserRow({
  user, onEdit, onDelete, onManagePermissions,
}: {
  user: any; onEdit: () => void; onDelete: () => void; onManagePermissions: () => void;
}) {
  const meta    = roleMeta(user.role);
  const isGuest = user.role === "guest";

  return (
    <div className="group flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">

      {/* Avatar */}
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[12px] font-bold text-white",
        avatarColor(user.email),
      )}>
        {initials(user.first_name, user.last_name)}
      </div>

      {/* Name + email */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <p className="text-[14px] font-semibold leading-tight">{user.first_name} {user.last_name}</p>
          <span className={cn("rounded-lg border px-2 py-0.5 text-[10px] font-semibold", meta.color)}>
            {meta.label}
          </span>
          {!user.is_active && (
            <span className="rounded-lg border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Inactive
            </span>
          )}
        </div>
        <p className="text-[12px] text-muted-foreground truncate">{user.email}</p>
        {user.company && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/60">
            <Building2 className="h-3 w-3" />{user.company}
          </p>
        )}
      </div>

      {/* Actions — revealed on hover */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isGuest && (
          <button onClick={onManagePermissions} title="Manage permissions"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400 transition-colors">
            <KeyRound className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-500/10 dark:hover:text-sky-400 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const {
    data:      companies       = [],
    isLoading: companiesLoading,
    isError:   companiesError,
  } = useCompanies();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [search,        setSearch]        = useState("");
  const [roleFilter,    setRoleFilter]    = useState("");
  const [modal,         setModal]         = useState<null | "create" | any>(null);
  const [deleting,      setDeleting]      = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [permUser,      setPermUser]      = useState<any | null>(null);

  const allUsers    = users as any[];
  const activeCount = allUsers.filter(u => u.is_active).length;
  const adminCount  = allUsers.filter(u => u.role === "admin").length;
  const guestCount  = allUsers.filter(u => u.role === "guest").length;

  const filtered = allUsers.filter(u => {
    const text = `${u.first_name} ${u.last_name} ${u.email} ${u.company ?? ""}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase()))
        && (!roleFilter || u.role === roleFilter);
  });

  const handleSave = async (payload: any) => {
    if (modal === "create") await createUser.mutateAsync(payload);
    else                    await updateUser.mutateAsync({ id: modal.id, ...payload });
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
    <div className="flex-1 overflow-auto bg-background">
      <div className="w-full max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-0.5 w-5 rounded-full" style={{ background: BRAND }} />
              <span className="text-[11px] font-semibold uppercase tracking-[.15em]" style={{ color: BRAND }}>
                Admin · User Management
              </span>
            </div>
            <h1 className="text-[26px] font-bold tracking-tight leading-none text-foreground">Users</h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              {usersLoading ? "Loading…" : `Manage accounts, roles, and access permissions`}
            </p>
          </div>
          <button
            onClick={() => setModal("create")}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition-all hover:opacity-90"
            style={{ background: BRAND }}>
            <Plus className="h-4 w-4" /> New User
          </button>
        </div>

        {/* ── KPI row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Users" value={usersLoading ? "—" : String(allUsers.length)}
            sub="registered accounts" icon={Users} iconBg={BRAND} />
          <StatCard
            label="Active" value={usersLoading ? "—" : String(activeCount)}
            sub={`${allUsers.length - activeCount} inactive`} icon={CheckCircle2} iconBg="#10b981" />
          <StatCard
            label="Admins" value={usersLoading ? "—" : String(adminCount)}
            sub="full access" icon={Shield} iconBg="#8b5cf6" />
          <StatCard
            label="Guests" value={usersLoading ? "—" : String(guestCount)}
            sub="limited access" icon={Eye} iconBg="#94a3b8" />
        </div>

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, company…"
              className={cn(inputCls, "pl-11")}
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="relative sm:w-48">
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className={cn(selectCls, "pr-9")}>
              <option value="">All roles</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
          </div>
        </div>

        {/* ── User list ────────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* List header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-[13px] font-bold text-foreground">All Users</h2>
            <span className="text-[11px] text-muted-foreground">
              {usersLoading ? "Loading…" : `${filtered.length} of ${allUsers.length} user${allUsers.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2.5" /> Loading users…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: BRAND_LIGHT }}>
                <Users className="h-7 w-7" style={{ color: BRAND }} />
              </div>
              <p className="text-[15px] font-semibold text-muted-foreground">
                {search || roleFilter ? "No users match your filters" : "No users yet"}
              </p>
              {!search && !roleFilter && (
                <p className="text-[13px] text-muted-foreground/60">Create the first user using the button above.</p>
              )}
            </div>
          ) : (
            <div>
              {filtered.map((u: any) => (
                <UserRow
                  key={u.id}
                  user={u}
                  onEdit={() => setModal(u)}
                  onDelete={() => setDeleting(u)}
                  onManagePermissions={() => setPermUser(u)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="pt-4 pb-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">DMW Robotics</span>
            <span>© 2023 DMW Industrial Systems GMBH</span>
          </div>
          <div className="flex items-center gap-5">
            {["Security Policy", "API Docs", "Privacy", "Terms of Service"].map(l => (
              <button key={l} className="hover:text-foreground transition-colors">{l}</button>
            ))}
          </div>
        </footer>

      </div>

      {/* Modals */}
      {modal !== null && (
        <UserModal
          initial={modal === "create" ? undefined : modal}
          companies={companies} companiesLoading={companiesLoading} companiesError={companiesError}
          onSave={handleSave} onClose={() => setModal(null)}
        />
      )}
      {deleting && (
        <DeleteModal user={deleting} loading={deleteLoading}
          onConfirm={handleDelete} onClose={() => setDeleting(null)} />
      )}
      {permUser && (
        <GuestPermissionsModal
          user={permUser} companies={companies}
          companiesLoading={companiesLoading} companiesError={companiesError}
          onClose={() => setPermUser(null)}
        />
      )}
    </div>
  );
}