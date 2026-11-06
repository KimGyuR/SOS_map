// Error codes defined in the shared API rules (공통 규칙 1. 에러 응답).
export type ServerErrorCode =
  | 'INVALID_INPUT'
  | 'FESTIVAL_NOT_ACTIVE'
  | 'UNAUTHORIZED'
  | 'LOGIN_FAILED'
  | 'FORBIDDEN'
  | 'COMPLAINT_NOT_FOUND'
  | 'IMAGE_NOT_FOUND'
  | 'FESTIVAL_NOT_FOUND'
  | 'RESOURCE_NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'DUPLICATE_LOGIN_ID'
  | 'DUPLICATE_EMAIL'
  | 'IMAGE_IN_USE'
  | 'COMPLAINT_NOT_EDITABLE'
  | 'COMPLAINT_NOT_DELETABLE'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'INTERNAL_ERROR'
  | 'AI_UNAVAILABLE';

// Raised by the app itself when no usable server response arrives.
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE';

export type FieldError = { field: string; reason: string; };

export type ApiErrorBody = {
  status: number;
  code: ServerErrorCode;
  message: string;
  errors: FieldError[];
};

const FALLBACK_MESSAGE = '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ServerErrorCode | ClientErrorCode;
  readonly fieldErrors: FieldError[];

  constructor(status: number, code: ServerErrorCode | ClientErrorCode, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  /** Validation reason for one input, e.g. `error.fieldError('password')`. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors.find((item) => item.field === field)?.reason;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isFieldError(value: unknown): value is FieldError {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.field === 'string' && typeof item.reason === 'string';
}

/** Builds an ApiError from an error response, tolerating bodies that break the shared format. */
export function toApiError(status: number, body: unknown): ApiError {
  if (body && typeof body === 'object') {
    const data = body as Record<string, unknown>;
    if (typeof data.code === 'string' && typeof data.message === 'string') {
      const fieldErrors = Array.isArray(data.errors) ? data.errors.filter(isFieldError) : [];
      return new ApiError(status, data.code as ServerErrorCode, data.message, fieldErrors);
    }
  }
  return new ApiError(status, status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR', FALLBACK_MESSAGE);
}
