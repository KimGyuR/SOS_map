import { ScrollView, Text, View } from 'react-native';
import { styles } from '../theme/appStyles';
import ActionButton from '../components/ActionButton';
import SectionTitle from '../components/SectionTitle';
import ComplaintCard from '../components/ComplaintCard';
import type { AppModel } from '../hooks/useAppModel';

type Props = Pick<AppModel,
  'currentAccount'
  | 'loginId'
  | 'signOut'
  | 'complaints'
  | 'likedComplaintIds'
  | 'toggleLike'
  | 'setSelectedComplaint'
>;

export default function ProfileScreen({
  currentAccount,
  loginId,
  signOut,
  complaints,
  likedComplaintIds,
  toggleLike,
  setSelectedComplaint,
}: Props) {
  return (
    <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}><Text style={styles.avatarText}>{(currentAccount?.name ?? '나').slice(0, 1)}</Text></View>
        <View><Text style={styles.profileName}>{currentAccount?.name ?? loginId}님</Text><Text style={styles.profileCaption}>우리 동네를 바꾸는 작은 참여</Text></View>
      </View>
      <SectionTitle>내 활동</SectionTitle>
      <View style={styles.statRow}>
        <View style={styles.statCard}><Text style={styles.statNumber}>{complaints.length}</Text><Text style={styles.statLabel}>등록한 민원</Text></View>
        <View style={styles.statCard}><Text style={styles.statNumber}>{complaints.filter((item) => item.status === '해결 완료').length}</Text><Text style={styles.statLabel}>해결된 민원</Text></View>
        <View style={styles.statCard}><Text style={styles.statNumber}>0</Text><Text style={styles.statLabel}>받은 공감</Text></View>
      </View>
      <SectionTitle>내가 등록한 민원</SectionTitle>
      {complaints.slice(0, 4).map((item) => <ComplaintCard key={item.id} item={item} liked={likedComplaintIds.has(item.id)} onSelect={setSelectedComplaint} onToggleLike={toggleLike} />)}
      <View style={styles.demoNotice}><Text style={styles.demoNoticeText}>데모 모드: 로그인과 민원 정보는 서버에 저장되지 않아요.</Text></View>
      <View style={styles.sectionGap} />
      <ActionButton label="로그아웃" onPress={signOut} secondary />
    </ScrollView>
  );
}
