import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type QueryValue = string | number | boolean | undefined;

@Injectable()
export class SupabaseService {
  private readonly url: string;
  private readonly key: string;

  constructor(config: ConfigService) {
    this.url = config.getOrThrow<string>('SUPABASE_URL').replace(/\/$/, '');
    this.key = config.getOrThrow<string>('SUPABASE_PUBLISHABLE_KEY');
  }

  private headers(token: string, prefer?: string) {
    return {
      apikey: this.key,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(prefer ? { prefer } : {}),
    };
  }

  async user(token: string) {
    const response = await fetch(`${this.url}/auth/v1/user`, { headers: this.headers(token) });
    if (!response.ok) throw new UnauthorizedException('Invalid or expired Supabase session');
    return response.json() as Promise<{ id: string; email?: string }>;
  }

  async select<T>(table: string, token: string, query: Record<string, QueryValue> = {}) {
    const params = new URLSearchParams({ select: '*' });
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
    return this.request<T[]>(`${table}?${params}`, token);
  }

  async insert<T>(table: string, token: string, body: Record<string, unknown>) {
    return this.request<T[]>(table, token, { method: 'POST', body: JSON.stringify(body), prefer: 'return=representation' });
  }

  async update<T>(table: string, token: string, query: Record<string, QueryValue>, body: Record<string, unknown>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
    return this.request<T[]>(`${table}?${params}`, token, { method: 'PATCH', body: JSON.stringify(body), prefer: 'return=representation' });
  }

  async delete(table: string, token: string, query: Record<string, QueryValue>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
    return this.request<void>(`${table}?${params}`, token, { method: 'DELETE', prefer: 'return=minimal' });
  }

  async rpc<T>(name: string, token: string, body: Record<string, unknown>) {
    return this.request<T>(`rpc/${name}`, token, { method: 'POST', body: JSON.stringify(body) });
  }

  private async request<T>(path: string, token: string, init: { method?: string; body?: string; prefer?: string } = {}) {
    const response = await fetch(`${this.url}/rest/v1/${path}`, {
      method: init.method ?? 'GET',
      headers: this.headers(token, init.prefer),
      body: init.body,
    });
    if (response.status === 401) throw new UnauthorizedException('Supabase session expired');
    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(`Database request failed: ${detail}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
}
