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
>;

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
}: Props) {
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
              <TextInput
                accessibilityLabel="이메일"
                style={styles.textInput}
                placeholder="이메일 주소를 입력해 주세요"
                value={signupEmail}
                onChangeText={setSignupEmail}
                maxLength={254}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
              />
            </>
          ) : null}
          <Text style={styles.inputLabel}>아이디</Text>
          <TextInput
            accessibilityLabel="아이디"
            style={styles.textInput}
            placeholder="4~20자 영문, 숫자, . _ -"
            value={loginId}
            onChangeText={setLoginId}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="username"
            returnKeyType="next"
          />
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
