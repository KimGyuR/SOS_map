import type { SignupInput } from '../domain/validation';
import { apiRequest } from './client';
import { toMyPage, type MyPage } from './mappers';
import { setAccessToken } from './session';
import type { EmailAvailabilityDto, LoginIdAvailabilityDto, LoginResponseDto, MyPageDto, SignupRequest, UserDto } from './types';

/** Maps the app's sign-up form (`id`) to the server field names (`loginId`). */
export function toSignupRequest(input: SignupInput): SignupRequest {
  // The app validates trimmed values, so send them trimmed too; passwords are sent as typed.
  return {
    loginId: input.id.trim(),
    name: input.name.trim(),
    email: input.email.trim(),
    password: input.password,
  };
}

/**
 * API 1. POST /users/signup
 * Errors: 400 INVALID_INPUT, 409 DUPLICATE_LOGIN_ID, 409 DUPLICATE_EMAIL.
 */
export function signUp(input: SignupInput, signal?: AbortSignal): Promise<UserDto> {
  return apiRequest<UserDto>('/users/signup', { method: 'POST', body: toSignupRequest(input), auth: false, signal });
}

/**
 * API 2. GET /users/check-email?email=...
 * Returns 200 either way; read `available` (false means the email is already registered).
 */
export function checkEmail(email: string, signal?: AbortSignal): Promise<EmailAvailabilityDto> {
  return apiRequest<EmailAvailabilityDto>('/users/check-email', { query: { email: email.trim() }, auth: false, signal });
}

/**
 * API 3. GET /users/check-login-id?loginId=...
 * Returns 200 either way; read `available` (false means the login ID is already taken).
 */
export function checkLoginId(loginId: string, signal?: AbortSignal): Promise<LoginIdAvailabilityDto> {
  return apiRequest<LoginIdAvailabilityDto>('/users/check-login-id', { query: { loginId: loginId.trim() }, auth: false, signal });
}

export type LoginResult = {
  user: LoginResponseDto['user'];
  /** When the token stops working; the server answers 401 after this. */
  expiresAt: Date;
};

/**
 * API 4. POST /users/login
 * Stores the token for every later request. Error: 401 LOGIN_FAILED (does not say which field was wrong).
 */
export async function login(loginId: string, password: string, signal?: AbortSignal): Promise<LoginResult> {
  const response = await apiRequest<LoginResponseDto>('/users/login', {
    method: 'POST',
    body: { loginId: loginId.trim(), password },
    auth: false,
    signal,
  });
  setAccessToken(response.accessToken);
  return { user: response.user, expiresAt: new Date(Date.now() + response.expiresIn * 1000) };
}

/** There is no logout API: dropping the token is enough. */
export function logout() {
  setAccessToken(null);
}

/** API 5. GET /users/mypage — profile, 3 stats and up to 4 recent complaints. */
export async function getMyPage(signal?: AbortSignal): Promise<MyPage> {
  return toMyPage(await apiRequest<MyPageDto>('/users/mypage', { signal }));
}
