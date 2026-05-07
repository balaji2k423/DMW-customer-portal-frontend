// milestonesApi.ts — Milestones API service layer
// Connects to Django REST Framework backend at /api/v1/milestones/
// Auth: JWT Bearer token (SimpleJWT) stored in localStorage as "access" (matches AuthContext)

const BASE_URL = "/api/v1/milestones";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Deliverable {
  id: number;
  milestone: number;
  title: string;
  description: string;
  status: "pending" | "submitted" | "approved" | "rejected";
  file: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignOff {
  id: number;
  milestone: number;
  signed_by: number;
  signed_by_name: string;
  signed_at: string;
  remarks: string;
}

export interface Milestone {
  id: number;
  project: number;
  owner: number | null;
  owner_name: string | null;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "delayed" | "cancelled";
  planned_date: string;
  actual_date: string | null;
  order: number;
  deliverable_count?: number;
  deliverables?: Deliverable[];
  sign_off?: SignOff | null;
  is_signed_off?: boolean;
  is_delayed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TimelineResponse {
  project_id: number;
  summary: {
    total: number;
    completed: number;
    pending: number;
    delayed: number;
  };
  milestones: Milestone[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MilestoneFilters {
  status?: string;
  project?: number;
  search?: string;
  ordering?: string;
}

export interface DeliverableFilters {
  status?: string;
  ordering?: string;
}

export interface MilestonePayload {
  project: number;
  owner?: number | null;
  title: string;
  description?: string;
  status?: string;
  planned_date: string;
  actual_date?: string | null;
  order?: number;
}

export interface ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
}

// ─── Core request helper ─────────────────────────────────────────────────────

function getToken(): string {
  return localStorage.getItem("access") ?? "";
}

interface RequestOptions {
  method?: string;
  body?: Record<string, unknown> | FormData | null;
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, method = "GET" } = options;

  // Strip undefined/empty values so URL stays clean
  const cleanParams = params
    ? Object.fromEntries(
        Object.entries(params).filter(
          ([, v]) => v !== undefined && v !== "" && v !== null
        )
      )
    : null;

  const fullUrl =
    cleanParams && Object.keys(cleanParams).length
      ? `${url}?${new URLSearchParams(
          cleanParams as Record<string, string>
        ).toString()}`
      : url;

  const isFormData = body instanceof FormData;
  const token = getToken();

  const response = await fetch(fullUrl, {
    method,
    headers: {
      // JSON content-type only for plain objects — browser sets multipart boundary for FormData
      ...(!isFormData && body !== undefined && { "Content-Type": "application/json" }),
      // JWT Bearer — required by SimpleJWT; no cookies/CSRF needed
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: isFormData
      ? body
      : body !== undefined && body !== null
      ? JSON.stringify(body)
      : undefined,
  });

  // 204 No Content — successful DELETE
  if (response.status === 204) return null as T;

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(
      data?.detail || data?.error || `Request failed (${response.status})`
    ) as ApiError;
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

// ─── Milestones ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/milestones/
 * List all milestones visible to the current user.
 * Project managers see all; others see only their project's milestones.
 */
export function getMilestones(
  filters: MilestoneFilters = {}
): Promise<PaginatedResponse<Milestone> | Milestone[]> {
  return request(`${BASE_URL}/`, { params: filters });
}

/**
 * POST /api/v1/milestones/
 * Create a milestone. Requires project_manager role.
 */
export function createMilestone(data: MilestonePayload): Promise<Milestone> {
  return request(`${BASE_URL}/`, { method: "POST", body: data as any });
}

/**
 * GET /api/v1/milestones/{id}/
 * Full detail — includes nested deliverables and sign_off.
 */
export function getMilestone(id: number): Promise<Milestone> {
  return request(`${BASE_URL}/${id}/`);
}

/**
 * PUT /api/v1/milestones/{id}/
 * Full update. Requires project_manager role.
 */
export function updateMilestone(
  id: number,
  data: MilestonePayload
): Promise<Milestone> {
  return request(`${BASE_URL}/${id}/`, { method: "PUT", body: data as any });
}

/**
 * PATCH /api/v1/milestones/{id}/
 * Partial update. Requires project_manager role.
 */
export function patchMilestone(
  id: number,
  data: Partial<MilestonePayload>
): Promise<Milestone> {
  return request(`${BASE_URL}/${id}/`, { method: "PATCH", body: data as any });
}

/**
 * DELETE /api/v1/milestones/{id}/
 * Requires project_manager role.
 */
export function deleteMilestone(id: number): Promise<null> {
  return request(`${BASE_URL}/${id}/`, { method: "DELETE" });
}

// ─── Sign-offs ────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/milestones/{id}/signoff/
 * Sign off a milestone. Requires customer_admin role.
 * Also auto-sets milestone status → completed.
 */
export function signOffMilestone(
  id: number,
  remarks = ""
): Promise<SignOff> {
  return request(`${BASE_URL}/${id}/signoff/`, {
    method: "POST",
    body: { remarks },
  });
}

/**
 * DELETE /api/v1/milestones/{id}/signoff/
 * Remove an existing sign-off. Requires project_manager role.
 */
export function removeSignOff(id: number): Promise<null> {
  return request(`${BASE_URL}/${id}/signoff/`, { method: "DELETE" });
}

// ─── Deliverables ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/milestones/{milestone_pk}/deliverables/
 */
export function getDeliverables(
  milestonePk: number,
  filters: DeliverableFilters = {}
): Promise<PaginatedResponse<Deliverable> | Deliverable[]> {
  return request(`${BASE_URL}/${milestonePk}/deliverables/`, { params: filters });
}

/**
 * POST /api/v1/milestones/{milestone_pk}/deliverables/
 * Pass a FormData instance to include a file upload.
 *
 * @example
 * const fd = new FormData();
 * fd.append("title", "Design Spec");
 * fd.append("status", "pending");
 * fd.append("file", fileInput.files[0]);
 * await createDeliverable(1, fd);
 */
export function createDeliverable(
  milestonePk: number,
  data: Partial<Deliverable> | FormData
): Promise<Deliverable> {
  return request(`${BASE_URL}/${milestonePk}/deliverables/`, {
    method: "POST",
    body: data as any,
  });
}

/**
 * GET /api/v1/milestones/{milestone_pk}/deliverables/{id}/
 */
export function getDeliverable(
  milestonePk: number,
  id: number
): Promise<Deliverable> {
  return request(`${BASE_URL}/${milestonePk}/deliverables/${id}/`);
}

/**
 * PUT /api/v1/milestones/{milestone_pk}/deliverables/{id}/
 */
export function updateDeliverable(
  milestonePk: number,
  id: number,
  data: Partial<Deliverable> | FormData
): Promise<Deliverable> {
  return request(`${BASE_URL}/${milestonePk}/deliverables/${id}/`, {
    method: "PUT",
    body: data as any,
  });
}

/**
 * PATCH /api/v1/milestones/{milestone_pk}/deliverables/{id}/
 */
export function patchDeliverable(
  milestonePk: number,
  id: number,
  data: Partial<Deliverable> | FormData
): Promise<Deliverable> {
  return request(`${BASE_URL}/${milestonePk}/deliverables/${id}/`, {
    method: "PATCH",
    body: data as any,
  });
}

/**
 * DELETE /api/v1/milestones/{milestone_pk}/deliverables/{id}/
 */
export function deleteDeliverable(
  milestonePk: number,
  id: number
): Promise<null> {
  return request(`${BASE_URL}/${milestonePk}/deliverables/${id}/`, {
    method: "DELETE",
  });
}

// ─── Project Timeline ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/milestones/project/{project_pk}/timeline/
 * Returns ordered milestones + summary stats for the stepper/timeline view.
 */
export function getProjectTimeline(projectPk: number): Promise<TimelineResponse> {
  return request(`${BASE_URL}/project/${projectPk}/timeline/`);
}