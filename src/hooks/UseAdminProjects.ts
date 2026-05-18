/**
 * src/hooks/UseAdminProjects.ts
 *
 * React Query hooks for the Admin Projects page.
 *
 * API client: @/lib/api  (same as companyMaster.ts / companyMasterService)
 *
 * Hooks exported:
 *   useAdminProjects()
 *   useCreateProject()
 *   useUpdateProject()
 *   useDeleteProject()
 *   useCompanies()                        – Step 1: company master dropdown
 *   useCustomerAdminsByCompany(companyId) – Step 2: admins for selected company
 *   useTeamUsers()                        – project_manager / customer_user list
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Company {
  id:           number;
  company_name: string;
  city?:        string;
  state?:       string;
}

export interface CustomerAdmin {
  id:        number;
  email:     string;
  full_name: string;
}

export interface TeamUser {
  id:        number;
  email:     string;
  full_name: string;
  role:      string;
}

export interface ProjectListItem {
  id:              number;
  name:            string;
  company:         number | null;
  company_name:    string | null;
  customer_admins: string[];
  status:          string;
  progress:        number;
  robot_model:     string;
  start_date:      string | null;
  expected_end:    string | null;
  member_count:    number;
  created_at:      string;
}

// ─── Project hooks ────────────────────────────────────────────────────────────

export function useAdminProjects() {
  return useQuery<ProjectListItem[]>({
    queryKey: ["admin-projects"],
    queryFn:  async () => {
      const { data } = await api.get("/projects/");
      return data.results ?? data;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      api.post("/projects/", payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: any) =>
      api.patch(`/projects/${id}/`, payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/projects/${id}/`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["admin-projects"] }),
  });
}

// ─── Dropdown hooks ───────────────────────────────────────────────────────────

/**
 * Step 1 — Company master dropdown.
 * Re-uses the same /company/companies/ endpoint as companyMasterService.list()
 * so no extra backend endpoint is needed for the dropdown.
 */
export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ["company-dropdown"],
    queryFn:  async () => {
      const { data } = await api.get("/company/companies/");
      return data.results ?? data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Step 2 — customer_admin users belonging to the selected company.
 * Endpoint: GET /projects/companies/<companyId>/customer-admins/
 * Only fires when companyId is a valid positive number.
 */
export function useCustomerAdminsByCompany(companyId: number | null) {
  return useQuery<CustomerAdmin[]>({
    queryKey: ["customer-admins-by-company", companyId],
    queryFn:  async () => {
      const { data } = await api.get(
        `/projects/companies/${companyId}/customer-admins/`
      );
      return data.results ?? data;
    },
    enabled:   !!companyId && companyId > 0,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * All active users — for the Team Members panel (project_manager / customer_user).
 * Endpoint: GET /projects/users/dropdown/
 */
export function useTeamUsers() {
  return useQuery<TeamUser[]>({
    queryKey: ["team-users-dropdown"],
    queryFn:  async () => {
      const { data } = await api.get("/projects/users/dropdown/");
      return data.results ?? data;
    },
    staleTime: 2 * 60 * 1000,
  });
}