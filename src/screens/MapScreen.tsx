import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import AppIcon from '../components/AppIcon';
import ComplaintMap from '../components/ComplaintMap';
import ComplaintCard from '../components/ComplaintCard';
import type { AppModel } from '../hooks/useAppModel';

type Props = Pick<AppModel,
  'currentAccount'
  | 'openComposer'
  | 'likedComplaintIds'
  | 'toggleLike'
  | 'setSelectedComplaint'
  | 'region'
  | 'setRegion'
  | 'userCoordinate'
  | 'locationMessage'
  | 'locationLoading'
  | 'locateUser'
  | 'navigateToScreen'
  | 'nearbyComplaints'
  | 'mapComplaints'
  | 'selectComplaintById'
>;

export default function MapScreen({
  currentAccount,
  openComposer,
  likedComplaintIds,
  toggleLike,
  setSelectedComplaint,
  region,
  setRegion,
  userCoordinate,
  locationMessage,
  locationLoading,
  locateUser,
  navigateToScreen,
  nearbyComplaints,
  mapComplaints,
  selectComplaintById,
}: Props) {
  return (
    <ScrollView style={styles.pageScroll} contentContainerStyle={styles.mapPageContent}>
      <View style={styles.mapHeader}>
        <View>
          <Text style={styles.brandTitle}>동네<Text style={styles.brandAccent}>SOS</Text></Text>
          <Text style={styles.brandSubtitle}>우리 동네 불편사항, 함께 해결해요</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="내 활동 보기" style={styles.avatarButton} onPress={() => navigateToScreen('mypage')}><Text style={styles.avatarText}>{(currentAccount?.name ?? '나').slice(0, 1)}</Text></Pressable>
      </View>
      <View style={styles.locationPill}>
        <AppIcon name="pin" color={colors.sky} />
        <Text style={styles.locationText} numberOfLines={1}>{locationMessage}</Text>
        {locationLoading ? <ActivityIndicator size="small" color={colors.sky} /> : null}
        <Pressable style={{ padding: 12 }} accessibilityLabel="현재 위치 새로고침" onPress={() => void locateUser()}><AppIcon name="refresh" color={colors.sky} /></Pressable>
      </View>
      <View style={styles.mapContainer}>
        <ComplaintMap
          region={region}
          onRegionChangeComplete={setRegion}
          complaints={mapComplaints}
          userCoordinate={userCoordinate}
          onComplaintPress={selectComplaintById}
        />
        <View style={styles.mapLegend}><View style={styles.legendDot} /><Text style={styles.legendText}>지도 내 민원 {nearbyComplaints.length}건</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="내 위치로 이동" style={styles.locateButton} onPress={() => void locateUser()}><AppIcon name="locate" color={colors.sky} /></Pressable>
        <Pressable accessibilityRole="button" style={styles.mapReportButton} onPress={() => openComposer()}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><AppIcon name="plus" color="white" size={20} /><Text style={styles.mapReportText}>불편사항 등록하기</Text></View></Pressable>
      </View>
      <View style={styles.nearbyHeader}>
        <Text style={styles.sectionTitle}>지도 주변 민원 <Text style={styles.nearbyCount}>{nearbyComplaints.length}</Text></Text>
        <Pressable onPress={() => navigateToScreen('list')}><Text style={styles.moreLink}>전체 보기 ›</Text></Pressable>
      </View>
      <View style={styles.nearbyContent}>
        {nearbyComplaints.length ? nearbyComplaints.slice(0, 3).map((item) => <ComplaintCard key={item.id} item={item} liked={likedComplaintIds.has(item.id)} onSelect={setSelectedComplaint} onToggleLike={toggleLike} />) : <Text style={styles.emptyText}>이 주변에는 아직 등록된 민원이 없어요.</Text>}
      </View>
    </ScrollView>
  );
}
