import { validateSignup } from '../domain/validation';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { authenticateLocalAccount, clearLoginSession, registerLocalAccount, restoreLoginSession, saveLoginSession, type LocalAccount } from '../lib/authStorage';

export function useAuthSession() {
  const router = useRouter();
  const busy = useRef(false);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentAccount, setCurrentAccount] = useState<LocalAccount | null>(null);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  useEffect(() => {
    let active = true;
    void restoreLoginSession()
      .then((account) => {
        if (!active || !account) return;
        setCurrentAccount(account);
        setLoginId(account.id);

      })
      .catch((error: unknown) => {
        if (active) setLoginError(error instanceof Error ? error.message : '저장된 로그인 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function finishAuthentication(account: LocalAccount) {
    setCurrentAccount(account);
    setLoginId(account.id);
    setLoginPassword('');
    setPasswordConfirmation('');
    setLoginError('');

    router.setParams({ screen: 'map' });
  }

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
      const account = await authenticateLocalAccount(loginId, loginPassword);
      if (!account) {
        setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.');
        return;
      }
      await saveLoginSession(account.id);
      finishAuthentication(account);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '로그인에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      busy.current = false;
      setAuthLoading(false);
    }
  }

  async function signUp() {
    if (busy.current) return;
    const normalizedId = loginId.trim();
    const validationError = validateSignup({ id: normalizedId, name: signupName, email: signupEmail, password: loginPassword }, passwordConfirmation);
    if (validationError) { setLoginError(validationError); return; }
    busy.current = true;
    setAuthLoading(true);
    setLoginError('');
    try {
      const account = await registerLocalAccount({
        id: normalizedId,
        name: signupName,
        email: signupEmail,
        password: loginPassword,
      });
      await saveLoginSession(account.id);
      finishAuthentication(account);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '회원가입에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      busy.current = false;
      setAuthLoading(false);
    }
  }

  async function signOut() {
    try {
      await clearLoginSession();

      setCurrentAccount(null);
      setLoginPassword('');
      setPasswordConfirmation('');
      return true;
    } catch (error) {
      Alert.alert('로그아웃하지 못했어요', error instanceof Error ? error.message : '저장된 로그인 정보를 지우지 못했습니다.');
    }
  }

  function switchAuthMode(mode: 'login' | 'signup') {
    if (busy.current) return;
    setAuthMode(mode);
    setLoginError('');
    setLoginPassword('');
    setPasswordConfirmation('');
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
  };
}

