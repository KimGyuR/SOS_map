import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { validateSignup, type SignupInput } from '../domain/validation';

const ACCOUNTS_KEY = '@sos-map/accounts-v1';
const SESSION_KEY = '@sos-map/session-v1';
const PASSWORD_ITERATIONS = 310_000;

export type LocalAccount = {
  id: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isLocalAccount(value: unknown): value is LocalAccount {
  if (!value || typeof value !== 'object') return false;
  const account = value as Record<string, unknown>;
  return (
    typeof account.id === 'string' &&
    /^[a-z0-9._-]{4,20}$/.test(account.id) &&
    typeof account.name === 'string' &&
    account.name.length >= 2 &&
    typeof account.email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email) &&
    typeof account.salt === 'string' &&
    /^[a-f0-9]{32}$/.test(account.salt) &&
    typeof account.passwordHash === 'string' &&
    /^[a-f0-9]{64}$/.test(account.passwordHash)
  );
}

async function readAccounts(): Promise<LocalAccount[]> {
  const serialized = await AsyncStorage.getItem(ACCOUNTS_KEY);
  if (!serialized) return [];

  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed) || !parsed.every(isLocalAccount)) {
    throw new Error('저장된 계정 정보를 읽을 수 없습니다. 앱 데이터를 확인해 주세요.');
  }
  return parsed;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const hash = await pbkdf2Async(sha256, password, salt, {
    c: PASSWORD_ITERATIONS,
    dkLen: 32,
  });
  return bytesToHex(hash);
}

export async function registerLocalAccount(input: SignupInput): Promise<LocalAccount> {
  const validationError = validateSignup(input);
  if (validationError) throw new Error(validationError);
  const accounts = await readAccounts();
  const id = input.id.trim().toLowerCase();
  if (accounts.some((account) => account.id === id)) {
    throw new Error('이미 사용 중인 아이디입니다.');
  }

  const salt = bytesToHex(await Crypto.getRandomBytesAsync(16));
  const account: LocalAccount = {
    id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    salt,
    passwordHash: await hashPassword(input.password, salt),
  };
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
  return account;
}

export async function authenticateLocalAccount(idInput: string, password: string): Promise<LocalAccount | null> {
  const id = idInput.trim().toLowerCase();
  const account = (await readAccounts()).find((item) => item.id === id);
  if (!account) return null;

  const passwordHash = await hashPassword(password, account.salt);
  return passwordHash === account.passwordHash ? account : null;
}

export async function saveLoginSession(accountId: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, accountId);
}

export async function restoreLoginSession(): Promise<LocalAccount | null> {
  const sessionId = await AsyncStorage.getItem(SESSION_KEY);
  if (!sessionId) return null;
  const account = (await readAccounts()).find((item) => item.id === sessionId);
  if (!account) {
    await clearLoginSession();
    return null;
  }
  return account;
}

export async function clearLoginSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
