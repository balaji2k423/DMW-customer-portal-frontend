import { useState } from "react";
import {
  Search, Plus, ChevronUp, ChevronDown, X,
  Pencil, Trash2,
} from "lucide-react";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/useAdminUsers";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserFormData = {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company: string;
  phone: string;
  password?: string;
};

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string }> = {
  admin:           { label: "Admin",           color: "bg-rose-100 text-rose-700 border-rose-200" },
  customer_admin:  { label: "Customer Admin",  color: "bg-violet-100 text-violet-700 border-violet-200" },
  customer_user:   { label: "Customer User",   color: "bg-sky-100 text-sky-700 border-sky-200" },
  project_manager: { label: "Project Manager", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role] ?? { label: role, color: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${m.color}`}>
      {m.label}
    </span>
  );
}

// ─── User form modal ──────────────────────────────────────────────────────────

function UserModal({
  initial,
  onSave,
  onClose,
  isSaving,
}: {
  initial?: Partial<UserFormData> & { id?: number };
  onSave: (data: UserFormData) => void;
  onClose: () => void;
  isSaving?: boolean;
}) {
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<UserFormData>({
    email:      initial?.email      ?? "",
    first_name: initial?.first_name ?? "",
    last_name:  initial?.last_name  ?? "",
    role:       initial?.role       ?? "customer_user",
    company:    initial?.company    ?? "",
    phone:      initial?.phone      ?? "",
    password:   "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  const set = (k: keyof UserFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }));
      setErrors(prev => ({ ...prev, [k]: undefined }));
    };

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!form.email)      newErrors.email      = "Email is required.";
    if (!form.first_name) newErrors.first_name = "First name is required.";
    if (!form.last_name)  newErrors.last_name  = "Last name is required.";

    if (!isEdit && (!form.password || form.password.length < 8)) {
      newErrors.password = "Password must be at least 8 characters.";
    }
    if (isEdit && form.password && form.password.length > 0 && form.password.length < 8) {
      newErrors.password = "New password must be at least 8 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data: UserFormData = { ...form };
    // Strip blank password — backend handles omission gracefully
    if (!data.password) delete data.password;

    onSave(data);
  }

  const field = (hasError: boolean) =>
    `w-full rounded-lg border ${hasError ? "border-rose-400" : "border-border"} bg-background px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">{isEdit ? "Edit User" : "Create User"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-4">

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                className={field(!!errors.first_name)}
                value={form.first_name}
                onChange={set("first_name")}
                placeholder="Jane"
              />
              {errors.first_name && <p className="mt-1 text-xs text-rose-500">{errors.first_name}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                className={field(!!errors.last_name)}
                value={form.last_name}
                onChange={set("last_name")}
                placeholder="Doe"
              />
              {errors.last_name && <p className="mt-1 text-xs text-rose-500">{errors.last_name}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              className={field(!!errors.email)}
              value={form.email}
              onChange={set("email")}
              placeholder="jane@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {isEdit
                ? "New Password"
                : <>Password <span className="text-rose-500">*</span></>
              }
            </label>
            <input
              type="password"
              className={field(!!errors.password)}
              value={form.password}
              onChange={set("password")}
              placeholder={isEdit ? "Leave blank to keep current password" : "Min. 8 characters"}
              autoComplete="new-password"
            />
            {errors.password
              ? <p className="mt-1 text-xs text-rose-500">{errors.password}</p>
              : isEdit && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave blank to keep the current password unchanged.
                </p>
              )
            }
          </div>

          {/* Role + Company row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Role</label>
              <select className={field(false)} value={form.role} onChange={set("role")}>
                <option value="customer_user">Customer User</option>
                <option value="customer_admin">Customer Admin</option>
                <option value="project_manager">Project Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Company</label>
              <input
                className={field(false)}
                value={form.company}
                onChange={set("company")}
                placeholder="Acme Corp"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
            <input
              className={field(false)}
              value={form.phone}
              onChange={set("phone")}
              placeholder="+1 555 000 0000"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
            >
              {isSaving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  name,
  onConfirm,
  onClose,
  isDeleting,
}: {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
  isDeleting?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
          <Trash2 className="h-5 w-5 text-rose-600" />
        </div>
        <h3 className="mb-1 text-base font-semibold">Delete User</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">{name}</span>? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 transition-colors"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type SortKey = "email" | "role" | "date_joined";

export default function AdminUsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [search,     setSearch]  = useState("");
  const [roleFilter, setRole]    = useState("all");
  const [sort, setSort]          = useState<{ key: SortKey; asc: boolean }>({ key: "date_joined", asc: false });
  const [modal, setModal]        = useState<null | "create" | { id: number; data: any }>(null);
  const [toDelete, setDelete]    = useState<null | { id: number; name: string }>(null);

  // ─── Filter + sort ──────────────────────────────────────────────────────────

  const filtered = users
    .filter(u => roleFilter === "all" || u.role === roleFilter)
    .filter(u =>
      `${u.first_name} ${u.last_name} ${u.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const v = (x: any) => x[sort.key] ?? "";
      return sort.asc
        ? String(v(a)).localeCompare(String(v(b)))
        : String(v(b)).localeCompare(String(v(a)));
    });

  function toggleSort(key: SortKey) {
    setSort(s => s.key === key ? { ...s, asc: !s.asc } : { key, asc: true });
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort.key === k
      ? sort.asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3 opacity-30" />;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleCreate(data: UserFormData) {
    createUser.mutate(data, { onSuccess: () => setModal(null) });
  }

  function handleUpdate(id: number, data: UserFormData) {
    updateUser.mutate({ id, ...data }, { onSuccess: () => setModal(null) });
  }

  function handleDelete(id: number) {
    deleteUser.mutate(id, { onSuccess: () => setDelete(null) });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} total users</p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(ROLE_META).map(([role, m]) => (
          <div key={role} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-2xl font-bold">{users.filter(u => u.role === role).length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{m.label}s</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRole(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-orange-400 transition-all"
        >
          <option value="all">All roles</option>
          {Object.entries(ROLE_META).map(([k, m]) => (
            <option key={k} value={k}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <th className="px-5 py-3 text-left">
                <button className="flex items-center gap-1" onClick={() => toggleSort("email")}>
                  User <SortIcon k="email" />
                </button>
              </th>
              <th className="px-5 py-3 text-left">
                <button className="flex items-center gap-1" onClick={() => toggleSort("role")}>
                  Role <SortIcon k="role" />
                </button>
              </th>
              <th className="px-5 py-3 text-left">Company</th>
              <th className="px-5 py-3 text-left">
                <button className="flex items-center gap-1" onClick={() => toggleSort("date_joined")}>
                  Joined <SortIcon k="date_joined" />
                </button>
              </th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map(user => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">

                  {/* User */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <div>
                        <div className="font-medium">{user.first_name} {user.last_name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-3.5">
                    <RoleBadge role={user.role} />
                  </td>

                  {/* Company */}
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {user.company || "—"}
                  </td>

                  {/* Joined */}
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                      user.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setModal({ id: user.id, data: user })}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDelete({ id: user.id, name: `${user.first_name} ${user.last_name}` })}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {modal === "create" && (
        <UserModal
          onSave={handleCreate}
          onClose={() => setModal(null)}
          isSaving={createUser.isPending}
        />
      )}

      {/* Edit modal */}
      {modal && modal !== "create" && (
        <UserModal
          initial={{ id: modal.id, ...modal.data }}
          onSave={data => handleUpdate(modal.id, data)}
          onClose={() => setModal(null)}
          isSaving={updateUser.isPending}
        />
      )}

      {/* Delete confirm */}
      {toDelete && (
        <DeleteConfirm
          name={toDelete.name}
          onConfirm={() => handleDelete(toDelete.id)}
          onClose={() => setDelete(null)}
          isDeleting={deleteUser.isPending}
        />
      )}
    </div>
  );
}