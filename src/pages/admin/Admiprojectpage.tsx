import { useState } from "react";
import {
  Search, Plus, Pencil, Trash2, X, Calendar, Users,
  CheckSquare, Square, Mail, Flag,
  Building2, UserCheck, ShieldCheck,
} from "lucide-react";
import {
  useAdminProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCompanies,
  useCustomerAdminsByCompany,
  useTeamUsers,
  createProjectMilestones,
  type MilestoneInput,
  type ProjectMemberInfo,
} from "./../../hooks/UseAdminProjects";

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberAssignment = { user: number; role: string };

type ProjectForm = {
  name:               string;
  company:            string;
  description:        string;
  contract_number:    string;
  start_date:         string;
  expected_end:       string;
  member_assignments: MemberAssignment[];
  // Admin-chosen date for each of the 5 phases (create only)
  milestone_dates:    string[];
};

// Valid roles the backend accepts for project members
const VALID_PROJECT_ROLES = new Set(["project_manager", "customer_admin", "customer_user"]);

/**
 * Maps a user's system role to the closest valid project member role.
 * "admin" is a system-level role — the backend won't accept it in member_assignments.
 */
function toProjectRole(systemRole?: string): string {
  if (systemRole === "project_manager") return "project_manager";
  if (systemRole === "customer_admin")  return "customer_admin";
  return "customer_user"; // admin, customer_user, unknown → default
}

// ─── Project phases (milestones) ───────────────────────────────────────────────
// FIX: previously 7 milestones were auto-generated with dates computed from
// a fixed week-offset off the start date. There are only 5 real phases
// (per the DRP Gantt chart), and the admin now types the planned date for
// each phase directly rather than having it computed automatically.

const PROJECT_PHASES = [
  { order: 1, title: "Phase 1 — Enquiry & Proposal" },
  { order: 2, title: "Phase 2 — Commercial Finalization" },
  { order: 3, title: "Phase 3 — Design Release & Procurement" },
  { order: 4, title: "Phase 4 — Internal Trial & Validation" },
  { order: 5, title: "Phase 5 — Implementation at Customer End" },
];

// ─── Card accent colours ──────────────────────────────────────────────────────

const ACCENTS = [
  { bg: "#f97316", shadow: "rgba(249,115,22,0.35)" },
  { bg: "#3b82f6", shadow: "rgba(59,130,246,0.35)" },
  { bg: "#8b5cf6", shadow: "rgba(139,92,246,0.35)" },
  { bg: "#10b981", shadow: "rgba(16,185,129,0.35)" },
  { bg: "#f43f5e", shadow: "rgba(244,63,94,0.35)" },
  { bg: "#f59e0b", shadow: "rgba(245,158,11,0.35)" },
];

function accent(id: number) {
  return ACCENTS[id % ACCENTS.length];
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all";

function userInitials(u: any) {
  const fn = u.full_name ?? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  if (fn) return fn.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
  return u.email[0].toUpperCase();
}

function userDisplayName(u: any) {
  return u.full_name ?? (`${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email);
}

/**
 * Sanitize form before sending to API:
 * - Convert company to number
 * - Empty strings → null for dates
 * - Strip any member_assignments whose role the backend won't accept (e.g. "admin")
 */
function sanitize(form: ProjectForm) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { milestone_dates, ...rest } = form;
  return {
    ...rest,
    company:      form.company ? Number(form.company) : null,
    start_date:   form.start_date   || null,
    expected_end: form.expected_end || null,
    member_assignments: form.member_assignments.filter(m =>
      VALID_PROJECT_ROLES.has(m.role)
    ),
  };
}

// ─── Milestone Phase Dates (editable) ──────────────────────────────────────────
// FIX: the admin now picks the planned date for each of the 5 phases
// directly, instead of 7 dates being auto-computed from the start date.

function MilestonePhaseDates({
  dates,
  onChange,
}: {
  dates: string[];
  onChange: (next: string[]) => void;
}) {
  const setDate = (idx: number, value: string) => {
    const next = [...dates];
    next[idx] = value;
    onChange(next);
  };

  const filledCount = dates.filter(Boolean).length;

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/5 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-orange-200 dark:border-orange-500/20">
        <Flag className="h-4 w-4 shrink-0 text-orange-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
            Set the planned date for each project phase
          </p>
          <p className="text-xs text-orange-500/80 mt-0.5">
            All 5 dates are required to create the project.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-orange-500 bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded-full">
          {filledCount}/5 set
        </span>
      </div>

      <div className="divide-y divide-orange-100 dark:divide-orange-500/10">
        {PROJECT_PHASES.map((m, idx) => (
          <div key={m.order} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/20 font-mono text-[10px] font-bold text-orange-600 dark:text-orange-400">
              {m.order}
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">{m.title}</span>
            <input
              type="date"
              required
              value={dates[idx] ?? ""}
              onChange={e => setDate(idx, e.target.value)}
              className="shrink-0 w-[150px] rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Customer Admin Picker ────────────────────────────────────────────────────

function CustomerAdminPicker({
  companyId,
  assignments,
  onChange,
}: {
  companyId: number;
  assignments: MemberAssignment[];
  onChange: (next: MemberAssignment[]) => void;
}) {
  const { data: admins = [], isLoading } = useCustomerAdminsByCompany(companyId);

  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground py-3 text-center animate-pulse">
        Loading customer admins…
      </p>
    );
  }

  if (admins.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3 text-center">
        No customer admins found for this company.
      </p>
    );
  }

  const isAssigned = (id: number) =>
    assignments.some(m => m.user === id && m.role === "customer_admin");

  const toggle = (userId: number) => {
    if (isAssigned(userId)) {
      onChange(assignments.filter(m => !(m.user === userId && m.role === "customer_admin")));
    } else {
      onChange([...assignments, { user: userId, role: "customer_admin" }]);
    }
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
      {admins.map((u: any) => {
        const assigned = isAssigned(u.id);
        return (
          <button
            type="button"
            key={u.id}
            onClick={() => toggle(u.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              assigned ? "bg-orange-50 dark:bg-orange-500/10" : "hover:bg-muted/40"
            }`}
          >
            <span className={`shrink-0 transition-colors ${
              assigned ? "text-orange-500" : "text-muted-foreground"
            }`}>
              {assigned
                ? <CheckSquare className="h-4 w-4" />
                : <Square className="h-4 w-4" />
              }
            </span>

            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              assigned ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
            }`}>
              {userInitials(u)}
            </span>

            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium truncate">{userDisplayName(u)}</span>
              <span className="block text-xs text-muted-foreground truncate">{u.email}</span>
            </span>

            {assigned && (
              <span className="shrink-0 text-[10px] font-semibold text-orange-500 bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Project Modal ────────────────────────────────────────────────────────────

function ProjectModal({
  initial,
  companies,
  teamUsers,
  onSave,
  onClose,
}: {
  initial?:   Partial<ProjectForm> & { id?: number };
  companies:  any[];
  teamUsers:  any[];
  onSave:     (data: ReturnType<typeof sanitize>, milestones?: MilestoneInput[]) => void;
  onClose:    () => void;
}) {
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<ProjectForm>({
    name:               initial?.name            ?? "",
    company:            String(initial?.company  ?? ""),
    description:        initial?.description     ?? "",
    contract_number:    initial?.contract_number ?? "",
    start_date:         initial?.start_date      ?? "",
    expected_end:       initial?.expected_end    ?? "",
    member_assignments: initial?.member_assignments ?? [],
    milestone_dates:    initial?.milestone_dates ?? Array(PROJECT_PHASES.length).fill(""),
  });

  const set =
    (k: keyof ProjectForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  // When company changes, strip out customer_admin assignments from the old company
  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompany = e.target.value;
    setForm(f => ({
      ...f,
      company: newCompany,
      member_assignments: f.member_assignments.filter(m => m.role !== "customer_admin"),
    }));
  };

  // Check if a team member (non-customer_admin) is assigned
  const isAssigned = (userId: number) =>
    form.member_assignments.some(m => m.user === userId && m.role !== "customer_admin");

  const toggleMember = (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    const user = teamUsers.find((u: any) => u.id === userId);
    // Never touch customer_admin assignments here — managed by Step 2
    if (user?.role === "customer_admin") return;

    setForm(f =>
      isAssigned(userId)
        ? { ...f, member_assignments: f.member_assignments.filter(m => m.user !== userId) }
        : {
            ...f,
            member_assignments: [
              ...f.member_assignments,
              // ✅ Use toProjectRole to ensure valid backend role (never sends "admin")
              { user: userId, role: toProjectRole(user?.role) },
            ],
          }
    );
  };

  const selectedCompanyId  = form.company ? Number(form.company) : null;
  const selectedAdminCount = form.member_assignments.filter(m => m.role === "customer_admin").length;

  // Team users excluding customer_admins (they're handled in Step 2)
  // Also exclude system admins from the list entirely — they have global access
  // FIX: the backend now only returns company === "DMW" users from this
  // endpoint, but we filter again here defensively in case a non-DMW user
  // slips through (e.g. blank company on an older account).
  const visibleTeamUsers = teamUsers.filter(
    (u: any) =>
      u.role !== "customer_admin" &&
      u.role !== "admin" &&
      (!u.company || u.company === "DMW")
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edit Project" : "New Project"}
          </h2>
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            if (!isEdit && form.milestone_dates.some(d => !d)) {
              alert("Please set a planned date for all 5 phases before creating the project.");
              return;
            }
            const milestones: MilestoneInput[] | undefined = isEdit
              ? undefined
              : PROJECT_PHASES.map((p, idx) => ({
                  order:        p.order,
                  title:        p.title,
                  planned_date: form.milestone_dates[idx],
                }));
            onSave(sanitize(form), milestones);
          }}
          className="p-6 space-y-5"
        >

          {/* ── Basic Info ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">

            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Project Name *
              </label>
              <input className={inputCls} required value={form.name} onChange={set("name")}
                placeholder="e.g. Warehouse Automation Phase 1" />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Contract Number
              </label>
              <input className={inputCls} value={form.contract_number}
                onChange={set("contract_number")} placeholder="DMW-2024-001" />
            </div>

            <div />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Start Date
              </label>
              <input type="date" className={inputCls} value={form.start_date}
                onChange={set("start_date")} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Expected End
              </label>
              <input type="date" className={inputCls} value={form.expected_end}
                onChange={set("expected_end")} />
            </div>

            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <textarea className={`${inputCls} resize-none h-20`} value={form.description}
                onChange={set("description")} placeholder="Brief project overview…" />
            </div>
          </div>

          {/* ── Milestone phase dates (create only) ─────────────────────── */}
          {!isEdit && (
            <MilestonePhaseDates
              dates={form.milestone_dates}
              onChange={next => setForm(f => ({ ...f, milestone_dates: next }))}
            />
          )}

          {/* ── Step 1: Company Selection ────────────────────────────────── */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <Building2 className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold">Step 1 — Select Company</span>
            </div>
            <div className="p-4">
              <select
                className={inputCls}
                required
                value={form.company}
                onChange={handleCompanyChange}
              >
                <option value="">Choose a company…</option>
                {companies.length === 0 && (
                  <option disabled>Loading companies…</option>
                )}
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}{c.city ? ` — ${c.city}` : ""}{c.state ? `, ${c.state}` : ""}
                  </option>
                ))}
              </select>
              {form.company && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Company selected. Now assign one or more customer admins from this company below.
                </p>
              )}
            </div>
          </div>

          {/* ── Step 2: Customer Admin Picker ─────────────────────────────── */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <UserCheck className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold">Step 2 — Assign Customer Admins</span>
              {selectedAdminCount > 0 && (
                <span className="ml-auto text-xs font-semibold text-orange-500 bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded-full">
                  {selectedAdminCount} selected
                </span>
              )}
            </div>
            <div className="p-4">
              {!selectedCompanyId ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Select a company above to see available customer admins.
                </p>
              ) : (
                <CustomerAdminPicker
                  companyId={selectedCompanyId}
                  assignments={form.member_assignments}
                  onChange={next => setForm(f => ({ ...f, member_assignments: next }))}
                />
              )}
            </div>
          </div>

          {/* ── Team Members ──────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Team Members</span>
              <span className="ml-auto text-xs text-orange-500 font-medium">
                {form.member_assignments.filter(m => m.role !== "customer_admin").length} selected
              </span>
            </div>

            {/* FIX: previously there was no clear summary of who is already
                on the project — you had to scan the whole checklist for
                highlighted rows. This surfaces it up front. */}
            {isEdit && form.member_assignments.filter(m => m.role !== "customer_admin").length > 0 && (
              <p className="mb-2 text-xs text-muted-foreground">
                Currently assigned:{" "}
                <span className="text-foreground font-medium">
                  {form.member_assignments
                    .filter(m => m.role !== "customer_admin")
                    .map(m => {
                      const u = teamUsers.find((t: any) => t.id === m.user);
                      return u ? userDisplayName(u) : `#${m.user}`;
                    })
                    .join(", ")}
                </span>
              </p>
            )}

            {visibleTeamUsers.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">
                No users available.
              </p>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                {visibleTeamUsers.map((u: any) => {
                  const assigned = isAssigned(u.id);

                  return (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        assigned ? "bg-orange-50 dark:bg-orange-500/10" : "hover:bg-muted/40"
                      }`}
                    >
                      {/* Checkbox */}
                      <button type="button" onClick={e => toggleMember(e, u.id)}
                        className={`shrink-0 transition-colors ${
                          assigned ? "text-orange-500" : "text-muted-foreground hover:text-orange-400"
                        }`}>
                        {assigned ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>

                      {/* Avatar */}
                      <button type="button" onClick={e => toggleMember(e, u.id)}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                          assigned ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
                        }`}>
                        {userInitials(u)}
                      </button>

                      {/* Name + email */}
                      <button type="button" onClick={e => toggleMember(e, u.id)}
                        className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{userDisplayName(u)}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </button>

                      {/* ✅ Role badge only — no dropdown, role is fixed by system role */}
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        assigned
                          ? "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {u.role?.replace(/_/g, " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">
              {isEdit ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project:  any;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const { bg } = accent(project.id ?? 0);

  const mono = (project.name ?? "P")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  const adminNames: string[]              = project.customer_admins ?? [];
  const teamMembers: ProjectMemberInfo[]  = project.team_members ?? [];

  const STATUS_LABEL: Record<string, string> = {
    planning:    "Planning",
    in_progress: "In Progress",
    on_hold:     "On Hold",
    completed:   "Completed",
    cancelled:   "Cancelled",
  };

  // FIX: the card used to be a fancy hover-flip layout with absolutely
  // positioned content that broke as soon as extra content (like a member
  // list) was added — text overlapped, the bottom panel clipped, etc.
  // This is a plain static card: predictable height, nothing overlapping.
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Accent header */}
      <div className="relative px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${bg}22 0%, ${bg}0d 100%)` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: bg }}
            >
              {mono}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{project.name}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {project.company_name ?? "No company"}
              </p>
            </div>
          </div>
          {project.contract_number && (
            <span
              className="shrink-0 text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-1"
              style={{ color: bg, background: `${bg}18`, border: `1px solid ${bg}33` }}
            >
              #{project.contract_number}
            </span>
          )}
        </div>

        <span
          className="mt-3 inline-block text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5"
          style={{ color: bg, background: `${bg}18` }}
        >
          {STATUS_LABEL[project.status] ?? project.status}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col gap-3 px-5 py-4">
        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
        )}

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>Progress</span>
            <span className="font-medium text-foreground">{project.progress ?? 0}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${project.progress ?? 0}%`, background: bg }}
            />
          </div>
        </div>

        {/* Dates */}
        {(project.start_date || project.expected_end) && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Calendar size={12} />
            {project.start_date && new Date(project.start_date).toLocaleDateString()}
            {project.start_date && project.expected_end && " → "}
            {project.expected_end && new Date(project.expected_end).toLocaleDateString()}
          </div>
        )}

        {/* ── Members — FIX: this is the actual project roster, not just a count ── */}
        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 space-y-1.5">
          {adminNames.length === 0 && teamMembers.length === 0 ? (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Users size={12} /> No members assigned yet
            </p>
          ) : (
            <>
              {adminNames.length > 0 && (
                <p className="text-[11px] text-foreground flex items-start gap-1.5">
                  <ShieldCheck size={12} className="shrink-0 mt-0.5 text-orange-500" />
                  <span>
                    <span className="text-muted-foreground">Customer admin: </span>
                    {adminNames.join(", ")}
                  </span>
                </p>
              )}
              {teamMembers.length > 0 && (
                <p className="text-[11px] text-foreground flex items-start gap-1.5">
                  <Users size={12} className="shrink-0 mt-0.5 text-muted-foreground" />
                  <span>
                    <span className="text-muted-foreground">Team: </span>
                    {teamMembers.map(m => m.name).join(", ")}
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 rounded-lg border border-rose-200 text-rose-600 px-2.5 py-1.5 text-xs font-medium hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
        <Mail size={15} className="text-muted-foreground" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminProjectsPage() {
  const { data: projects = [], isLoading } = useAdminProjects();
  const { data: companies = [] }           = useCompanies();
  const { data: teamUsers = [] }           = useTeamUsers();

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [search, setSearch]   = useState("");
  const [modal, setModal]     = useState<null | "create" | { id: number; data: any }>(null);
  const [toDelete, setDelete] = useState<null | { id: number; name: string }>(null);

  const filtered = (projects as any[]).filter(p =>
    (p.name + (p.company_name ?? "") + (p.contract_number ?? ""))
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{projects.length} total</p>
        </div>
        <button onClick={() => setModal("create")}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors">
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all" />
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground text-sm">No projects found</div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p: any) => (
            <ProjectCard key={p.id} project={p}
              onEdit={() => setModal({ id: p.id, data: p })}
              onDelete={() => setDelete({ id: p.id, name: p.name })} />
          ))}
        </div>
      )}

      {/* Create modal */}
      {modal === "create" && (
        <ProjectModal
          companies={companies}
          teamUsers={teamUsers}
          onSave={async (data, milestones) => {
            const project = await createProject.mutateAsync(data);
            if (milestones && milestones.length > 0) {
              try {
                await createProjectMilestones(project.id, milestones);
              } catch (err) {
                console.error("Project created, but milestone creation failed:", err);
                alert(
                  "The project was created, but the phase milestones couldn't be saved. " +
                  "Please add them from the project's milestone timeline."
                );
              }
            }
            setModal(null);
          }}
          onClose={() => setModal(null)} />
      )}

      {/* Edit modal */}
      {modal && modal !== "create" && (
        <ProjectModal
          initial={{
            id: modal.id,
            ...modal.data,
            member_assignments: (modal.data.members ?? []).map((m: any) => ({
              user: typeof m.user === "object" ? m.user.id : m.user,
              role: m.role,
            })),
          }}
          companies={companies}
          teamUsers={teamUsers}
          onSave={data => { updateProject.mutate({ id: modal.id, ...data }); setModal(null); }}
          onClose={() => setModal(null)} />
      )}

      {/* Delete confirm */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Trash2 className="h-5 w-5 text-rose-600" />
            </div>
            <h3 className="mb-1 text-base font-semibold">Delete Project</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">{toDelete.name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDelete(null)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={() => { deleteProject.mutate(toDelete.id); setDelete(null); }}
                className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}