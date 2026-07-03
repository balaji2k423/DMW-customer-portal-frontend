import api from "@/lib/api";

/* ─── File-size / type constants (used by both service + UI) ─── */
export const MAX_MB    = 5;
export const MAX_BYTES = MAX_MB * 1024 * 1024;

export const ALLOWED_EXTENSIONS: readonly string[] = [
  "pdf",
  "doc", "docx",
  "xls", "xlsx",
  "stl", "step", "stp",
  "f3d",
  "prt",
  "dxf", "dwg",
  "png", "jpg", "jpeg", "gif", "webp", "svg",
  "zip", "rar", "7z", "tar", "gz",
  "txt", "csv", "xml", "json",
] as const;

export const ALLOWED_EXTENSIONS_DISPLAY =
  "PDF, DOC/DOCX, XLS/XLSX, STL, STEP/STP, F3D, PRT, DXF/DWG, PNG, JPG, ZIP";

/**
 * Validates a File against the allowed extension list and 5 MB size cap.
 * Returns an error string on failure, or null on success.
 */
export function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
    return `File type ".${ext}" is not allowed. Accepted: ${ALLOWED_EXTENSIONS_DISPLAY}.`;
  }
  if (file.size > MAX_BYTES) {
    return `File exceeds the ${MAX_MB} MB limit (${(file.size / 1024 / 1024).toFixed(2)} MB).`;
  }
  return null;
}

/* ─── Domain types ─── */

export interface CustomerOption {
  id: number;
  name: string;
}

export interface CustomerAdminOption {
  id: number;
  name: string;
  email: string;
  company: number | string;
  project_ids: number[];
}

export interface ProjectOption {
  id: number;
  name: string;
  customer_id?: number | null;
  customer_name?: string | null;
}

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

/* ─── Service ─── */

export const documentsService = {
  /**
   * List customers accessible to the current user.
   * Admin/PM: all customers with projects; customer roles: own record only.
   */
  listCustomers: async (): Promise<CustomerOption[]> => {
    const { data } = await api.get("/milestones/customers/");
    return data;
  },

  /**
   * List users with role=customer_admin (admin / project_manager only).
   */
  listCustomerAdmins: async (): Promise<CustomerAdminOption[]> => {
    const { data } = await api.get("/milestones/customer-admins/");
    return data;
  },

  /**
   * Step 1 — Company dropdown.
   * GET /api/v1/projects/companies/dropdown/
   */
  listCompanies: async (): Promise<CustomerOption[]> => {
    const { data } = await api.get("/projects/companies/dropdown/");
    return (data as any[]).map((c) => ({
      id:   c.id,
      name: c.company_name ?? c.name ?? "",
    }));
  },

  /**
   * Step 2 — Customer admins for a specific company.
   * GET /api/v1/projects/companies/<id>/customer-admins/
   */
  listCustomerAdminsByCompany: async (companyId: number): Promise<CustomerAdminOption[]> => {
    const { data } = await api.get(`/projects/companies/${companyId}/customer-admins/`);
    return (data as any[]).map((u) => ({
      id:          u.id,
      name:        u.full_name ?? u.name ?? u.email ?? "",
      email:       u.email ?? "",
      company:     u.company_id ?? u.company ?? companyId,
      project_ids: u.project_ids ?? [],
    }));
  },

  /**
   * Step 3 — Projects assigned to a specific customer admin.
   */
  listProjectsByAdmin: async (adminId: number): Promise<ProjectOption[]> => {
    const { data } = await api.get("/projects/", { params: { customer_admin_id: adminId, page_size: 500 } });
    const rows: any[] = data.results ?? data;
    return rows.map((p: any) => ({
      id:            p.id,
      name:          p.name,
      customer_id:   p.customer_id   ?? p.customer   ?? null,
      customer_name: p.customer_name ?? p.customer_display_name ?? null,
    }));
  },

  /**
   * List projects accessible to the current user.
   */
  listProjects: async (): Promise<ProjectOption[]> => {
    const { data } = await api.get("/projects/", { params: { page_size: 500 } });
    const rows: any[] = data.results ?? data;
    return rows.map((p: any) => ({
      id:            p.id,
      name:          p.name,
      customer_id:   p.customer_id   ?? p.customer   ?? null,
      customer_name: p.customer_name ?? p.customer_display_name ?? null,
    }));
  },

  /** List documents — scoped automatically by the backend per role */
  list: async (params?: {
    category?: string;
    search?: string;
    project?: number;
    status?: string;
    customer_admin_id?: number;
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
   * Upload a new document (max 5 MB — enforced by validateFile on the frontend).
   * Roles: admin, project_manager, customer_admin, guest (backend enforces guest restrictions).
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
   * Archives the current file; new file becomes active.
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

    // Defensive checks: a shared axios instance sometimes carries a response
    // interceptor tuned for JSON payloads (e.g. unwrapping `{ data: ... }`)
    // that can mangle a binary blob response. If that happens `response.data`
    // silently stops being a Blob, the download counter still incremented on
    // the backend, and the click below becomes a no-op — which matches the
    // "counter goes up but nothing downloads" symptom exactly. Fail loudly
    // instead of failing silently so the UI can show an error.
    const blobData = response.data;
    if (!(blobData instanceof Blob)) {
      throw new Error(
        "Download response was not a file (got " + typeof blobData + "). " +
        "Check that the shared axios instance passes responseType:'blob' through unmodified."
      );
    }

    // A JSON error body served with a 200 status (or a mis-set content-type)
    // will still be "a Blob", just the wrong kind — catch that too.
    if (blobData.type && blobData.type.includes("application/json") && blobData.size < 5000) {
      const text = await blobData.text();
      try {
        const parsed = JSON.parse(text);
        throw new Error(parsed.error || "Server returned an error instead of a file.");
      } catch {
        // not JSON after all — fall through and download as-is
      }
    }

    if (blobData.size === 0) {
      throw new Error("The downloaded file was empty. Please try again or contact support.");
    }

    const url  = window.URL.createObjectURL(blobData);
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoke on a delay — revoking immediately can race the browser's
    // download handoff in some browsers (esp. Firefox) and abort the save.
    setTimeout(() => window.URL.revokeObjectURL(url), 30_000);
  },

  /**
   * Fetch a file's raw bytes via the authenticated axios instance.
   * Returns both the ArrayBuffer and the content-type header so callers
   * can create correctly-typed Blob URLs for iframe / img preview.
   * Using axios ensures the Bearer token interceptor fires automatically,
   * avoiding HTML login-page redirects that raw fetch() / iframe src would receive.
   */
  fetchFileBuffer: async (id: number): Promise<{ buffer: ArrayBuffer; contentType: string }> => {
    const response = await api.get(`/documents/${id}/download/`, {
      responseType: "arraybuffer",
    });
    const contentType =
      (response.headers["content-type"] as string | undefined) ?? "application/octet-stream";
    return { buffer: response.data as ArrayBuffer, contentType };
  },

  /**
   * Open a file (doc/docx/xls/xlsx/etc.) in a new browser tab.
   *
   * IMPORTANT: `doc.file_url` points at protected media storage — opening it
   * directly with `window.open()` sends no Authorization header, so the
   * request 401s (or gets redirected to an HTML login page) and the tab
   * appears to do nothing. This routes through the authenticated axios
   * instance instead, same as the inline PDF/image/text preview does.
   */
  openInNewTab: async (id: number, filename: string): Promise<void> => {
    const { buffer, contentType } = await documentsService.fetchFileBuffer(id);
    const blob = new Blob([buffer], { type: contentType || "application/octet-stream" });
    const url  = window.URL.createObjectURL(blob);
    const win  = window.open(url, "_blank");
    if (!win) {
      // Popup blocked — fall back to a real download so the user still gets the file.
      await documentsService.download(id, filename);
    }
    setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  },
};