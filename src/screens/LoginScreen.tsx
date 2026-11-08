
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import AppIcon from '../components/AppIcon';
import NeighborhoodArt from '../components/NeighborhoodArt';
import ActionButton from '../components/ActionButton';
import type { AppModel } from '../hooks/useAppModel';

type Props = Pick<
  AppModel,
  | 'authReady'
  | 'authLoading'
  | 'authMode'
  | 'loginId'
  | 'loginPassword'
  | 'passwordConfirmation'
  | 'signupName'
  | 'signupEmail'
  | 'loginError'
  | 'address'
  | 'setLoginId'
  | 'setLoginPassword'
  | 'setPasswordConfirmation'
  | 'setSignupName'
  | 'setSignupEmail'
  | 'signIn'
  | 'signUp'
  | 'switchAuthMode'
  | 'onCheckEmail'
  | 'onCheckLoginId'
>;

type CheckResult = {
  ok: boolean;
  message: string;
  value: string;
} | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_ID_PATTERN = /^[A-Za-z0-9._-]{4,20}$/;

const checkButtonStyle = {
  minHeight: 52,
  paddingHorizontal: 14,
  borderRadius: 13,
  borderWidth: 1,
  borderColor: colors.sky,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

export default function LoginScreen({
  authReady,
  authLoading,
  authMode,
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
  switchAuthMode,
  onCheckEmail,
  onCheckLoginId,
}: Props) {
  const [emailCheck, setEmailCheck] = useState<CheckResult>(null);
  const [idCheck, setIdCheck] = useState<CheckResult>(null);
  const [checking, setChecking] = useState<'email' | 'id' | null>(null);

  // 입력값이 바뀌면 기존 중복 확인 결과를 초기화한다.
  const changeEmail = (value: string) => {
    setSignupEmail(value);
    setEmailCheck(null);
  };

  const changeLoginId = (value: string) => {
    setLoginId(value);
    setIdCheck(null);
  };

  // 이메일 중복 확인 API (#2)
  const checkEmail = async () => {
    if (checking !== null || authLoading) return;

    const email = signupEmail.trim();

    if (!EMAIL_PATTERN.test(email)) {
      setEmailCheck({
        ok: false,
        message: '이메일 형식을 확인해 주세요.',
        value: email,
      });
      return;
    }

    setChecking('email');

    try {
      const available = await onCheckEmail(email);

      setEmailCheck({
        ok: available,
        message: available
          ? '사용할 수 있는 이메일이에요.'
          : '이미 사용 중인 이메일이에요.',
        value: email,
      });
    } catch {
      setEmailCheck({
        ok: false,
        message: '서버에 연결하지 못했어요. 다시 확인해 주세요.',
        value: email,
      });
    } finally {
      setChecking(null);
    }
  };

  // 아이디 중복 확인 API (#3)
  const checkLoginId = async () => {
    if (checking !== null || authLoading) return;

    const id = loginId.trim();

    if (!LOGIN_ID_PATTERN.test(id)) {
      setIdCheck({
        ok: false,
        message: '아이디는 4~20자 영문, 숫자, . _ - 만 쓸 수 있어요.',
        value: id,
      });
      return;
    }

    setChecking('id');

    try {
      const available = await onCheckLoginId(id);

      setIdCheck({
        ok: available,
        message: available
          ? '사용할 수 있는 아이디예요.'
          : '이미 사용 중인 아이디예요.',
        value: id,
      });
    } catch {
      setIdCheck({
        ok: false,
        message: '서버에 연결하지 못했어요. 다시 확인해 주세요.',
        value: id,
      });
    } finally {
      setChecking(null);
    }
  };

  const resultText = (result: CheckResult) =>
    result ? (
      <Text
        style={{
          color: result.ok ? '#2E7D5B' : '#D84848',
          fontSize: 11,
          marginTop: 7,
        }}
      >
        {result.message}
      </Text>
    ) : null;

  // 현재 입력값에 대해 중복 확인을 통과했는지 검사한다.
  const emailVerified =
    emailCheck?.ok === true &&
    emailCheck.value === signupEmail.trim();

  const idVerified =
    idCheck?.ok === true &&
    idCheck.value === loginId.trim();

  const canSignUp =
    emailVerified &&
    idVerified &&
    checking === null &&
    !authLoading;

  // 버튼과 키보드 완료 동작에 동일한 조건을 적용한다.
  const handleSignUp = () => {
    if (!canSignUp) return;
    void signUp();
  };

  if (!authReady) {
    return (
      <View style={styles.authLoadingScreen}>
        <ActivityIndicator size="large" color={colors.sky} />
        <Text style={styles.authLoadingText}>
          로그인 상태를 확인하고 있어요
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.loginPage}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.loginScroll}
        contentContainerStyle={styles.loginScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.loginBrand}>
          <View style={styles.brandLockup}>
            <View style={styles.loginLogo}>
              <AppIcon name="pin" color="white" />
            </View>
            <Text style={styles.brandWordmark}>동네SOS</Text>
          </View>

          <Text style={styles.loginTitle}>
            더 좋은 동네,{'\n'}우리의 작은 관심부터.
          </Text>

          <Text style={styles.loginSubtitle}>
            발견하고, 알리고, 함께 바꾸는 우리 동네
          </Text>

          {authMode === 'login' ? <NeighborhoodArt /> : null}
        </View>

        <View style={styles.loginCard}>
          <Text style={styles.loginHeading}>
            {authMode === 'login'
              ? '우리 동네와 연결하기'
              : '반가워요, 새로운 이웃님'}
          </Text>

          <Text style={styles.loginIntro}>
            {authMode === 'login'
              ? '로그인하고 동네의 이야기를 확인해 보세요.'
              : '함께 더 살기 좋은 동네를 만들어 가요.'}
          </Text>

          {authMode === 'signup' ? (
            <>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                accessibilityLabel="이름"
                style={styles.textInput}
                placeholder="이름을 입력해 주세요"
                value={signupName}
                onChangeText={setSignupName}
                maxLength={20}
                autoComplete="name"
                returnKeyType="next"
              />

              <Text style={styles.inputLabel}>이메일</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  accessibilityLabel="이메일"
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="이메일 주소를 입력해 주세요"
                  value={signupEmail}
                  onChangeText={changeEmail}
                  maxLength={100}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="이메일 중복 확인"
                  disabled={checking !== null || authLoading}
                  onPress={() => void checkEmail()}
                  style={checkButtonStyle}
                >
                  <Text
                    style={{
                      color: colors.sky,
                      fontSize: 13,
                      fontWeight: '700',
                    }}
                  >
                    {checking === 'email' ? '확인 중' : '중복 확인'}
                  </Text>
                </Pressable>
              </View>

              {resultText(emailCheck)}
            </>
          ) : null}

          <Text style={styles.inputLabel}>아이디</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              accessibilityLabel="아이디"
              style={[styles.textInput, { flex: 1 }]}
              placeholder="4~20자 영문, 숫자, . _ -"
              value={loginId}
              onChangeText={changeLoginId}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              autoComplete="username"
              returnKeyType="next"
            />

            {authMode === 'signup' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="아이디 중복 확인"
                disabled={checking !== null || authLoading}
                onPress={() => void checkLoginId()}
                style={checkButtonStyle}
              >
                <Text
                  style={{
                    color: colors.sky,
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {checking === 'id' ? '확인 중' : '중복 확인'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {authMode === 'signup' ? resultText(idCheck) : null}

          <Text style={styles.inputLabel}>비밀번호</Text>
          <TextInput
            accessibilityLabel="비밀번호"
            style={styles.textInput}
            placeholder={
              authMode === 'signup'
                ? '영문·숫자 포함 8자 이상'
                : '비밀번호를 입력해 주세요'
            }
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType={
              authMode === 'signup' ? 'newPassword' : 'password'
            }
            autoComplete={
              authMode === 'signup' ? 'new-password' : 'current-password'
            }
            returnKeyType={authMode === 'signup' ? 'next' : 'done'}
            onSubmitEditing={
              authMode === 'login' ? signIn : undefined
            }
          />

          {authMode === 'signup' ? (
            <>
              <Text style={styles.inputLabel}>비밀번호 확인</Text>
              <TextInput
                accessibilityLabel="비밀번호 확인"
                style={styles.textInput}
                placeholder="비밀번호를 다시 입력해 주세요"
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
            </>
          ) : null}

          {loginError ? (
            <Text accessibilityRole="alert" style={styles.loginError}>
              {loginError}
            </Text>
          ) : null}

          <View style={styles.loginButton}>
            <ActionButton
              label={
                authLoading
                  ? '처리 중...'
                  : authMode === 'login'
                    ? '로그인'
                    : '회원가입'
              }
              onPress={() => {
                if (authMode === 'login') {
                  void signIn();
                } else {
                  handleSignUp();
                }
              }}
              disabled={
                authLoading ||
                (authMode === 'signup' && !canSignUp)
              }
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={authLoading}
            onPress={() =>
              switchAuthMode(
                authMode === 'login' ? 'signup' : 'login',
              )
            }
            style={styles.authModeSwitch}
          >
            <Text style={styles.authModeSwitchText}>
              {authMode === 'login'
                ? '계정이 없으신가요? '
                : '이미 계정이 있으신가요? '}
              <Text style={styles.authModeSwitchLink}>
                {authMode === 'login' ? '회원가입' : '로그인'}
              </Text>
            </Text>
          </Pressable>

          <View style={styles.loginDemoNotice}>
            <Text style={styles.loginDemoTitle}>계정 및 로그인 안내</Text>
            <Text style={styles.loginDemoCopy}>
              계정 정보는 서버에서 관리됩니다. 로그인 상태는
              앱을 완전히 종료하면 유지되지 않을 수 있으며,
              다시 로그인이 필요할 수 있습니다.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
