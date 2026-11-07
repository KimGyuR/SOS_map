import { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { AREAS } from '../domain/catalog';
import type { ComplaintStatus } from '../domain/types';
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

type StatusFilter = 'all' | ComplaintStatus;
type SortBy = 'latest' | 'empathy';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: '전체 상태' },
  { id: '접수', label: '접수' },
  { id: '처리 중', label: '처리 중' },
  { id: '해결 완료', label: '해결 완료' },
];

const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: 'latest', label: '최신순' },
  { id: 'empathy', label: '공감순' },
];

export default function ComplaintListScreen({
  likedComplaintIds,
  toggleLike,
  setSelectedComplaint,
  visibleComplaints,
  filterArea,
  setFilterArea,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('latest');
  const filteredComplaints = visibleComplaints.filter((item) => statusFilter === 'all' || item.status === statusFilter);
  const shownComplaints = sortBy === 'empathy'
    ? [...filteredComplaints].sort((a, b) => b.likeCount - a.likeCount)
    : filteredComplaints;
  return (
    <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
      <SectionTitle detail={`${shownComplaints.length}건`}>불편사항 목록</SectionTitle>
      <Text style={styles.pageDescription}>우리 동네에 등록된 문제를 확인하고 함께 해결해요.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {[{ id: 'all' as const, label: '전체 지역' }, ...AREAS.map((area) => ({ id: area, label: area }))].map((item) => (
          <Pressable key={item.id} onPress={() => setFilterArea(item.id)} style={[styles.filterChip, filterArea === item.id && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, filterArea === item.id && styles.filterChipTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {STATUS_FILTERS.map((item) => (
          <Pressable key={item.id} onPress={() => setStatusFilter(item.id)} style={[styles.filterChip, statusFilter === item.id && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, statusFilter === item.id && styles.filterChipTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {SORT_OPTIONS.map((item) => (
          <Pressable key={item.id} onPress={() => setSortBy(item.id)} style={[styles.filterChip, sortBy === item.id && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, sortBy === item.id && styles.filterChipTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {shownComplaints.length ? shownComplaints.map((item) => <ComplaintCard key={item.id} item={item} liked={likedComplaintIds.has(item.id)} onSelect={setSelectedComplaint} onToggleLike={toggleLike} />) : <Text style={styles.emptyText}>등록된 민원이 없어요.</Text>}
    </ScrollView>
  );
}
