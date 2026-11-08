import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import AppIcon from '../components/AppIcon';
import ActionButton from '../components/ActionButton';
import SectionTitle from '../components/SectionTitle';
import ComplaintCard from '../components/ComplaintCard';
import type { AppModel } from '../hooks/useAppModel';

type Props = Pick<AppModel,
  | 'selectedFestival'
  | 'setSelectedFestival'
  | 'openComposer'
  | 'serverFestivals'
  | 'festivalsLoading'
  | 'festivalsError'
  | 'festivalComplaints'
  | 'festivalLikedIds'
  | 'toggleServerLike'
  | 'setSelectedComplaint'
>;

/** API #16: 축제 목록. 가짜 축제를 실제 서버 데이터인 것처럼 표시하지 않는다. */
export default function FestivalScreen({
  selectedFestival,
  setSelectedFestival,
  openComposer,
  serverFestivals,
  festivalsLoading,
  festivalsError,
  festivalComplaints,
  festivalLikedIds,
  toggleServerLike,
  setSelectedComplaint,
}: Props) {
  const selected = serverFestivals.find((festival) => festival.name === selectedFestival);
  const activeCount = serverFestivals.filter((festival) => festival.active).length;

  return (
    <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
      <View style={styles.festivalHero}>
        <Text style={styles.festivalEyebrow}>LOCAL FESTIVAL CARE</Text>
        <Text style={styles.festivalHeading}>축제도, 동네도{'\n'}더 편안하게</Text>
        <Text style={styles.festivalDescription}>축제 현장의 불편을 운영팀에 빠르게 전달해요.</Text>
      </View>

      <SectionTitle detail={`${activeCount}개 진행 중`}>지역 축제</SectionTitle>
      {festivalsLoading ? <Text style={styles.emptyText}>축제 목록을 불러오고 있어요.</Text> : null}
      {festivalsError ? (
        <Text accessibilityRole="alert" style={styles.emptyText}>축제 조회 오류: {festivalsError}</Text>
      ) : null}
      {!festivalsLoading && !festivalsError && serverFestivals.length === 0 ? (
        <Text style={styles.emptyText}>등록된 축제가 없어요.</Text>
      ) : null}

      {serverFestivals.map((festival) => (
        <Pressable
          key={festival.id}
          onPress={() => setSelectedFestival(festival.name)}
          style={[styles.festivalCard, selectedFestival === festival.name && styles.festivalCardSelected]}
        >
          <View style={styles.festivalCalendar}><AppIcon name="festival" color={colors.sky} /></View>
          <View style={styles.festivalCardBody}>
            <Text style={styles.festivalName}>{festival.name}</Text>
            <Text style={styles.festivalInfo}>{festival.date}  ·  {festival.location}</Text>
          </View>
          <Text style={festival.active ? styles.activeBadge : styles.endedBadge}>
            {festival.active ? '진행 중' : '종료 또는 준비 중'}
          </Text>
        </Pressable>
      ))}

      <ActionButton
        label="선택한 축제 불편 신고하기"
        onPress={() => openComposer(true)}
        disabled={!selected?.active}
      />
      <View style={styles.sectionGap} />
      <SectionTitle detail={`${festivalComplaints.length}건`}>축제 현장 민원</SectionTitle>
      {festivalComplaints.length ? festivalComplaints.map((item) => (
        <ComplaintCard
          key={item.id}
          item={item}
          liked={festivalLikedIds.has(item.id)}
          onSelect={setSelectedComplaint}
          onToggleLike={(id: string) => void toggleServerLike(id)}
        />
      )) : <Text style={styles.emptyText}>아직 접수된 축제 민원이 없어요.</Text>}
    </ScrollView>
  );
}
