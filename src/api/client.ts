import { ApiError, toApiError } from './errors';
import { getAccessToken, handleUnauthorized } from './session';

const REQUEST_TIMEOUT_MS = 15_000;
const NETWORK_MESSAGE = '인터넷 연결을 확인하고 다시 시도해 주세요.';

type QueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Plain objects are sent as JSON; FormData is sent as multipart (photo uploads). */
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** APIs 1–4 (sign-up/login) pass `auth: false`; every other API sends the token. */
  auth?: boolean;
  signal?: AbortSignal;
};

function getBaseUrl(): string {
  // Expo only inlines EXPO_PUBLIC_ variables when they are read with this exact syntax.
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new Error('EXPO_PUBLIC_API_URL이 설정되지 않았어요. .env.local에 서버 주소를 넣어 주세요.');
  return baseUrl.replace(/\/+$/, '');
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = Object.entries(query ?? {})
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== null && entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return `${getBaseUrl()}${path}${params.length ? `?${params.join('&')}` : ''}`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    if (response.ok) throw new ApiError(response.status, 'INVALID_RESPONSE', '서버 응답을 읽지 못했어요.');
    return undefined;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, signal } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  const token = auth ? getAccessToken() : null;
  if (auth) {
    if (!token) {
      handleUnauthorized();
      throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요해요.');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
  if (signal?.aborted) controller.abort();

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) throw new ApiError(0, 'TIMEOUT', '서버 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.');
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }

  // LOGIN_FAILED is also 401, but login requests are sent without a token and must not log out.
  // Skip when the token changed meanwhile (a late 401 must not wipe a fresh login).
  if (auth && response.status === 401 && getAccessToken() === token) handleUnauthorized();

  let data: unknown;
  try {
    data = await readBody(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }
  if (!response.ok) throw toApiError(response.status, data);
  return data as T;
}
