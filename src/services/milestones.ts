import api from "@/lib/api";

export interface Deliverable {
  id: number;
  title: string;
  description: string;
  status: "pending" | "submitted" | "approved" | "rejected";
  file: string | null;
  due_date: string | null;
  milestone: number;
}

export interface SignOff {
  id: number;
  milestone: number;
  signed_by: number;
  signed_by_name: string;
  signed_at: string;
  remarks: string;
}

export interface Subtask {
  id: number;
  milestone_id: number;
  title: string;
  status: "todo" | "in_progress" | "done" | "approved";
  assignee_name?: string;
  due_date?: string;
  order: number;
}

export interface HistoryEntry {
  id: number;
  action: string;
  detail: string;
  old_value: string;
  new_value: string;
  delay_reason: string;
  actor_name: string;
  created_at: string;
}

export interface Milestone {
  id: number;
  project: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "delayed" | "cancelled";
  planned_date: string;
  actual_date: string | null;
  /** Set when a milestone is rescheduled — stores the new date before it replaces planned_date */
  rescheduled_date: string | null;
  /** Mandatory reason text whenever planned_date is changed */
  delay_reason: string;
  /** Overall project status tracked on this milestone */
  project_status: "not_started" | "in_progress" | "on_hold" | "completed" | "cancelled" | "";
  order: number;
  owner_name: string;
  deliverable_count: number;
  is_signed_off: boolean;
  is_delayed: boolean;
  deliverables: Deliverable[];
  sign_off: SignOff | null;
  subtasks: Subtask[];
  history?: HistoryEntry[];
  created_at: string;
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

export interface ProjectOption {
  id: number;
  name: string;
  customer_id?: number | null;
  customer_name?: string | null;
}

export interface CustomerAdminOption {
  id: number;
  name: string;
  email: string;
  company: string;
  project_ids: number[];
}

export interface CreateSubtaskPayload {
  milestone_id: number;
  title: string;
  status?: Subtask["status"];
  assignee_name?: string;
  due_date?: string;
  order?: number;
}

export interface UpdateSubtaskPayload {
  title?: string;
  status?: Subtask["status"];
  assignee_name?: string;
  due_date?: string;
  order?: number;
}

export interface ReschedulePayload {
  new_planned_date: string;
  delay_reason: string;
}

export const milestonesService = {
  listCustomers: async (): Promise<{ id: number | string; name: string }[]> => {
    const { data } = await api.get("/milestones/customers/");
    return data;
  },

  listCustomerAdmins: async (): Promise<CustomerAdminOption[]> => {
    const { data } = await api.get("/milestones/customer-admins/");
    return data;
  },

  listProjects: async (): Promise<ProjectOption[]> => {
    const { data } = await api.get("/projects/", { params: { page_size: 500 } });
    const rows: any[] = data.results ?? data;
    return rows.map((p: any) => ({
      id:            p.id,
      name:          p.name,
      customer_id:   p.customer_id   ?? p.company_id   ?? p.customer   ?? null,
      customer_name: p.customer_name ?? p.company_name ?? p.company     ?? null,
    }));
  },

  list: async (
    projectId?: number,
    customerId?: number | string,
    customerAdminId?: number,
  ): Promise<Milestone[]> => {
    const params: Record<string, any> = {};
    if (projectId)       params.project           = projectId;
    if (customerId)      params.customer          = customerId;
    if (customerAdminId) params.customer_admin_id = customerAdminId;
    const { data } = await api.get("/milestones/", { params });
    return data.results ?? data;
  },

  timeline: async (projectId: number): Promise<TimelineResponse> => {
    const { data } = await api.get(`/milestones/project/${projectId}/timeline/`);
    return data;
  },

  get: async (id: number): Promise<Milestone> => {
    const { data } = await api.get(`/milestones/${id}/`);
    return data;
  },

  create: async (payload: {
    project:      number;
    title:        string;
    description:  string;
    status:       string;
    planned_date: string;
    order:        number;
  }): Promise<Milestone> => {
    const { data } = await api.post("/milestones/", payload);
    return data;
  },

  update: async (
    id: number,
    payload: Partial<{
      title:          string;
      description:    string;
      status:         string;
      project_status: string;
      planned_date:   string;
      actual_date:    string;
      delay_reason:   string;
      order:          number;
    }>
  ): Promise<Milestone> => {
    const { data } = await api.patch(`/milestones/${id}/`, payload);
    return data;
  },

  /** Reschedule with mandatory delay reason — recorded in audit log */
  reschedule: async (id: number, payload: ReschedulePayload): Promise<Milestone> => {
    const { data } = await api.post(`/milestones/${id}/reschedule/`, payload);
    return data;
  },

  /** Full audit log for a milestone */
  getHistory: async (id: number): Promise<HistoryEntry[]> => {
    const { data } = await api.get(`/milestones/${id}/history/`);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/milestones/${id}/`);
  },

  signOff: async (id: number, remarks?: string): Promise<SignOff> => {
    const { data } = await api.post(`/milestones/${id}/signoff/`, { remarks });
    return data;
  },

  // ── Subtasks ──────────────────────────────────────────────────────────────

  listSubtasks: async (milestoneId: number): Promise<Subtask[]> => {
    const { data } = await api.get(`/milestones/${milestoneId}/subtasks/`);
    return data.results ?? data;
  },

  createSubtask: async (payload: CreateSubtaskPayload): Promise<Subtask> => {
    const { data } = await api.post(
      `/milestones/${payload.milestone_id}/subtasks/`,
      payload
    );
    return data;
  },

  updateSubtask: async (id: number, payload: UpdateSubtaskPayload): Promise<Subtask> => {
    const { data } = await api.patch(`/subtasks/${id}/`, payload);
    return data;
  },

  deleteSubtask: async (id: number): Promise<void> => {
    await api.delete(`/subtasks/${id}/`);
  },

  reorderSubtasks: async (milestoneId: number, orderedIds: number[]): Promise<void> => {
    await api.post(`/milestones/${milestoneId}/subtasks/reorder/`, { order: orderedIds });
  },
};