import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api"; // your axios instance

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Group {
  id: number;
  name: string;
  description: string;
  member_count: number;
  project_count: number;
  created_by_name: string;
  created_at: string;
}

export interface GroupCreatePayload {
  name: string;
  description?: string;
  user_ids?: number[];
  project_ids?: number[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ["admin", "groups"],
    queryFn: () => api.get("/api/groups/").then(r => r.data),
  });
}

export function useGroup(id: number) {
  return useQuery({
    queryKey: ["admin", "groups", id],
    queryFn: () => api.get("/groups/").then(r => r.data.results ?? r.data),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GroupCreatePayload) => api.post("/api/groups/", data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "groups"] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: GroupCreatePayload & { id: number }) =>
      api.patch(`/api/groups/${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "groups"] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/groups/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "groups"] }),
  });
}

// ─── Members ──────────────────────────────────────────────────────────────────

export function useGroupMembers(groupId: number) {
  return useQuery({
    queryKey: ["admin", "groups", groupId, "members"],
    queryFn: () => api.get(`/api/groups/${groupId}/members/`).then(r => r.data),
    enabled: !!groupId,
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) =>
      api.post(`/api/groups/${groupId}/members/`, { user: userId }).then(r => r.data),
    onSuccess: (_data, { groupId }) =>
      qc.invalidateQueries({ queryKey: ["admin", "groups", groupId, "members"] }),
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: number; memberId: number }) =>
      api.delete(`/api/groups/${groupId}/members/${memberId}/`),
    onSuccess: (_data, { groupId }) =>
      qc.invalidateQueries({ queryKey: ["admin", "groups", groupId, "members"] }),
  });
}