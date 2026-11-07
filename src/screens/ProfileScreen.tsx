
import { ScrollView, Text, View } from 'react-native';
import { styles } from '../theme/appStyles';
import ActionButton from '../components/ActionButton';
import SectionTitle from '../components/SectionTitle';
import ComplaintCard from '../components/ComplaintCard';
import type { AppModel } from '../hooks/useAppModel';

type Props = Pick<
  AppModel,
  | 'currentAccount'
  | 'loginId'
  | 'signOut'
  | 'likedComplaintIds'
  | 'toggleLike'
  | 'setSelectedComplaint'
  | 'myPage'
  | 'myPageLoading'
  | 'myPageError'
>;

export default function ProfileScreen({
  currentAccount,
  loginId,
  signOut,
  likedComplaintIds,
  toggleLike,
  setSelectedComplaint,
  myPage,
  myPageLoading,
  myPageError,
}: Props) {
  // 서버에서 받은 최근 민원 목록
  const recentComplaints = myPage?.recentComplaints ?? [];

  // 서버에서 받은 활동 통계
  const reportedCount = myPage?.stats.reportedCount ?? 0;
  const resolvedCount = myPage?.stats.resolvedCount ?? 0;
  const receivedEmpathyCount =
    myPage?.stats.receivedEmpathyCount ?? 0;

  // 사용자 이름은 기존 로그인 정보로 표시
  const displayName = currentAccount?.name ?? loginId;

  return (
    <ScrollView
      style={styles.pageScroll}
      contentContainerStyle={styles.pageContent}
    >
      {/* 사용자 프로필 */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.avatarText}>
            {(displayName || '나').slice(0, 1)}
          </Text>
        </View>

        <View>
          <Text style={styles.profileName}>
            {displayName}님
          </Text>
          <Text style={styles.profileCaption}>
            우리 동네를 바꾸는 작은 참여
          </Text>
        </View>
      </View>

      {/* API 요청 상태 */}
      {myPageLoading && (
        <Text>마이페이지 정보를 불러오는 중...</Text>
      )}

      {!!myPageError && (
        <Text>마이페이지 조회 실패: {myPageError}</Text>
      )}

      {/* 서버에서 받은 통계 */}
      <SectionTitle>내 활동</SectionTitle>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {reportedCount}
          </Text>
          <Text style={styles.statLabel}>
            등록한 민원
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {resolvedCount}
          </Text>
          <Text style={styles.statLabel}>
            해결된 민원
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {receivedEmpathyCount}
          </Text>
          <Text style={styles.statLabel}>
            받은 공감
          </Text>
        </View>
      </View>

      {/* 서버에서 받은 최근 민원 */}
      <SectionTitle>내가 등록한 민원</SectionTitle>

      {recentComplaints.map((item) => (
        <ComplaintCard
          key={item.id}
          item={item}
          liked={
            myPage?.likedIds.has(item.id) ??
            likedComplaintIds.has(item.id)
          }
          onSelect={setSelectedComplaint}
          onToggleLike={toggleLike}
        />
      ))}

      {!myPageLoading &&
        !myPageError &&
        myPage &&
        recentComplaints.length === 0 && (
          <Text>아직 등록한 민원이 없어요.</Text>
        )}

      <View style={styles.sectionGap} />

      <ActionButton
        label="로그아웃"
        onPress={signOut}
        secondary
      />
    </ScrollView>
  );
}
