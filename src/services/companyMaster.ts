// src/services/companyMaster.ts
import api from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Company {
  id: number;
  company_name: string;
  phone_number: string;
  email: string | null;
  website: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyPayload {
  company_name: string;
  phone_number: string;
  email?: string | null;
  website?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface PaginatedCompanies {
  count: number;
  next: string | null;
  previous: string | null;
  results: Company[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const companyMasterService = {
  /** List all companies. */
  list: async (): Promise<Company[]> => {
    const { data } = await api.get("/company/companies/");
    return data.results ?? data;
  },

  /** Retrieve a single company. */
  get: async (id: number): Promise<Company> => {
    const { data } = await api.get(`/company/companies/${id}/`);
    return data;
  },

  /** Create a new company (admin only). */
  create: async (payload: CompanyPayload): Promise<Company> => {
    const { data } = await api.post("/company/companies/", payload);
    return data;
  },

  /** Full update. */
  update: async (id: number, payload: CompanyPayload): Promise<Company> => {
    const { data } = await api.put(`/company/companies/${id}/`, payload);
    return data;
  },

  /** Partial update. */
  patch: async (id: number, payload: Partial<CompanyPayload>): Promise<Company> => {
    const { data } = await api.patch(`/company/companies/${id}/`, payload);
    return data;
  },

  /** Delete a company. */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/company/companies/${id}/`);
  },

  /** Search companies: GET /company/companies/search/?q=... */
  search: async (q: string): Promise<{ count: number; results: Company[] }> => {
    const { data } = await api.get("/company/companies/search/", {
      params: { q },
    });
    return data;
  },
};