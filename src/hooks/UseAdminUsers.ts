import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GuestModule = "dashboard" | "tickets" | "milestones";

export type GuestPermission = {
  id: number;
  module: GuestModule;
  project_id: number | null;
  customer_id: number | null;
};

export type GuestPermissionPayload = Omit<GuestPermission, "id">;

// "Customer" in this context is a CustomUser (customer_admin / customer_user)
// belonging to a company — NOT company_master.Customer.
export type Customer = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  // Derived helper so existing UI that reads `.name` still works
  name: string;
};

export type Project = {
  id: number;
  name: string;
  customer_id?: number;
};

export type Company = {
  id: number;
  company_name: string;
  city: string;
  state: string;
  phone_number: string;
  email: string | null;
};

// ─── User hooks ───────────────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () =>
      api.get("/auth/admin/users/").then(r =>
        Array.isArray(r.data) ? r.data : (r.data.results ?? [])
      ),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      api.post("/auth/admin/users/create/", data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api.patch(`/auth/admin/users/${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/auth/admin/users/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// ─── Company hook ─────────────────────────────────────────────────────────────

export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ["admin", "companies"],
    queryFn: () =>
      api
        .get("/company/companies/")
        .then(r => (Array.isArray(r.data) ? r.data : (r.data.results ?? []))),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Guest permission hooks ───────────────────────────────────────────────────

export function useGuestPermissions(userId: number | null) {
  return useQuery<GuestPermission[]>({
    queryKey: ["admin", "guest-permissions", userId],
    queryFn: () =>
      api
        .get(`/auth/admin/users/${userId}/guest-permissions/`)
        .then(r => r.data),
    enabled: userId !== null,
  });
}

export function useSaveGuestPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      permissions,
    }: {
      userId: number;
      permissions: GuestPermissionPayload[];
    }) =>
      api
        .put(`/auth/admin/users/${userId}/guest-permissions/`, { permissions })
        .then(r => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["admin", "guest-permissions", variables.userId],
      });
    },
  });
}

// ─── Users by company ─────────────────────────────────────────────────────────
//
// Fetches CustomUsers with role customer_admin / customer_user whose
// `company` CharField matches the selected company's name.
// Replaces the old useCustomersByCompany which queried company_master.Customer
// (a table that has no data in this project).

export function useCustomersByCompany(companyId: number | null) {
  return useQuery<Customer[]>({
    queryKey: ["admin", "users-by-company", companyId],
    queryFn: () =>
      api
        .get("/auth/admin/users-by-company/", {
          params: { company_id: companyId },
        })
        .then(r => {
          const raw: any[] = Array.isArray(r.data)
            ? r.data
            : (r.data.results ?? []);
          // Attach a `.name` field so the modal UI (which renders c.name) works
          return raw.map(u => ({
            ...u,
            name: `${u.first_name} ${u.last_name}`.trim() || u.email,
          }));
        }),
    enabled: companyId !== null,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── All customers (no filter) ────────────────────────────────────────────────

export function useAllCustomers() {
  return useQuery<Customer[]>({
    queryKey: ["admin", "users-by-company", "all"],
    queryFn: () =>
      api
        .get("/auth/admin/users-by-company/")
        .then(r => {
          const raw: any[] = Array.isArray(r.data)
            ? r.data
            : (r.data.results ?? []);
          return raw.map(u => ({
            ...u,
            name: `${u.first_name} ${u.last_name}`.trim() || u.email,
          }));
        }),
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Project hook ─────────────────────────────────────────────────────────────

export function useProjects(customerId: number | null) {
  return useQuery<Project[]>({
    queryKey: ["admin", "projects", customerId],
    queryFn: () =>
      api
        .get("/projects/", {
          params: customerId ? { customer_id: customerId } : {},
        })
        .then(r => (Array.isArray(r.data) ? r.data : (r.data.results ?? []))),
    enabled: customerId !== null,
  });
}