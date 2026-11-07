import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import AppIcon from '../components/AppIcon';
import NeighborhoodArt from '../components/NeighborhoodArt';
import ActionButton from '../components/ActionButton';
import type { AppModel } from '../hooks/useAppModel';

type Props = Pick<AppModel,
  'authReady'
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
> & {
  // 서버 연결 담당이 연결할 함수. true = 사용 가능, false = 이미 사용 중. 없으면 데모로 항상 "사용 가능"으로 처리
  onCheckEmail?: (email: string) => Promise<boolean>;
  onCheckLoginId?: (loginId: string) => Promise<boolean>;
};

type CheckResult = { ok: boolean; message: string } | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_ID_PATTERN = /^[A-Za-z0-9._-]{4,20}$/;

const checkButtonStyle = { minHeight: 52, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, borderColor: colors.sky, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' } as const;

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
  address,
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

  const changeEmail = (value: string) => {
    setSignupEmail(value);
    setEmailCheck(null);
  };
  const changeLoginId = (value: string) => {
    setLoginId(value);
    setIdCheck(null);
  };
  const checkEmail = async () => {
    const email = signupEmail.trim();
    if (!EMAIL_PATTERN.test(email)) return setEmailCheck({ ok: false, message: '이메일 형식을 확인해 주세요.' });
    setChecking('email');
    try {
      const available = onCheckEmail ? await onCheckEmail(email) : true;
      setEmailCheck(available ? { ok: true, message: '사용할 수 있는 이메일이에요.' } : { ok: false, message: '이미 사용 중인 이메일이에요.' });
    } catch {
      setEmailCheck({ ok: false, message: '확인하지 못했어요. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setChecking(null);
    }
  };
  const checkLoginId = async () => {
    const id = loginId.trim();
    if (!LOGIN_ID_PATTERN.test(id)) return setIdCheck({ ok: false, message: '아이디는 4~20자 영문, 숫자, . _ - 만 쓸 수 있어요.' });
    setChecking('id');
    try {
      const available = onCheckLoginId ? await onCheckLoginId(id) : true;
      setIdCheck(available ? { ok: true, message: '사용할 수 있는 아이디예요.' } : { ok: false, message: '이미 사용 중인 아이디예요.' });
    } catch {
      setIdCheck({ ok: false, message: '확인하지 못했어요. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setChecking(null);
    }
  };
  const resultText = (result: CheckResult) => (result ? <Text style={{ color: result.ok ? '#2E7D5B' : '#D84848', fontSize: 11, marginTop: 7 }}>{result.message}</Text> : null);

  if (!authReady) {
    return (
      <View style={styles.authLoadingScreen}>
        <ActivityIndicator size="large" color={colors.sky} />
        <Text style={styles.authLoadingText}>저장된 계정을 확인하고 있어요</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.loginPage} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.loginScroll}
        contentContainerStyle={styles.loginScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.loginBrand}>
          <View style={styles.brandLockup}><View style={styles.loginLogo}><AppIcon name="pin" color={'white'} /></View><Text style={styles.brandWordmark}>동네SOS</Text></View>
          <Text style={styles.loginTitle}>더 좋은 동네,{'\n'}우리의 작은 관심부터.</Text>
          <Text style={styles.loginSubtitle}>발견하고, 알리고, 함께 바꾸는 우리 동네</Text>
          {authMode === 'login' ? <NeighborhoodArt /> : null}
        </View>
        <View style={styles.loginCard}>
          <Text style={styles.loginHeading}>{authMode === 'login' ? '우리 동네와 연결하기' : '반가워요, 새로운 이웃님'}</Text>
          <Text style={styles.loginIntro}>{authMode === 'login' ? '로그인하고 동네의 이야기를 확인해 보세요.' : '함께 더 살기 좋은 동네를 만들어 가요.'}</Text>
          {authMode === 'signup' ? (
            <>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                accessibilityLabel="이름"
                style={styles.textInput}
                placeholder="이름을 입력해 주세요"
                value={signupName}
                onChangeText={setSignupName}
                maxLength={30}
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
                  maxLength={254}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                />
                <Pressable accessibilityRole="button" accessibilityLabel="이메일 중복 확인" disabled={checking !== null} onPress={() => void checkEmail()} style={checkButtonStyle}>
                  <Text style={{ color: colors.sky, fontSize: 13, fontWeight: '700' }}>{checking === 'email' ? '확인 중' : '중복 확인'}</Text>
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
              <Pressable accessibilityRole="button" accessibilityLabel="아이디 중복 확인" disabled={checking !== null} onPress={() => void checkLoginId()} style={checkButtonStyle}>
                <Text style={{ color: colors.sky, fontSize: 13, fontWeight: '700' }}>{checking === 'id' ? '확인 중' : '중복 확인'}</Text>
              </Pressable>
            ) : null}
          </View>
          {authMode === 'signup' ? resultText(idCheck) : null}
          <Text style={styles.inputLabel}>비밀번호</Text>
          <TextInput
            accessibilityLabel="비밀번호"
            style={styles.textInput}
            placeholder={authMode === 'signup' ? '영문·숫자 포함 8자 이상' : '비밀번호를 입력해 주세요'}
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType={authMode === 'signup' ? 'newPassword' : 'password'}
            autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
            returnKeyType={authMode === 'signup' ? 'next' : 'done'}
            onSubmitEditing={authMode === 'login' ? signIn : undefined}
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
                onSubmitEditing={signUp}
              />
            </>
          ) : null}
          {loginError ? <Text accessibilityRole="alert" style={styles.loginError}>{loginError}</Text> : null}
          <View style={styles.loginButton}>
            <ActionButton
              label={authLoading ? '처리 중...' : authMode === 'login' ? '로그인' : '회원가입'}
              onPress={() => void (authMode === 'login' ? signIn() : signUp())}
              disabled={authLoading}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={authLoading}
            onPress={() => switchAuthMode(authMode === 'login' ? 'signup' : 'login')}
            style={styles.authModeSwitch}
          >
            <Text style={styles.authModeSwitchText}>
              {authMode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
              <Text style={styles.authModeSwitchLink}>{authMode === 'login' ? '회원가입' : '로그인'}</Text>
            </Text>
          </Pressable>
          <View style={styles.loginDemoNotice}>
            <Text style={styles.loginDemoTitle}>기기 저장 안내</Text>
            <Text style={styles.loginDemoCopy}>계정은 이 기기 또는 브라우저에 저장되며, 비밀번호 원문은 저장하지 않습니다. 앱 데이터를 지우거나 다른 기기를 사용하면 계정을 다시 만들어야 해요.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
