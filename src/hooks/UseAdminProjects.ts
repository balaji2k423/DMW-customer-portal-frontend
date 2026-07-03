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
 *   useTeamUsers()                        – DMW-only project_manager / customer_user list
 *   createProjectMilestones(projectId, milestones) – creates the 5 phase
 *     milestones on the milestones app right after a project is created,
 *     using the admin-chosen dates (POST /milestones/ per phase).
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
  company?:  string;
}

// A member already assigned to a project (customer_admin or team member)
export interface ProjectMemberInfo {
  id:    number;
  name:  string;
  email: string;
  role:  string;
}

export interface ProjectListItem {
  id:              number;
  name:            string;
  company:         number | null;
  company_name:    string | null;
  customer_admins: string[];
  // FIX: the card/modal previously had no way to show who is actually on
  // the project besides a bare count — team_members now carries the full
  // project_manager / customer_user roster returned by the backend.
  team_members:    ProjectMemberInfo[];
  status:          string;
  progress:        number;
  robot_model:     string;
  start_date:      string | null;
  expected_end:    string | null;
  member_count:    number;
  created_at:      string;
}

// One of the 5 project phases, with the date the admin chose for it
export interface MilestoneInput {
  order:        number;
  title:        string;
  planned_date: string; // YYYY-MM-DD
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

/**
 * Creates the 5 phase milestones for a freshly-created project, one POST
 * per phase to the milestones app (see milestones/urls.py — MilestoneListCreateView).
 * Called right after useCreateProject succeeds, using the dates the admin
 * typed in for each phase. The creating user is an admin, so the
 * `user_is_project_member` check on the milestones view passes automatically.
 */
export async function createProjectMilestones(
  projectId: number,
  milestones: MilestoneInput[]
) {
  return Promise.all(
    milestones.map(m =>
      api.post("/milestones/", {
        project:      projectId,
        title:        m.title,
        description:  "",
        status:       "pending",
        planned_date: m.planned_date,
        order:        m.order,
      })
    )
  );
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
 * DMW staff only — for the Team Members panel (project_manager / customer_user).
 * Endpoint: GET /projects/users/dropdown/
 * FIX: the backend now filters this to company === "DMW" server-side
 * (see UserDropdownView.get_queryset in projects/views.py), so customers
 * and other companies no longer show up as selectable team members.
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