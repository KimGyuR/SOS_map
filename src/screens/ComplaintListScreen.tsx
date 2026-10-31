import { Pressable, ScrollView, Text } from 'react-native';
import { AREAS } from '../domain/catalog';
import { styles } from '../theme/appStyles';
import SectionTitle from '../components/SectionTitle';
import ComplaintCard from '../components/ComplaintCard';
import type { AppModel } from '../hooks/useAppModel';

type Props = Pick<AppModel,
  'likedComplaintIds'
  | 'toggleLike'
  | 'setSelectedComplaint'
  | 'visibleComplaints'
  | 'filterArea'
  | 'setFilterArea'
>;

export default function ComplaintListScreen({
  likedComplaintIds,
  toggleLike,
  setSelectedComplaint,
  visibleComplaints,
  filterArea,
  setFilterArea,
}: Props) {
  return (
    <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
      <SectionTitle detail={`${visibleComplaints.length}건`}>불편사항 목록</SectionTitle>
      <Text style={styles.pageDescription}>우리 동네에 등록된 문제를 확인하고 함께 해결해요.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {[{ id: 'all' as const, label: '전체 지역' }, ...AREAS.map((area) => ({ id: area, label: area }))].map((item) => (
          <Pressable key={item.id} onPress={() => setFilterArea(item.id)} style={[styles.filterChip, filterArea === item.id && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, filterArea === item.id && styles.filterChipTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {visibleComplaints.length ? visibleComplaints.map((item) => <ComplaintCard key={item.id} item={item} liked={likedComplaintIds.has(item.id)} onSelect={setSelectedComplaint} onToggleLike={toggleLike} />) : <Text style={styles.emptyText}>등록된 민원이 없어요.</Text>}
    </ScrollView>
  );
}
