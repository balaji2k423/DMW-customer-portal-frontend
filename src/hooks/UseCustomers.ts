import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useCustomers() {
  return useQuery({
    queryKey: ["customer-users"],
    queryFn: () =>
      api.get("/auth/admin/customer-users/").then(r =>
        Array.isArray(r.data) ? r.data : (r.data.results ?? [])
      ),
  });
}