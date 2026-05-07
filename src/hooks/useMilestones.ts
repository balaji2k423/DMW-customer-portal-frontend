// src/hooks/useMilestones.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMilestones,
  fetchProjectTimeline,
  fetchMilestone,
  signOffMilestone,
  updateMilestone,
  type MilestoneListItem,
} from "@/api/milestonesapi";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const milestoneKeys = {
  all:        ["milestones"] as const,
  list:       () => [...milestoneKeys.all, "list"] as const,
  timeline:   (projectId: number) => [...milestoneKeys.all, "timeline", projectId] as const,
  detail:     (id: number) => [...milestoneKeys.all, "detail", id] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Flat list of all milestones the current user can see.
 * Used when there's no specific project context.
 */
export function useMilestones() {
  return useQuery({
    queryKey: milestoneKeys.list(),
    queryFn:  fetchMilestones,
    staleTime: 30_000,  // 30 s
  });
}

/**
 * Timeline list for a specific project.
 * Pass `enabled: false` until you have the project id.
 */
export function useProjectTimeline(projectId: number | null) {
  return useQuery({
    queryKey: milestoneKeys.timeline(projectId ?? 0),
    queryFn:  () => fetchProjectTimeline(projectId!),
    enabled:  projectId !== null,
    staleTime: 30_000,
  });
}

/** Full detail for a single milestone (includes deliverables + sign-off). */
export function useMilestoneDetail(id: number | null) {
  return useQuery({
    queryKey: milestoneKeys.detail(id ?? 0),
    queryFn:  () => fetchMilestone(id!),
    enabled:  id !== null,
    staleTime: 30_000,
  });
}

/** Sign-off mutation – optimistically flips is_signed_off in the list cache. */
export function useSignOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string }) =>
      signOffMilestone(id, remarks),
    onSuccess: (_, { id }) => {
      // Patch list cache so stepper reflects sign-off immediately
      qc.setQueriesData<MilestoneListItem[]>(
        { queryKey: milestoneKeys.list() },
        (old) =>
          old?.map((m) => (m.id === id ? { ...m, is_signed_off: true } : m)) ?? old,
      );
      // Invalidate detail so next open is fresh
      qc.invalidateQueries({ queryKey: milestoneKeys.detail(id) });
    },
  });
}

/** Generic status / date patch mutation. */
export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: Parameters<typeof updateMilestone>[1] & { id: number }) =>
      updateMilestone(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: milestoneKeys.list() });
      qc.setQueryData(milestoneKeys.detail(updated.id), updated);
    },
  });
}