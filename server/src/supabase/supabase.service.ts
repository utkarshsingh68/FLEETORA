import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type QueryValue = string | number | boolean | undefined;

@Injectable()
export class SupabaseService {
  private readonly url: string;
  private readonly key: string;
  private readonly serviceKey?: string;

  constructor(config: ConfigService) {
    this.url = config.getOrThrow<string>('SUPABASE_URL').replace(/\/$/, '');
    this.key = config.getOrThrow<string>('SUPABASE_PUBLISHABLE_KEY');
    this.serviceKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
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

  /** Executes a narrowly granted RPC for trusted server-to-server workflows. */
  async serviceRpc<T>(name: string, body: Record<string, unknown>) {
    const key = this.requireServiceKey();
    return this.request<T>(`rpc/${name}`, key, { method: 'POST', body: JSON.stringify(body) }, key);
  }

  /** Sends a Supabase Auth invite without exposing the service-role key. */
  async inviteUserByEmail(email: string, redirectTo: string, data: Record<string, string>) {
    const key = this.requireServiceKey();
    const query = new URLSearchParams({ redirect_to: redirectTo });
    const response = await fetch(`${this.url}/auth/v1/invite?${query}`, {
      method: 'POST',
      headers: {
        ...this.headers(key),
        apikey: key,
      },
      body: JSON.stringify({ email, data }),
    });
    if (response.ok) return { existing: false };

    const payload = await response.text();
    if ([400, 409, 422].includes(response.status) && /(already|registered|exists)/i.test(payload)) {
      return { existing: true };
    }
    throw new ServiceUnavailableException('Customer invitation could not be sent');
  }

  async createSignedUploadUrl(bucket: string, path: string, token: string) {
    return this.storageRequest<{ url?: string; signedURL?: string; token?: string }>(
      `object/upload/sign/${encodeURIComponent(bucket)}/${this.encodeStoragePath(path)}`,
      token,
      { method: 'POST', body: JSON.stringify({}) },
    ).then((data) => {
      const rawUrl = data.url ?? data.signedURL;
      if (!rawUrl) throw new ServiceUnavailableException('Storage did not return a signed upload URL');
      const signedUrl = this.absoluteStorageUrl(rawUrl);
      const uploadToken = data.token ?? new URL(signedUrl).searchParams.get('token') ?? undefined;
      return { signedUrl, token: uploadToken, path };
    });
  }

  async createSignedDownloadUrl(bucket: string, path: string, token: string, expiresIn: number) {
    return this.storageRequest<{ signedURL?: string; signedUrl?: string }>(
      `object/sign/${encodeURIComponent(bucket)}/${this.encodeStoragePath(path)}`,
      token,
      { method: 'POST', body: JSON.stringify({ expiresIn }) },
    ).then((data) => {
      const rawUrl = data.signedURL ?? data.signedUrl;
      if (!rawUrl) throw new ServiceUnavailableException('Storage did not return a signed download URL');
      return { signedUrl: this.absoluteStorageUrl(rawUrl), path, expiresIn };
    });
  }

  private async request<T>(path: string, token: string, init: { method?: string; body?: string; prefer?: string } = {}, apiKey = this.key) {
    const response = await fetch(`${this.url}/rest/v1/${path}`, {
      method: init.method ?? 'GET',
      headers: {
        ...this.headers(token, init.prefer),
        apikey: apiKey,
      },
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

  private async storageRequest<T>(path: string, token: string, init: { method?: string; body?: string }) {
    const response = await fetch(`${this.url}/storage/v1/${path}`, {
      method: init.method ?? 'GET',
      headers: this.headers(token),
      body: init.body,
    });
    if (response.status === 401) throw new UnauthorizedException('Supabase session expired');
    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(`Storage request failed: ${detail}`);
    }
    return response.json() as Promise<T>;
  }

  private requireServiceKey() {
    if (!this.serviceKey) throw new ServiceUnavailableException('Server privileged integration is not configured');
    return this.serviceKey;
  }

  private encodeStoragePath(path: string) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  private absoluteStorageUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${this.url}/storage/v1${path.startsWith('/') ? '' : '/'}${path}`;
  }
}
