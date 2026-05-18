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

export type Customer = {
  id: number;
  name: string;
};

export type Project = {
  id: number;
  name: string;
  customer_id?: number;
};

/** Matches company_master.Company */
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

// ─── Company hook (fetches from company master) ───────────────────────────────

/**
 * Fetches all companies from the company master endpoint.
 * Used to populate the mandatory company dropdown on the user create/edit form.
 */
export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ["admin", "companies"],
    queryFn: () =>
      api
        .get("/company/companies/")
        .then(r => (Array.isArray(r.data) ? r.data : (r.data.results ?? []))),
    staleTime: 5 * 60 * 1000, // cache for 5 min — company list rarely changes
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

// ─── Customer + Project hooks (for permission dropdowns) ─────────────────────

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ["admin", "customers"],
    queryFn: () =>
      api
        .get("/customers/")
        .then(r => (Array.isArray(r.data) ? r.data : (r.data.results ?? []))),
  });
}

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