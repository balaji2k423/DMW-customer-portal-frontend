import { useState, useEffect } from "react";
import {
  Search, Plus, Pencil, Trash2, X, Calendar, Users,
  CheckSquare, Square, Mail, Flag, ChevronDown, ChevronUp,
  Building2, UserCheck,
} from "lucide-react";
import {
  useAdminProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCompanies,
  useCustomerAdminsByCompany,
  useTeamUsers,
} from "@/hooks/useAdminProjects";

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberAssignment = { user: number; role: string };

type ProjectForm = {
  name:               string;
  company:            string;   // Company PK (replaces the old single `customer` FK)
  description:        string;
  contract_number:    string;
  start_date:         string;
  expected_end:       string;
  member_assignments: MemberAssignment[];
};

const MEMBER_ROLES = [
  { value: "project_manager", label: "Project Manager" },
  { value: "customer_admin",  label: "Customer Admin" },
  { value: "customer_user",   label: "Customer User" },
];

// ─── Milestone template (mirrors signals.py — keep in sync) ──────────────────

const MILESTONE_TEMPLATE = [
  { order: 1, title: "Project Kickoff",                       weekOffset: 0  },
  { order: 2, title: "Requirements Sign-Off",                 weekOffset: 2  },
  { order: 3, title: "Design & Engineering Review",           weekOffset: 4  },
  { order: 4, title: "Manufacturing / Build Complete",        weekOffset: 8  },
  { order: 5, title: "Factory Acceptance Test (FAT)",         weekOffset: 10 },
  { order: 6, title: "Site Installation & Commissioning",     weekOffset: 13 },
  { order: 7, title: "Site Acceptance Test & Final Sign-Off", weekOffset: 15 },
];

function addWeeks(dateStr: string, weeks: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

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

function sanitize(form: ProjectForm) {
  return {
    ...form,
    company:      form.company ? Number(form.company) : null,
    start_date:   form.start_date   || null,
    expected_end: form.expected_end || null,
  };
}

// ─── Milestone Template Preview ───────────────────────────────────────────────

function MilestoneTemplatePreview({ startDate }: { startDate: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <Flag className="h-4 w-4 shrink-0 text-orange-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
            7 milestones will be created automatically
          </p>
          <p className="text-xs text-orange-500/80 mt-0.5">
            {startDate
              ? `Starting from ${new Date(startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
              : "Dates calculated from start date (today if not set)"}
          </p>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 shrink-0 text-orange-400" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-orange-400" />
        }
      </button>

      {open && (
        <div className="border-t border-orange-200 dark:border-orange-500/20 divide-y divide-orange-100 dark:divide-orange-500/10">
          {MILESTONE_TEMPLATE.map(m => (
            <div key={m.order} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/20 font-mono text-[10px] font-bold text-orange-600 dark:text-orange-400">
                {m.order}
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">{m.title}</span>
              {startDate && (
                <span className="shrink-0 font-mono text-[10px] text-orange-500/70">
                  {addWeeks(startDate, m.weekOffset)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Customer Admin Picker (shown after company is selected) ─────────────────

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

  const assignedCount = admins.filter(a => isAssigned(a.id)).length;

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
  onSave:     (data: ReturnType<typeof sanitize>) => void;
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
  });

  const set =
    (k: keyof ProjectForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  // When company changes, strip out any customer_admin assignments from the old company
  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompany = e.target.value;
    setForm(f => ({
      ...f,
      company: newCompany,
      // Remove all customer_admin assignments (they belong to the previous company)
      member_assignments: f.member_assignments.filter(m => m.role !== "customer_admin"),
    }));
  };

  // ── Non-admin team members (project_manager / customer_user) ──────────────
  const isAssigned = (userId: number) =>
    form.member_assignments.some(m => m.user === userId && m.role !== "customer_admin");

  const toggleMember = (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    // Guard: never touch customer_admin assignments — those are managed by Step 2
    const user = teamUsers.find((u: any) => u.id === userId);
    if (user?.role === "customer_admin") return;
    setForm(f =>
      isAssigned(userId)
        ? { ...f, member_assignments: f.member_assignments.filter(m => m.user !== userId) }
        : { ...f, member_assignments: [...f.member_assignments, { user: userId, role: user?.role ?? "customer_user" }] }
    );
  };

  const updateRole = (e: React.ChangeEvent<HTMLSelectElement>, userId: number) => {
    e.stopPropagation();
    setForm(f => ({
      ...f,
      member_assignments: f.member_assignments.map(m =>
        m.user === userId ? { ...m, role: e.target.value } : m
      ),
    }));
  };

  const selectedCompanyId = form.company ? Number(form.company) : null;

  // Count selected customer admins for the badge
  const selectedAdminCount = form.member_assignments.filter(m => m.role === "customer_admin").length;

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

        <form onSubmit={e => { e.preventDefault(); onSave(sanitize(form)); }} className="p-6 space-y-5">

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

          {/* ── Milestone preview (create only) ─────────────────────────── */}
          {!isEdit && (
            <MilestoneTemplatePreview startDate={form.start_date} />
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

          {/* ── Step 2: Customer Admin Picker (unlocks after company chosen) ── */}
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

          {/* ── Team Members (project_manager / customer_user) ────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Team Members</span>
              <span className="ml-auto text-xs text-orange-500 font-medium">
                {form.member_assignments.filter(m => m.role !== "customer_admin").length} selected
              </span>
            </div>

            {teamUsers.filter((u: any) => u.role !== "customer_admin").length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">
                No users available.
              </p>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                {teamUsers.filter((u: any) => u.role !== "customer_admin").map((u: any) => {
                  const assigned   = isAssigned(u.id);
                  const assignment = form.member_assignments.find(
                    m => m.user === u.id && m.role !== "customer_admin"
                  );

                  return (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        assigned ? "bg-orange-50 dark:bg-orange-500/10" : "hover:bg-muted/40"
                      }`}
                    >
                      <button type="button" onClick={e => toggleMember(e, u.id)}
                        className={`shrink-0 transition-colors ${
                          assigned ? "text-orange-500" : "text-muted-foreground hover:text-orange-400"
                        }`}>
                        {assigned ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>

                      <button type="button" onClick={e => toggleMember(e, u.id)}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                          assigned ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
                        }`}>
                        {userInitials(u)}
                      </button>

                      <button type="button" onClick={e => toggleMember(e, u.id)}
                        className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{userDisplayName(u)}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </button>

                      {assigned ? (
                        <select
                          value={assignment?.role ?? "project_manager"}
                          onChange={e => updateRole(e, u.id)}
                          onClick={e => e.stopPropagation()}
                          className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-orange-400 transition-all"
                        >
                          {/* Exclude customer_admin here — those are managed by Step 2 */}
                          {MEMBER_ROLES.filter(r => r.value !== "customer_admin").map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="shrink-0 text-[10px] text-muted-foreground capitalize px-1">
                          {u.role?.replace(/_/g, " ")}
                        </span>
                      )}
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
  const { bg, shadow } = accent(project.id ?? 0);

  const mono = (project.name ?? "P")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  // Show company name on card; admins listed below it
  const adminNames: string[] = project.customer_admins ?? [];

  return (
    <>
      <style>{`
        .proj-card {
          width: 100%;
          min-height: 280px;
          background: white;
          border-radius: 32px;
          padding: 3px;
          position: relative;
          box-shadow: ${shadow} 0px 70px 30px -50px;
          transition: all 0.5s ease-in-out;
        }
        .dark .proj-card { background: hsl(var(--card)); }

        .proj-card .proj-pic {
          position: absolute;
          width: calc(100% - 6px); height: calc(100% - 6px);
          top: 3px; left: 3px;
          border-radius: 29px;
          z-index: 1;
          overflow: hidden;
          transition: all 0.5s ease-in-out 0.2s, z-index 0.5s ease-in-out 0.2s;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, ${bg}22 0%, ${bg}44 100%);
        }
        .proj-card .proj-pic .mono-text {
          font-size: 5rem; font-weight: 900;
          color: ${bg}; opacity: 0.35;
          user-select: none;
          transition: all 0.5s ease-in-out 0s;
          font-family: 'Georgia', serif;
          letter-spacing: -4px;
        }

        .proj-card .proj-bottom {
          position: absolute;
          bottom: 3px; left: 3px; right: 3px;
          background: ${bg};
          top: 80%;
          border-radius: 29px;
          z-index: 2;
          box-shadow: ${shadow} 0px 5px 5px 0px inset;
          overflow: hidden;
          transition: all 0.5s cubic-bezier(0.645,0.045,0.355,1) 0s;
        }

        .proj-card .proj-bottom .proj-content {
          position: absolute;
          bottom: 0; left: 1.5rem; right: 1.5rem;
          height: 180px;
        }
        .proj-card .proj-bottom .proj-content .proj-name {
          display: block; font-size: 1.1rem; color: white; font-weight: 700;
          margin-top: 1rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .proj-card .proj-bottom .proj-content .proj-company {
          display: block; font-size: 0.78rem; color: rgba(255,255,255,0.85);
          margin-top: 0.25rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          font-weight: 600;
        }
        .proj-card .proj-bottom .proj-content .proj-admins {
          display: block; font-size: 0.7rem; color: rgba(255,255,255,0.65);
          margin-top: 0.15rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .proj-card .proj-bottom .proj-content .proj-desc {
          display: -webkit-box;
          -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
          font-size: 0.78rem; color: rgba(255,255,255,0.7);
          margin-top: 0.5rem; line-height: 1.4;
        }

        .proj-card .proj-bottom .proj-meta {
          position: absolute;
          bottom: 3.8rem; left: 1.5rem; right: 1.5rem;
          display: flex; gap: 0.75rem; flex-wrap: wrap;
          opacity: 0; transform: translateY(6px);
          transition: opacity 0.3s ease 0.3s, transform 0.3s ease 0.3s;
        }
        .proj-card .proj-bottom .proj-meta span {
          display: flex; align-items: center; gap: 0.3rem;
          font-size: 0.7rem; color: rgba(255,255,255,0.85);
        }

        .proj-card .proj-bottom .proj-actions {
          position: absolute;
          bottom: 0.9rem; left: 1.5rem; right: 1.5rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .proj-card .proj-bottom .proj-actions .proj-action-btn {
          background: white; border: none; border-radius: 20px;
          font-size: 0.65rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em;
          padding: 0.35rem 0.8rem;
          display: flex; align-items: center; gap: 0.3rem;
          cursor: pointer; transition: all 0.2s;
          box-shadow: rgba(0,0,0,0.12) 0px 4px 8px;
        }
        .proj-card .proj-bottom .proj-actions .proj-action-btn.edit { color: ${bg}; }
        .proj-card .proj-bottom .proj-actions .proj-action-btn.edit:hover { background: ${bg}22; }
        .proj-card .proj-bottom .proj-actions .proj-action-btn.del { color: #ef4444; }
        .proj-card .proj-bottom .proj-actions .proj-action-btn.del:hover { background: #fee2e2; }

        .proj-card .proj-badge {
          position: absolute; top: 1.1rem; right: 1.2rem; z-index: 4;
        }
        .proj-card .proj-badge span {
          font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: ${bg};
          background: ${bg}18; border: 1px solid ${bg}33;
          border-radius: 20px; padding: 0.2rem 0.6rem;
        }

        .proj-card:hover { border-top-left-radius: 55px; }
        .proj-card:hover .proj-bottom {
          top: 20%;
          border-radius: 80px 29px 29px 29px;
          transition: all 0.5s cubic-bezier(0.645,0.045,0.355,1) 0.2s;
        }
        .proj-card:hover .proj-bottom .proj-meta { opacity: 1; transform: translateY(0); }
        .proj-card:hover .proj-pic {
          width: 100px; height: 100px; aspect-ratio: 1;
          top: 10px; left: 10px; border-radius: 50%;
          z-index: 3;
          border: 7px solid ${bg}88;
          box-shadow: ${shadow} 0px 5px 5px 0px;
          transition: all 0.5s ease-in-out, z-index 0.5s ease-in-out 0.1s;
        }
        .proj-card:hover .proj-pic:hover { transform: scale(1.25); border-radius: 0; }
        .proj-card:hover .proj-pic .mono-text {
          font-size: 2rem; opacity: 0.7;
          transition: all 0.5s ease-in-out 0.5s;
        }
      `}</style>

      <div className="proj-card">
        {project.contract_number && (
          <div className="proj-badge">
            <span>#{project.contract_number}</span>
          </div>
        )}

        <div className="proj-pic">
          <span className="mono-text">{mono}</span>
        </div>

        <div className="proj-bottom">
          <div className="proj-content">
            <span className="proj-name">{project.name}</span>
            <span className="proj-company">
              {project.company_name ?? "—"}
            </span>
            {adminNames.length > 0 && (
              <span className="proj-admins">
                {adminNames.slice(0, 2).join(", ")}
                {adminNames.length > 2 ? ` +${adminNames.length - 2} more` : ""}
              </span>
            )}
            {project.description && (
              <span className="proj-desc">{project.description}</span>
            )}
          </div>

          <div className="proj-meta">
            {(project.start_date || project.expected_end) && (
              <span>
                <Calendar size={11} color="rgba(255,255,255,0.9)" />
                {project.start_date && new Date(project.start_date).toLocaleDateString()}
                {project.start_date && project.expected_end && " → "}
                {project.expected_end && new Date(project.expected_end).toLocaleDateString()}
              </span>
            )}
            <span>
              <Users size={11} color="rgba(255,255,255,0.9)" />
              {project.member_count ?? 0} member{project.member_count !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="proj-actions">
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="proj-action-btn edit" onClick={onEdit}>
                <Pencil size={10} /> Edit
              </button>
              <button className="proj-action-btn del" onClick={onDelete}>
                <Trash2 size={10} /> Delete
              </button>
            </div>
            <Mail size={16} color="rgba(255,255,255,0.7)" />
          </div>
        </div>
      </div>
    </>
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

      {modal === "create" && (
        <ProjectModal
          companies={companies}
          teamUsers={teamUsers}
          onSave={data => { createProject.mutate(data); setModal(null); }}
          onClose={() => setModal(null)} />
      )}

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