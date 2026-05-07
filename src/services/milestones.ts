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
  status: "todo" | "in_progress" | "done";
  assignee_name?: string;
  due_date?: string;
  order: number;
}

export interface Milestone {
  id: number;
  project: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "delayed" | "cancelled";
  planned_date: string;
  actual_date: string | null;
  order: number;
  owner_name: string;
  deliverable_count: number;
  is_signed_off: boolean;
  is_delayed: boolean;
  deliverables: Deliverable[];
  sign_off: SignOff | null;
  subtasks: Subtask[];
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

export const milestonesService = {
  // List projects the current user can access (admin sees all, customers see theirs)
  listProjects: async (): Promise<ProjectOption[]> => {
    const { data } = await api.get("/projects/", { params: { page_size: 500 } });
    const rows: any[] = data.results ?? data;
    return rows.map((p: any) => ({ id: p.id, name: p.name }));
  },

  // Get all milestones, optionally filtered by project
  list: async (projectId?: number): Promise<Milestone[]> => {
    const params = projectId ? { project: projectId } : {};
    const { data } = await api.get("/milestones/", { params });
    return data.results ?? data;
  },

  // Get timeline for a specific project (used by the stepper)
  timeline: async (projectId: number): Promise<TimelineResponse> => {
    const { data } = await api.get(`/milestones/project/${projectId}/timeline/`);
    return data;
  },

  // Get single milestone detail
  get: async (id: number): Promise<Milestone> => {
    const { data } = await api.get(`/milestones/${id}/`);
    return data;
  },

  // Create a new milestone (admin / project_manager only)
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

  // Update a milestone (admin / project_manager only)
  update: async (
    id: number,
    payload: Partial<{
      title:        string;
      description:  string;
      status:       string;
      planned_date: string;
      actual_date:  string;
      order:        number;
    }>
  ): Promise<Milestone> => {
    const { data } = await api.patch(`/milestones/${id}/`, payload);
    return data;
  },

  // Delete a milestone (admin only)
  delete: async (id: number): Promise<void> => {
    await api.delete(`/milestones/${id}/`);
  },

  // Sign off a milestone (customer_admin only)
  signOff: async (id: number, remarks?: string): Promise<SignOff> => {
    const { data } = await api.post(`/milestones/${id}/signoff/`, { remarks });
    return data;
  },

  // ── Subtasks ──────────────────────────────────────────────────────────────

  // List all subtasks for a milestone
  listSubtasks: async (milestoneId: number): Promise<Subtask[]> => {
    const { data } = await api.get(`/milestones/${milestoneId}/subtasks/`);
    return data.results ?? data;
  },

  // Create a subtask under a milestone (admin / project_manager only)
  createSubtask: async (payload: CreateSubtaskPayload): Promise<Subtask> => {
    const { data } = await api.post(
      `/milestones/${payload.milestone_id}/subtasks/`,
      payload
    );
    return data;
  },

  // Update a subtask — status toggle, rename, reassign, etc.
  updateSubtask: async (
    id: number,
    payload: UpdateSubtaskPayload
  ): Promise<Subtask> => {
    const { data } = await api.patch(`/subtasks/${id}/`, payload);
    return data;
  },

  // Delete a subtask (admin / project_manager only)
  deleteSubtask: async (id: number): Promise<void> => {
    await api.delete(`/subtasks/${id}/`);
  },

  // Bulk-reorder subtasks by passing an ordered array of ids
  reorderSubtasks: async (
    milestoneId: number,
    orderedIds: number[]
  ): Promise<void> => {
    await api.post(`/milestones/${milestoneId}/subtasks/reorder/`, {
      order: orderedIds,
    });
  },
};