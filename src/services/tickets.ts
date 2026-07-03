import api from "@/lib/api";

export interface Project {
  id: number;
  name: string;
  customer_id?: number | null;
  customer_name?: string | null;
}

export interface CustomerOption {
  id: number | string;
  name: string;
}

export interface CustomerAdminOption {
  id: number;
  name: string;
  email: string;
  company: string;
  project_ids: number[];
}

export interface TicketAttachment {
  id: number;
  filename: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface TicketComment {
  id: number;
  ticket: number;
  message: string;
  is_internal: boolean;
  author: number;
  author_name: string;
  author_role: string;
  created_at: string;
  updated_at: string;
}

/** Full profile of the assigned support engineer — shown once assigned */
export interface AssignedEngineer {
  id: number;
  full_name: string;
  email: string;
  designation: string;
  phone: string | null;
  avatar_url: string | null;
}

export interface TicketStatusHistory {
  id: number;
  from_status: string;
  to_status: string;
  note: string;
  changed_by_name: string;
  changed_at: string;
}

export interface Ticket {
  id: number;
  ticket_id: string;
  subject: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "on_hold" | "resolved" | "closed";
  sla_due: string | null;
  sla_breached: boolean;
  is_overdue: boolean;
  project: number;
  project_name: string;
  raised_by_name: string;
  assigned_to_name: string | null;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface TicketDetail extends Ticket {
  comments: TicketComment[];
  attachments: TicketAttachment[];
  status_history: TicketStatusHistory[];
  assigned_engineer: AssignedEngineer | null;
  resolved_at: string | null;
  time_to_resolve: number | null;
}

export interface TicketSummary {
  total: number;
  open: number;
  in_progress: number;
  on_hold: number;
  resolved: number;
  closed: number;
  overdue: number;
  by_priority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export const ticketsService = {
  summary: async (params?: { customer_id?: number | string; project?: number }): Promise<TicketSummary> => {
    const { data } = await api.get("/tickets/summary/", { params });
    return data;
  },

  list: async (params?: {
    status?: string;
    priority?: string;
    search?: string;
    customer_id?: number | string;
    project?: number;
  }): Promise<Ticket[]> => {
    const { data } = await api.get("/tickets/", { params });
    return data.results ?? data;
  },

  get: async (id: number): Promise<TicketDetail> => {
    const { data } = await api.get(`/tickets/${id}/`);
    return data;
  },

  create: async (payload: {
    project: number;
    subject: string;
    description: string;
    category: string;
    priority: string;
  }): Promise<Ticket> => {
    const { data } = await api.post("/tickets/", payload);
    return data;
  },

  changeStatus: async (
    id: number,
    status: string,
    note?: string
  ): Promise<TicketDetail> => {
    const { data } = await api.post(`/tickets/${id}/status/`, { status, note });
    return data;
  },

  addComment: async (
    ticketId: number,
    message: string
  ): Promise<TicketComment> => {
    const { data } = await api.post(`/tickets/${ticketId}/comments/`, {
      message,
      ticket: ticketId,
    });
    return data;
  },

  uploadAttachment: async (
    ticketId: number,
    file: File
  ): Promise<TicketAttachment> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post(`/tickets/${ticketId}/attachments/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const projectsService = {
  list: async (): Promise<Project[]> => {
    const { data } = await api.get("/projects/", { params: { page_size: 500 } });
    const rows: any[] = data.results ?? data;
    return rows.map((p: any) => ({
      id:            p.id,
      name:          p.name,
      customer_id:   p.customer_id   ?? p.company_id   ?? p.customer   ?? null,
      customer_name: p.customer_name ?? p.company_name ?? p.company     ?? null,
    }));
  },
};

export const customersService = {
  listCustomers: async (): Promise<CustomerOption[]> => {
    const { data } = await api.get("/tickets/customers/");
    return data;
  },

  listCustomerAdmins: async (company?: string): Promise<CustomerAdminOption[]> => {
    const params = company ? { company } : undefined;
    const { data } = await api.get("/milestones/customer-admins/", { params });
    return data;
  },
};