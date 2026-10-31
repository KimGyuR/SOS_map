import { Pressable, ScrollView, Text, View } from 'react-native';
import { FESTIVALS } from '../domain/catalog';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import AppIcon from '../components/AppIcon';
import ActionButton from '../components/ActionButton';
import SectionTitle from '../components/SectionTitle';
import ComplaintCard from '../components/ComplaintCard';
import type { AppModel } from '../hooks/useAppModel';

type Props = Pick<AppModel,
  'selectedFestival'
  | 'category'
  | 'setSelectedFestival'
  | 'openComposer'
  | 'complaints'
  | 'likedComplaintIds'
  | 'toggleLike'
  | 'setSelectedComplaint'
>;

export default function FestivalScreen({
  selectedFestival,
  category,
  setSelectedFestival,
  openComposer,
  complaints,
  likedComplaintIds,
  toggleLike,
  setSelectedComplaint,
}: Props) {
  const festivalComplaints = complaints.filter((item) => item.category === 'festival');
  return (
    <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
      <View style={styles.festivalHero}>
        <Text style={styles.festivalEyebrow}>LOCAL FESTIVAL CARE</Text>
        <Text style={styles.festivalHeading}>축제도, 동네도{'\n'}더 편안하게</Text>
        <Text style={styles.festivalDescription}>축제 현장의 불편을 운영팀에 빠르게 전달해요.</Text>
      </View>
      <SectionTitle detail={`${FESTIVALS.filter((item) => item.active).length}개 진행 중`}>지역 축제</SectionTitle>
      {FESTIVALS.map((festival) => (
        <Pressable
          key={festival.name}
          onPress={() => setSelectedFestival(festival.name)}
          style={[styles.festivalCard, selectedFestival === festival.name && styles.festivalCardSelected]}
        >
          <View style={styles.festivalCalendar}><AppIcon name="festival" color={colors.sky} /></View>
          <View style={styles.festivalCardBody}>
            <Text style={styles.festivalName}>{festival.name}</Text>
            <Text style={styles.festivalInfo}>{festival.date}  ·  {festival.location}</Text>
          </View>
          <Text style={festival.active ? styles.activeBadge : styles.endedBadge}>{festival.active ? '진행 중' : '종료'}</Text>
        </Pressable>
      ))}
      <ActionButton label="선택한 축제 불편 신고하기" onPress={() => openComposer(true)} disabled={!FESTIVALS.find((item) => item.name === selectedFestival)?.active} />
      <View style={styles.sectionGap} />
      <SectionTitle detail={`${festivalComplaints.length}건`}>축제 현장 민원</SectionTitle>
      {festivalComplaints.length ? festivalComplaints.map((item) => <ComplaintCard key={item.id} item={item} liked={likedComplaintIds.has(item.id)} onSelect={setSelectedComplaint} onToggleLike={toggleLike} />) : <Text style={styles.emptyText}>아직 접수된 축제 민원이 없어요.</Text>}
    </ScrollView>
  );
}
