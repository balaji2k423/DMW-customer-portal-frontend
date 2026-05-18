import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : "http://127.0.0.1:8000/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Attach access token to every request ────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: silent token refresh with concurrent-request queue ─
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in-flight, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry  = true;
    isRefreshing     = true;

    try {
      const refresh = localStorage.getItem("refresh");

      if (!refresh) throw new Error("No refresh token stored");

      const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
        refresh,
      });

      // ROTATE_REFRESH_TOKENS=True → server sends a new refresh token too
      localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);

      processQueue(null, data.access);
      original.headers.Authorization = `Bearer ${data.access}`;
      return api(original);

    } catch (err) {
      processQueue(err, null);

      // Blacklist the refresh token server-side before clearing storage
      const refresh = localStorage.getItem("refresh");
      const access  = localStorage.getItem("access");
      if (refresh) {
        try {
          await axios.post(
            `${BASE_URL}/auth/logout/`,
            { refresh },
            { headers: { Authorization: `Bearer ${access}` } },
          );
        } catch {
          // Already invalid — ignore
        }
      }

      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      window.location.href = "/login";
      return Promise.reject(err);

    } finally {
      isRefreshing = false;
    }
  },
);

export default api;