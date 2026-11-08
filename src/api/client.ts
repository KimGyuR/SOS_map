
import { ApiError, toApiError } from './errors';
import { getAccessToken, handleUnauthorized } from './session';

// 일반 API 요청 제한 시간: 15초
const REQUEST_TIMEOUT_MS = 15_000;

const NETWORK_MESSAGE =
  '인터넷 연결을 확인하고 다시 시도해 주세요.';

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /** 일반 객체는 JSON, FormData는 multipart로 전송 */
  body?: unknown;

  query?: Record<string, QueryValue>;

  /** 로그인 및 회원가입 API는 인증 토큰을 보내지 않음 */
  auth?: boolean;

  /** 외부에서 요청을 취소할 때 사용 */
  signal?: AbortSignal;

  /** API별 제한 시간 (밀리초) */
  timeoutMs?: number;
};

function getBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_URL이 설정되지 않았어요. .env.local에 서버 주소를 넣어 주세요.',
    );
  }

  return baseUrl.replace(/\/+$/, '');
}

function buildUrl(
  path: string,
  query?: Record<string, QueryValue>,
): string {
  const params = Object.entries(query ?? {})
    .filter(
      (entry): entry is [
        string,
        string | number | boolean,
      ] =>
        entry[1] !== null &&
        entry[1] !== undefined,
    )
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );

  return `${getBaseUrl()}${path}${
    params.length ? `?${params.join('&')}` : ''
  }`;
}

async function readBody(
  response: Response,
): Promise<unknown> {
  const text = await response.text();

  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    if (response.ok) {
      throw new ApiError(
        response.status,
        'INVALID_RESPONSE',
        '서버 응답을 읽지 못했어요.',
      );
    }

    return undefined;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    query,
    auth = true,
    signal,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = options;

  const isFormData =
    typeof FormData !== 'undefined' &&
    body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const token = auth ? getAccessToken() : null;

  if (auth) {
    if (!token) {
      handleUnauthorized();

      throw new ApiError(
        401,
        'UNAUTHORIZED',
        '로그인이 필요해요.',
      );
    }

    headers.Authorization = `Bearer ${token}`;
  }

  // 실제 fetch 요청을 취소하는 컨트롤러
  const controller = new AbortController();

  // 시간 초과와 외부 취소를 구분하기 위한 변수
  let timedOut = false;

  // 지정된 제한 시간이 지나면 요청 취소
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  // 화면 이동 등 외부에서 취소한 경우에도 요청 취소
  const cancel = () => controller.abort();

  signal?.addEventListener('abort', cancel);

  if (signal?.aborted) {
    controller.abort();
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    // 사용자가 직접 요청을 취소한 경우
    if (signal?.aborted) {
      throw error;
    }

    // 제한 시간 초과
    if (timedOut) {
      throw new ApiError(
        0,
        'TIMEOUT',
        '서버 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.',
      );
    }

    // 그 외 네트워크 오류
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      NETWORK_MESSAGE,
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }

  // 기존 로그인 세션 처리 유지
  if (
    auth &&
    response.status === 401 &&
    getAccessToken() === token
  ) {
    handleUnauthorized();
  }

  let data: unknown;

  try {
    data = await readBody(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      0,
      'NETWORK_ERROR',
      NETWORK_MESSAGE,
    );
  }

  if (!response.ok) {
    throw toApiError(response.status, data);
  }

  return data as T;
}
