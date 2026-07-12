import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function fleetoraApi<T>(path: string): Promise<T> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Your session has expired. Please sign in again.");

  const request = (accessToken: string) => fetch(`${API_URL}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
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
  return response.json() as Promise<T>;
}
