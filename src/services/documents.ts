import api from "@/lib/api";

export interface Document {
  id: number;
  title: string;
  category: string;
  version: string;
  status: "draft" | "published" | "archived";
  file_url: string;
  file_type: string;
  file_size: number;
  file_size_display: string;
  project: number;
  project_name: string;
  uploaded_by_name: string;
  download_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  version_count: number;
  versions?: DocumentVersion[];
  description?: string;
}

export interface DocumentVersion {
  id: number;
  version: string;
  file_url: string;
  uploaded_by_name: string;
  change_note: string;
  created_at: string;
}

export interface Category {
  value: string;
  label: string;
  count: number;
}

export interface UploadPayload {
  project: number;
  title: string;
  description?: string;
  category: string;
  file: File;
  version?: string;
  status?: string;
  is_public?: boolean;
}

export interface VersionUploadPayload {
  file: File;
  version: string;
  change_note?: string;
}

export const documentsService = {
  /** List documents — scoped automatically by the backend per role */
  list: async (params?: {
    category?: string;
    search?: string;
    project?: number;
    status?: string;
  }): Promise<Document[]> => {
    const { data } = await api.get("/documents/", { params });
    return data.results ?? data;
  },

  /** Full document detail including version history */
  get: async (id: number): Promise<Document> => {
    const { data } = await api.get(`/documents/${id}/`);
    return data;
  },

  /** Category folder view with counts */
  categories: async (): Promise<Category[]> => {
    const { data } = await api.get("/documents/categories/");
    return data;
  },

  /**
   * Upload a new document.
   * Max 5 MB — enforced on both frontend (guard) and backend (serializer + view).
   * Project managers may only upload to their assigned projects.
   */
  upload: async (payload: UploadPayload): Promise<Document> => {
    const form = new FormData();
    form.append("project",     String(payload.project));
    form.append("title",       payload.title);
    form.append("category",    payload.category);
    form.append("file",        payload.file);
    form.append("version",     payload.version ?? "v1.0");
    form.append("status",      payload.status  ?? "published");
    form.append("is_public",   String(payload.is_public ?? false));
    if (payload.description) form.append("description", payload.description);

    const { data } = await api.post("/documents/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  /**
   * Bump a document to a new version.
   * Archives the current file as a DocumentVersion row, then replaces it.
   * Max 5 MB.
   */
  uploadVersion: async (id: number, payload: VersionUploadPayload): Promise<Document> => {
    const form = new FormData();
    form.append("file",    payload.file);
    form.append("version", payload.version);
    if (payload.change_note) form.append("change_note", payload.change_note);

    const { data } = await api.post(`/documents/${id}/versions/upload/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  /** List archived versions for a document */
  versions: async (id: number): Promise<DocumentVersion[]> => {
    const { data } = await api.get(`/documents/${id}/versions/`);
    return data.results ?? data;
  },

  /** Delete a document (admin / project_manager only) */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/documents/${id}/`);
  },

  /** Download file — increments backend counter */
  download: async (id: number, filename: string): Promise<void> => {
    const response = await api.get(`/documents/${id}/download/`, {
      responseType: "blob",
    });
    const url  = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};