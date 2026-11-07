
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { validateSignup } from '../domain/validation';
import {
  checkEmail,
  checkLoginId,
  login,
  logout,
  signUp as apiSignUp,
} from '../api/users';
import { onUnauthorized } from '../api/session';

type AuthAccount = {
  userId: number;
  loginId: string;
  name: string;
};

export function useAuthSession() {
  const router = useRouter();
  const busy = useRef(false);

  const [authReady] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentAccount, setCurrentAccount] = useState<AuthAccount | null>(null);

  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [loginError, setLoginError] = useState('');

  // 서버에서 401 오류가 발생하면 로그인 상태를 초기화한다.
  useEffect(() => {
    return onUnauthorized(() => {
      setCurrentAccount(null);
      setLoginPassword('');
      setPasswordConfirmation('');
      router.setParams({ screen: 'map' });
    });
  }, [router]);

  // 로그인 성공 후 서버에서 받은 사용자 정보를 저장한다.
  function finishAuthentication(account: AuthAccount) {
    setCurrentAccount(account);
    setLoginId(account.loginId);
    setLoginPassword('');
    setPasswordConfirmation('');
    setLoginError('');
    router.setParams({ screen: 'map' });
  }

  // 백엔드 로그인 API 호출
  async function signIn() {
    if (busy.current) return;

    if (!loginId.trim() || !loginPassword) {
      setLoginError('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    busy.current = true;
    setAuthLoading(true);
    setLoginError('');

    try {
      const result = await login(loginId, loginPassword);
      finishAuthentication(result.user);
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : '로그인에 실패했습니다. 다시 시도해 주세요.',
      );
    } finally {
      busy.current = false;
      setAuthLoading(false);
    }
  }

  // 회원가입 성공 후 자동 로그인
  async function signUp() {
    if (busy.current) return;

    const normalizedId = loginId.trim();

    const validationError = validateSignup(
      {
        id: normalizedId,
        name: signupName,
        email: signupEmail,
        password: loginPassword,
      },
      passwordConfirmation,
    );

    if (validationError) {
      setLoginError(validationError);
      return;
    }

    busy.current = true;
    setAuthLoading(true);
    setLoginError('');

    try {
      // 1. 백엔드에 계정 생성
      await apiSignUp({
        id: normalizedId,
        name: signupName,
        email: signupEmail,
        password: loginPassword,
      });

      // 2. 생성한 계정으로 자동 로그인
      try {
        const result = await login(normalizedId, loginPassword);
        finishAuthentication(result.user);
      } catch {
        setAuthMode('login');
        setLoginError(
          '회원가입은 완료됐지만 자동 로그인에 실패했어요. 다시 로그인해 주세요.',
        );
      }
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : '회원가입에 실패했습니다. 다시 시도해 주세요.',
      );
    } finally {
      busy.current = false;
      setAuthLoading(false);
    }
  }

  // JWT를 삭제하고 로그인 상태를 초기화한다.
  async function signOut() {
    try {
      logout();
      setCurrentAccount(null);
      setLoginPassword('');
      setPasswordConfirmation('');
      return true;
    } catch (error) {
      Alert.alert(
        '로그아웃하지 못했어요',
        error instanceof Error ? error.message : '로그아웃에 실패했습니다.',
      );
      return false;
    }
  }

  function switchAuthMode(mode: 'login' | 'signup') {
    if (busy.current) return;

    setAuthMode(mode);
    setLoginError('');
    setLoginPassword('');
    setPasswordConfirmation('');
  }
// 이메일 중복 확인
async function onCheckEmail(email: string): Promise<boolean> {
  const result = await checkEmail(email);
  return result.available;
}

// 아이디 중복 확인
async function onCheckLoginId(loginId: string): Promise<boolean> {
  const result = await checkLoginId(loginId);
  return result.available;
}


  return {
    isAuthenticated: currentAccount !== null,
    authReady,
    authLoading,
    authMode,
    currentAccount,
    loginId,
    loginPassword,
    passwordConfirmation,
    signupName,
    signupEmail,
    loginError,
    setLoginId,
    setLoginPassword,
    setPasswordConfirmation,
    setSignupName,
    setSignupEmail,
    signIn,
    signUp,
    signOut,
    switchAuthMode,
    onCheckEmail,
    onCheckLoginId,
  };
}