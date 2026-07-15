import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type FleetoraApiOptions = { skipWorkspaceHeaders?: boolean };

export async function fleetoraApi<T>(path: string, init: RequestInit = {}, options: FleetoraApiOptions = {}): Promise<T> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Your session has expired. Please sign in again.");

  const request = (accessToken: string) => fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(!options.skipWorkspaceHeaders && typeof window !== "undefined" && window.localStorage.getItem("fleetora-company-id") ? { "x-company-id": window.localStorage.getItem("fleetora-company-id") as string } : {}),
      ...(!options.skipWorkspaceHeaders && typeof window !== "undefined" && window.localStorage.getItem("fleetora-branch-id") ? { "x-branch-id": window.localStorage.getItem("fleetora-branch-id") as string } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  let response = await request(data.session.access_token);
  if (response.status === 401) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    response = await request(refreshed.data.session.access_token);
  }
  if (response.status === 401) throw new Error("Your session has expired. Please sign in again.");
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? "Fleetora could not load your live data.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
