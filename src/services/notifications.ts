import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "milestone_updated"
  | "milestone_completed"
  | "milestone_delayed"
  | "document_uploaded"
  | "document_updated"
  | "ticket_created"
  | "ticket_updated"
  | "ticket_assigned"
  | "ticket_resolved"
  | "ticket_commented"
  | "project_updated"
  | "sign_off_requested"
  | "sign_off_done";

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  actor_name: string;
  project_id: number | null;
  milestone_id: number | null;
  document_id: number | null;
  ticket_id: number | null;
  created_at: string;
}

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "uploaded"
  | "resolved"
  | "signed"
  | "commented"
  | "assigned";

export interface ActivityLog {
  id: number;
  action: ActivityAction;
  entity_type: string;
  entity_id: number | null;
  entity_name: string;
  detail: string;
  actor_name: string;
  project_name: string | null;
  created_at: string;
}

export interface UnreadCount {
  unread_count: number;
}

export interface MarkReadResponse {
  marked_read: number;
}

// ─── Notification Service ─────────────────────────────────────────────────────

export const notificationsService = {
  /**
   * GET /notifications/
   * Returns paginated notifications for the logged-in user.
   * Supports filtering by is_read and type.
   */
  list: async (params?: {
    is_read?: boolean;
    type?: NotificationType;
    ordering?: string;
  }): Promise<Notification[]> => {
    const { data } = await api.get("/notifications/", { params });
    return data.results ?? data;
  },

  /**
   * GET /notifications/unread-count/
   * Lightweight endpoint for the bell icon badge.
   */
  unreadCount: async (): Promise<UnreadCount> => {
    const { data } = await api.get("/notifications/unread-count/");
    return data;
  },

  /**
   * POST /notifications/mark-read/
   * Mark specific notifications as read:  { ids: [1, 2, 3] }
   * Mark all as read:                     { all: true }
   */
  markRead: async (
    payload: { ids: number[] } | { all: true }
  ): Promise<MarkReadResponse> => {
    const { data } = await api.post("/notifications/mark-read/", payload);
    return data;
  },

  /**
   * PATCH /notifications/<id>/read/
   * Marks a single notification as read and returns the updated object.
   */
  markSingleRead: async (id: number): Promise<Notification> => {
    const { data } = await api.patch(`/notifications/${id}/read/`);
    return data;
  },

  /**
   * DELETE /notifications/<id>/
   * Removes a notification permanently.
   */
  remove: async (id: number): Promise<void> => {
    await api.delete(`/notifications/${id}/`);
  },
};

// ─── Activity Log Service ─────────────────────────────────────────────────────

export const activityService = {
  /**
   * GET /notifications/activity/
   * Global activity feed.
   * Project managers see all; customers see only their project activity.
   */
  list: async (params?: {
    action?: ActivityAction;
    entity_type?: string;
    project?: number;
    ordering?: string;
  }): Promise<ActivityLog[]> => {
    const { data } = await api.get("/notifications/activity/", { params });
    return data.results ?? data;
  },

  /**
   * GET /notifications/activity/project/<project_pk>/
   * Activity feed scoped to a single project.
   */
  forProject: async (
    projectId: number,
    params?: {
      action?: ActivityAction;
      entity_type?: string;
      ordering?: string;
    }
  ): Promise<ActivityLog[]> => {
    const { data } = await api.get(
      `/notifications/activity/project/${projectId}/`,
      { params }
    );
    return data.results ?? data;
  },
};