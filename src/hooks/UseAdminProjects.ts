import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

// ─── Projects ─────────────────────────────────────────────────────────────────

export function useAdminProjects() {
  return useQuery({
    queryKey: ["admin", "projects"],
    queryFn: () =>
      api
        .get("/projects/")
        .then(r => (Array.isArray(r.data) ? r.data : (r.data.results ?? []))),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      api
        .post("/projects/", {
          name:               data.name,
          customer:           Number(data.customer),
          description:        data.description,
          contract_number:    data.contract_number,
          start_date:         data.start_date   || null,
          expected_end:       data.expected_end || null,
          member_assignments: (data.member_assignments ?? []).map((m: any) => ({
            user: Number(m.user),
            role: m.role,
          })),
        })
        .then(r => r.data),
    onSuccess: () => {
      // Refresh the project list
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      // The backend just bulk-created 7 milestones — keep milestone caches fresh
      qc.invalidateQueries({ queryKey: ["milestones"] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api
        .patch(`/projects/${id}/`, {
          name:               data.name,
          customer:           Number(data.customer),
          description:        data.description,
          contract_number:    data.contract_number,
          start_date:         data.start_date   || null,
          expected_end:       data.expected_end || null,
          member_assignments: (data.member_assignments ?? []).map((m: any) => ({
            user: Number(m.user),
            role: m.role,
          })),
        })
        .then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/projects/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      qc.invalidateQueries({ queryKey: ["milestones"] });
    },
  });
}

// ─── Shared fetch — single call, two consumers ────────────────────────────────

function useAllDropdownUsers() {
  return useQuery({
    queryKey: ["dropdown", "all-users"],
    queryFn: () =>
      api
        .get("/projects/users/dropdown/")
        .then(r => (Array.isArray(r.data) ? r.data : (r.data.results ?? []))),
    staleTime: 60_000,
  });
}

// ─── Dropdowns ────────────────────────────────────────────────────────────────

export function useCustomerUsers() {
  return useQuery({
    queryKey: ["dropdown", "customers"],
    queryFn: () =>
      api
        .get("/projects/customers/dropdown/")
        .then(r => (Array.isArray(r.data) ? r.data : (r.data.results ?? []))),
    staleTime: 60_000,
  });
}

export function useTeamUsers() {
  const query = useAllDropdownUsers();
  return {
    ...query,
    data: (query.data ?? []).filter(
      (u: any) => u.role !== "customer_admin" && u.role !== "customer_user"
    ),
  };
}