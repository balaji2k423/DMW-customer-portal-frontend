import api from "@/lib/api";

export type UserFormData = {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company: string;
  phone: string;
  password?: string;
  is_active?: boolean;
};

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post("/auth/login/", { email, password });
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    return data;
  },

  // AuthContext.logout() handles blacklisting + navigation.
  // This thin version is only used as a fallback (e.g. api.ts interceptor).
  logout: () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },

  getProfile: async () => {
    const { data } = await api.get("/auth/profile/");
    return data;
  },

  updateProfile: async (
    payload: Partial<{
      first_name: string;
      last_name: string;
      company: string;
      phone: string;
    }>,
  ) => {
    const { data } = await api.patch("/auth/profile/", payload);
    return data;
  },

  changePassword: async (old_password: string, new_password: string) => {
    const { data } = await api.post("/auth/change-password/", {
      old_password,
      new_password,
    });
    return data;
  },

  register: async (payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role?: string;
    company?: string;
    phone?: string;
  }) => {
    const { data } = await api.post("/auth/register/", payload);
    return data;
  },

  // ─── Admin user management ────────────────────────────────────────────────

  adminListUsers: async () => {
    const { data } = await api.get("/auth/admin/users/");
    return data;
  },

  adminCreateUser: async (payload: UserFormData) => {
    // Strip blank password — backend will auto-generate one when omitted
    const body: Partial<UserFormData> = { ...payload };
    if (!body.password) delete body.password;
    const { data } = await api.post("/auth/admin/users/create/", body);
    return data;
  },

  adminUpdateUser: async (id: number, payload: Partial<UserFormData>) => {
    // Strip blank password — backend only updates it when the field is present
    const body: Partial<UserFormData> = { ...payload };
    if (!body.password) delete body.password;
    const { data } = await api.patch(`/auth/admin/users/${id}/`, body);
    return data;
  },

  adminDeleteUser: async (id: number) => {
    await api.delete(`/auth/admin/users/${id}/`);
  },
};