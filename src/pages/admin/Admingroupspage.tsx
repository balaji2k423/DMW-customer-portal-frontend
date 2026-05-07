import { useState } from "react";
import {
  Plus, Search, X, Trash2, Users, FolderOpen, Pencil,
  ChevronRight, UserPlus, FolderPlus, Check,
} from "lucide-react";
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from "@/hooks/useAdminGroups";
import { useUsers } from "@/hooks/useAdminUsers";
import { useAdminProjects } from "@/hooks/useAdminProjects";

// ─── Multi-select combo ───────────────────────────────────────────────────────

function MultiSelect<T extends { id: number; label: string }>({
  options, selected, onChange, placeholder,
}: {
  options: T[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  const visible = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm text-left outline-none focus:border-orange-400 transition-all"
      >
        <span className={selected.length ? "text-foreground" : "text-muted-foreground"}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-xl">
          <div className="p-2">
            <input
              autoFocus
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto pb-2">
            {visible.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
            ) : visible.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                  selected.includes(o.id) ? "bg-orange-500 border-orange-500" : "border-border"
                }`}>
                  {selected.includes(o.id) && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Group form modal ─────────────────────────────────────────────────────────

type GroupFormData = { name: string; description: string; user_ids: number[]; project_ids: number[] };

function GroupModal({
  initial,
  userOptions,
  projectOptions,
  onSave,
  onClose,
}: {
  initial?: Partial<GroupFormData> & { id?: number };
  userOptions: { id: number; label: string }[];
  projectOptions: { id: number; label: string }[];
  onSave: (data: GroupFormData) => void;
  onClose: () => void;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<GroupFormData>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    user_ids: initial?.user_ids ?? [],
    project_ids: initial?.project_ids ?? [],
  });

  const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">{isEdit ? "Edit Group" : "Create Group"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Group Name</label>
            <input
              className={field} required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              className={`${field} resize-none h-16`}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <UserPlus className="h-3.5 w-3.5" /> Members
            </label>
            <MultiSelect
              options={userOptions}
              selected={form.user_ids}
              onChange={ids => setForm(f => ({ ...f, user_ids: ids }))}
              placeholder="Select users…"
            />
            {form.user_ids.length > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">{form.user_ids.length} user(s) selected</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5" /> Projects
            </label>
            <MultiSelect
              options={projectOptions}
              selected={form.project_ids}
              onChange={ids => setForm(f => ({ ...f, project_ids: ids }))}
              placeholder="Assign projects…"
            />
            {form.project_ids.length > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">{form.project_ids.length} project(s) selected</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">
              {isEdit ? "Save Changes" : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({
  group,
  onEdit,
  onDelete,
}: {
  group: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 hover:border-orange-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="font-semibold">{group.name}</h3>
          {group.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
            <Users className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <div>
            <div className="font-semibold leading-none">{group.member_count}</div>
            <div className="text-[10px] text-muted-foreground">Members</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
            <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div>
            <div className="font-semibold leading-none">{group.project_count}</div>
            <div className="text-[10px] text-muted-foreground">Projects</div>
          </div>
        </div>

        {group.created_by_name && (
          <div className="ml-auto text-[11px] text-muted-foreground">
            by {group.created_by_name}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminGroupsPage() {
  const { data: groups = [], isLoading }  = useGroups();
  const { data: users = [] }              = useUsers();
  const { data: projects = [] }           = useAdminProjects();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [search, setSearch]   = useState("");
  const [modal, setModal]     = useState<null | "create" | { id: number; data: any }>(null);
  const [toDelete, setDelete] = useState<null | { id: number; name: string }>(null);

  const userOptions = users.map(u => ({
    id: u.id,
    label: `${u.first_name} ${u.last_name} (${u.email})`,
  }));

  const projectOptions = projects.map(p => ({
    id: p.id,
    label: `${p.name} — ${p.customer_name ?? ""}`,
  }));

  const filtered = groups.filter(g =>
    (g.name + (g.description ?? "")).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Groups</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organise users and projects into teams
          </p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Group
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-2xl font-bold">{groups.length}</div>
          <div className="text-xs text-muted-foreground">Total Groups</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-2xl font-bold">
            {groups.reduce((s, g) => s + (g.member_count ?? 0), 0)}
          </div>
          <div className="text-xs text-muted-foreground">Total Members</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-2xl font-bold">
            {groups.reduce((s, g) => s + (g.project_count ?? 0), 0)}
          </div>
          <div className="text-xs text-muted-foreground">Project Assignments</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search groups…"
          className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium">No groups yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first group to organise users and projects.</p>
          <button
            onClick={() => setModal("create")}
            className="mt-4 flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" /> Create Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(g => (
            <GroupCard
              key={g.id}
              group={g}
              onEdit={() => setModal({ id: g.id, data: g })}
              onDelete={() => setDelete({ id: g.id, name: g.name })}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modal === "create" && (
        <GroupModal
          userOptions={userOptions}
          projectOptions={projectOptions}
          onSave={data => { createGroup.mutate(data); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal && modal !== "create" && (
        <GroupModal
          initial={{ id: modal.id, ...modal.data }}
          userOptions={userOptions}
          projectOptions={projectOptions}
          onSave={data => { updateGroup.mutate({ id: modal.id, ...data }); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Trash2 className="h-5 w-5 text-rose-600" />
            </div>
            <h3 className="mb-1 text-base font-semibold">Delete Group</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">{toDelete.name}</span>? All member and project assignments will be removed.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDelete(null)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={() => { deleteGroup.mutate(toDelete.id); setDelete(null); }}
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