import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import ComplaintMap from './src/components/ComplaintMap';
import type { MapRegion } from './src/components/ComplaintMap.types';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';

type CategoryId = 'road' | 'trash' | 'streetlight' | 'parking' | 'noise' | 'animal' | 'festival' | 'other';
type Screen = 'map' | 'list' | 'festival' | 'mypage';
type ComplaintStatus = '접수' | '처리 중' | '해결 완료';

type Category = {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;
  agency: string;
  estimate: string;
};

type Complaint = {
  id: string;
  title: string;
  address: string;
  category: CategoryId;
  status: ComplaintStatus;
  latitude: number;
  longitude: number;
  createdAt: string;
  description?: string;
  isSample?: boolean;
  festival?: string;
};

const CATEGORIES: Category[] = [
  { id: 'road', label: '도로 파손', emoji: '🛣️', color: '#F05252', agency: '도로관리과', estimate: '3~5일' },
  { id: 'trash', label: '쓰레기', emoji: '🗑️', color: '#F5AE22', agency: '청소행정과', estimate: '1~2일' },
  { id: 'streetlight', label: '가로등', emoji: '💡', color: '#3777ED', agency: '도로관리과', estimate: '2~4일' },
  { id: 'parking', label: '불법 주정차', emoji: '🚗', color: '#21A780', agency: '교통지도과', estimate: '현장 확인 후 조치' },
  { id: 'noise', label: '소음', emoji: '🔊', color: '#9B68D8', agency: '환경관리과', estimate: '2~3일' },
  { id: 'animal', label: '동물 사체', emoji: '🐾', color: '#64748B', agency: '동물보호 담당 부서', estimate: '당일 확인' },
  { id: 'festival', label: '축제 불편', emoji: '🎪', color: '#EC6D9A', agency: '축제 운영센터', estimate: '당일~1일' },
  { id: 'other', label: '기타', emoji: '📍', color: '#64748B', agency: '민원 담당 부서', estimate: '담당 부서 확인 후 안내' },
];

const INITIAL_REGION: MapRegion = {
  latitude: 35.8714,
  longitude: 128.6014,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

const INITIAL_COMPLAINTS: Complaint[] = [
  { id: '1', title: '보도블록이 파손되어 걸을 때 위험해요', address: '내 주변 · 데모 위치', category: 'road', status: '처리 중', latitude: 35.8718, longitude: 128.6019, createdAt: '3시간 전', description: '보도블록이 파손되어 걸을 때 걸려 넘어질 위험이 있어요.', isSample: true },
  { id: '2', title: '공원 입구에 쓰레기가 쌓였어요', address: '내 주변 · 데모 위치', category: 'trash', status: '접수', latitude: 35.874, longitude: 128.598, createdAt: '어제', description: '공원 입구에 쓰레기가 쌓여 있어 정리가 필요해요.', isSample: true },
  { id: '3', title: '골목 가로등이 켜지지 않아요', address: '내 주변 · 데모 위치', category: 'streetlight', status: '해결 완료', latitude: 35.8688, longitude: 128.605, createdAt: '2일 전', description: '밤에 골목이 어두워 보행이 불편해요.', isSample: true },
  { id: '4', title: '축제 현장 안내 표지가 부족해요', address: '내 주변 · 데모 위치', category: 'festival', status: '접수', latitude: 35.876, longitude: 128.607, createdAt: '1시간 전', description: '행사장 안내 표지가 부족해 길을 찾기 어려워요.', festival: '대구 야간 페스타', isSample: true },
];

const FESTIVALS = [
  { name: '대구 야간 페스타', date: '10.24 – 10.26', location: '국채보상운동기념공원', active: true },
  { name: '동성로 청년 페스티벌', date: '11.01 – 11.02', location: '동성로 일대', active: true },
  { name: '수성못 가을 음악회', date: '지난 행사', location: '수성못 상화동산', active: false },
];

const getCategory = (id: CategoryId) => CATEGORIES.find((item) => item.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.actionButtonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

function SectionTitle({ children, detail }: { children: string; detail?: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

export default function App() {
  const router = useRouter();
  const { screen: routeScreen } = useLocalSearchParams<{ screen?: string }>();
  const initialScreen: Screen =
    routeScreen === 'list' || routeScreen === 'festival' || routeScreen === 'mypage' ? routeScreen : 'map';
  const activeScreen = initialScreen;
  const [complaints, setComplaints] = useState(INITIAL_COMPLAINTS);
  const [region, setRegion] = useState<MapRegion>(INITIAL_REGION);
  const [userCoordinate, setUserCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('위치를 확인하고 있어요');
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedFestival, setSelectedFestival] = useState(FESTIVALS[0].name);
  const [composerOpen, setComposerOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId>('road');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [reportCoordinate, setReportCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [animalBlurConfirmed, setAnimalBlurConfirmed] = useState(false);
  const [hasAnimalCarcass, setHasAnimalCarcass] = useState(false);
  const [faceBlurAcknowledged, setFaceBlurAcknowledged] = useState(false);
  const [filterCategory, setFilterCategory] = useState<CategoryId | 'all'>('all');

  useEffect(() => {
    void locateUser();
  }, []);

  const visibleComplaints = useMemo(() => {
    const source = activeScreen === 'festival' ? complaints.filter((item) => item.category === 'festival') : complaints;
    return filterCategory === 'all' ? source : source.filter((item) => item.category === filterCategory);
  }, [activeScreen, complaints, filterCategory]);

  async function locateUser() {
    setLocationLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationMessage('위치 권한이 없어 대구 중구 기준으로 표시해요');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordinate = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setUserCoordinate(coordinate);
      setRegion({ ...coordinate, latitudeDelta: 0.018, longitudeDelta: 0.018 });
      setReportCoordinate(coordinate);
      const [place] = await Location.reverseGeocodeAsync(coordinate);
      if (place) {
        const readableAddress = [place.region, place.city, place.district, place.street, place.name].filter(Boolean).join(' ');
        setAddress(readableAddress);
        setLocationMessage(readableAddress || '현재 위치를 확인했어요');
      } else {
        setLocationMessage('현재 위치를 확인했어요');
      }
    } catch {
      setLocationMessage('현재 위치를 가져오지 못해 대구 중구 기준으로 표시해요');
    } finally {
      setLocationLoading(false);
    }
  }

  function openComposer(forFestival = false) {
    setSelectedComplaint(null);
    setComposerOpen(true);
    setStep(1);
    setPhotoUri(null);
    setTitle('');
    setDescription('');
    setCategory(forFestival ? 'festival' : 'road');
    setReportCoordinate(userCoordinate ?? { latitude: region.latitude, longitude: region.longitude });
    setAnimalBlurConfirmed(false);
    setHasAnimalCarcass(false);
    setFaceBlurAcknowledged(false);
    if (!address) setAddress('대구광역시 중구 동성로 12-3');
  }

  async function addPhoto(source: 'camera' | 'library') {
    try {
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
        setAnimalBlurConfirmed(false);
        setHasAnimalCarcass(false);
        setFaceBlurAcknowledged(false);
      }
    } catch {
      Alert.alert('사진을 불러오지 못했어요', '카메라 또는 사진 접근 권한을 확인하고 다시 시도해 주세요.');
    }
  }

  async function updateReportLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('위치 권한이 필요해요', '설정에서 위치 접근을 허용하거나 주소를 직접 입력해 주세요.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordinate = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setUserCoordinate(coordinate);
      setReportCoordinate(coordinate);
      setRegion({ ...coordinate, latitudeDelta: 0.018, longitudeDelta: 0.018 });
      const [place] = await Location.reverseGeocodeAsync(coordinate);
      if (place) setAddress([place.region, place.city, place.district, place.street, place.name].filter(Boolean).join(' '));
    } catch {
      Alert.alert('위치를 가져오지 못했어요', '잠시 후 다시 시도하거나 주소를 직접 입력해 주세요.');
    }
  }

  function advanceStep() {
    if (step === 1) {
      if (!photoUri) {
        Alert.alert('사진을 추가해 주세요', '현장 사진을 촬영하거나 앨범에서 선택해 주세요.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!title.trim() || !description.trim()) {
        Alert.alert('내용을 입력해 주세요', '문제 제목과 상세 내용을 작성해 주세요.');
        return;
      }
      setStep(3);
    }
  }

  function submitComplaint() {
    if (!faceBlurAcknowledged) {
      Alert.alert('사진 개인정보를 확인해 주세요', '얼굴 자동 블러는 AI 서비스가 연결되지 않은 데모입니다. 실제 서비스에서는 업로드 전 얼굴 블러 처리가 완료되어야 합니다.');
      return;
    }
    if (hasAnimalCarcass && !animalBlurConfirmed) {
      Alert.alert('동물 사체 사진을 확인해 주세요', '동물 사체는 앱에서 자동으로 가림 처리하지 않으므로, 사진을 직접 편집한 후 등록해 주세요.');
      return;
    }
    const coordinate = reportCoordinate ?? { latitude: region.latitude, longitude: region.longitude };
    const newComplaint: Complaint = {
      id: Date.now().toString(),
      title: title.trim(),
      address: address.trim() || '위치 정보 없음',
      category,
      status: '접수',
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      createdAt: '방금 전',
      description: description.trim(),
      ...(category === 'festival' ? { festival: selectedFestival } : {}),
    };
    setComplaints((items) => [newComplaint, ...items]);
    setComposerOpen(false);
    router.setParams({ screen: category === 'festival' ? 'festival' : 'map' });
    setSelectedComplaint(null);
    setFilterCategory('all');
    Alert.alert('민원이 등록되었어요', '데모에서는 이 기기에만 저장됩니다. 지도와 목록에서 확인할 수 있어요.');
  }

  function renderComplaintCard(item: Complaint) {
    const itemCategory = getCategory(item.category);
    return (
      <Pressable key={item.id} style={styles.complaintCard} onPress={() => setSelectedComplaint(item)}>
        <View style={[styles.categoryIcon, { backgroundColor: `${itemCategory.color}18` }]}>
          <Text style={styles.categoryEmoji}>{itemCategory.emoji}</Text>
        </View>
        <View style={styles.complaintBody}>
          <View style={styles.cardMetaRow}>
            <Text style={[styles.categoryLabel, { color: itemCategory.color }]}>{itemCategory.label}</Text>
            {item.isSample ? <Text style={styles.sampleTag}>데모</Text> : null}
            <Text style={styles.timeLabel}>{item.createdAt}</Text>
          </View>
          <Text style={styles.complaintTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.addressText} numberOfLines={1}>⌖  {item.address}</Text>
          {item.festival ? <Text style={styles.festivalTag}>🎪 {item.festival}</Text> : null}
        </View>
        <Text style={[styles.statusText, item.status === '해결 완료' && styles.statusDone]}>{item.status}</Text>
      </Pressable>
    );
  }

  function navigateToScreen(screen: Screen) {
    router.setParams({ screen });
    setSelectedComplaint(null);
  }

  function renderMapScreen() {
    return (
      <>
        <View style={styles.mapHeader}>
          <View>
            <Text style={styles.brandTitle}>동네<Text style={styles.brandAccent}>SOS</Text></Text>
            <Text style={styles.brandSubtitle}>우리 동네 불편사항, 함께 해결해요</Text>
          </View>
          <Pressable style={styles.avatarButton} onPress={() => navigateToScreen('mypage')}><Text style={styles.avatarText}>🙂</Text></Pressable>
        </View>
        <View style={styles.locationPill}>
          <Text style={styles.locationPin}>⌖</Text>
          <Text style={styles.locationText} numberOfLines={1}>{locationMessage}</Text>
          {locationLoading ? <ActivityIndicator size="small" color="#0878F9" /> : null}
          <Pressable accessibilityLabel="현재 위치 새로고침" onPress={() => void locateUser()}><Text style={styles.refreshText}>↻</Text></Pressable>
        </View>
        <View style={styles.mapContainer}>
          <ComplaintMap
            region={region}
            onRegionChangeComplete={setRegion}
            complaints={complaints.map((item) => {
              const itemCategory = getCategory(item.category);
              const coordinate =
                item.isSample && userCoordinate
                  ? {
                      latitude: userCoordinate.latitude + item.latitude - INITIAL_REGION.latitude,
                      longitude: userCoordinate.longitude + item.longitude - INITIAL_REGION.longitude,
                    }
                  : { latitude: item.latitude, longitude: item.longitude };
              return {
                id: item.id,
                title: item.title,
                coordinate,
                emoji: itemCategory.emoji,
                color: itemCategory.color,
              };
            })}
            userCoordinate={userCoordinate}
            onComplaintPress={(id) => setSelectedComplaint(complaints.find((item) => item.id === id) ?? null)}
          />
          <View style={styles.mapLegend}><View style={styles.legendDot} /><Text style={styles.legendText}>주변 민원 {complaints.length}건</Text></View>
          <Pressable style={styles.locateButton} onPress={() => void locateUser()}><Text style={styles.locateButtonText}>◎</Text></Pressable>
          <Pressable style={styles.mapReportButton} onPress={() => openComposer()}><Text style={styles.mapReportText}>＋  불편사항 등록하기</Text></Pressable>
        </View>
        <View style={styles.nearbyHeader}>
          <SectionTitle>내 주변 민원</SectionTitle>
          <Pressable onPress={() => navigateToScreen('list')}><Text style={styles.moreLink}>전체 보기 ›</Text></Pressable>
        </View>
        <ScrollView style={styles.nearbyList} contentContainerStyle={styles.nearbyContent}>
          {complaints.slice(0, 3).map(renderComplaintCard)}
        </ScrollView>
      </>
    );
  }

  function renderListScreen() {
    return (
      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
        <SectionTitle detail={`${visibleComplaints.length}건`}>불편사항 목록</SectionTitle>
        <Text style={styles.pageDescription}>우리 동네에 등록된 문제를 확인하고 함께 해결해요.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {[{ id: 'all' as const, label: '전체' }, ...CATEGORIES.map((item) => ({ id: item.id, label: item.label }))].map((item) => (
            <Pressable key={item.id} onPress={() => setFilterCategory(item.id)} style={[styles.filterChip, filterCategory === item.id && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, filterCategory === item.id && styles.filterChipTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {visibleComplaints.length ? visibleComplaints.map(renderComplaintCard) : <Text style={styles.emptyText}>등록된 민원이 없어요.</Text>}
      </ScrollView>
    );
  }

  function renderFestivalScreen() {
    const festivalComplaints = complaints.filter((item) => item.category === 'festival');
    return (
      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
        <View style={styles.festivalHero}>
          <Text style={styles.festivalEyebrow}>LOCAL FESTIVAL CARE</Text>
          <Text style={styles.festivalHeading}>축제도, 동네도{'\n'}더 편안하게 🎪</Text>
          <Text style={styles.festivalDescription}>축제 현장의 불편을 운영팀에 빠르게 전달해요.</Text>
        </View>
        <SectionTitle detail={`${FESTIVALS.filter((item) => item.active).length}개 진행 중`}>지역 축제</SectionTitle>
        {FESTIVALS.map((festival) => (
          <Pressable
            key={festival.name}
            onPress={() => setSelectedFestival(festival.name)}
            style={[styles.festivalCard, selectedFestival === festival.name && styles.festivalCardSelected]}
          >
            <View style={styles.festivalCalendar}><Text style={styles.festivalCalendarEmoji}>🎪</Text></View>
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
        {festivalComplaints.length ? festivalComplaints.map(renderComplaintCard) : <Text style={styles.emptyText}>아직 접수된 축제 민원이 없어요.</Text>}
      </ScrollView>
    );
  }

  function renderMyPage() {
    return (
      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
        <View style={styles.profileCard}>
          <Text style={styles.profileEmoji}>🙂</Text>
          <View><Text style={styles.profileName}>동네 주민님</Text><Text style={styles.profileCaption}>우리 동네를 바꾸는 작은 참여</Text></View>
        </View>
        <SectionTitle>내 활동</SectionTitle>
        <View style={styles.statRow}>
          <View style={styles.statCard}><Text style={styles.statNumber}>{complaints.length}</Text><Text style={styles.statLabel}>등록한 민원</Text></View>
          <View style={styles.statCard}><Text style={styles.statNumber}>{complaints.filter((item) => item.status === '해결 완료').length}</Text><Text style={styles.statLabel}>해결된 민원</Text></View>
          <View style={styles.statCard}><Text style={styles.statNumber}>0</Text><Text style={styles.statLabel}>받은 공감</Text></View>
        </View>
        <SectionTitle>내가 등록한 민원</SectionTitle>
        {complaints.slice(0, 4).map(renderComplaintCard)}
        <View style={styles.demoNotice}><Text style={styles.demoNoticeText}>데모 모드: 로그인·알림·서버 저장은 연결되어 있지 않아요.</Text></View>
      </ScrollView>
    );
  }

  function renderDetailModal() {
    if (!selectedComplaint) return null;
    const itemCategory = getCategory(selectedComplaint.category);
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedComplaint(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedComplaint(null)}>
          <Pressable style={styles.detailSheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <View style={styles.detailCategoryRow}>
              <View style={[styles.categoryIcon, { backgroundColor: `${itemCategory.color}18` }]}><Text style={styles.categoryEmoji}>{itemCategory.emoji}</Text></View>
              <View style={styles.complaintBody}><View style={styles.cardMetaRow}><Text style={[styles.categoryLabel, { color: itemCategory.color }]}>{itemCategory.label}</Text>{selectedComplaint.isSample ? <Text style={styles.sampleTag}>데모</Text> : null}</View><Text style={styles.timeLabel}>{selectedComplaint.createdAt}</Text></View>
              <Text style={[styles.statusText, selectedComplaint.status === '해결 완료' && styles.statusDone]}>{selectedComplaint.status}</Text>
            </View>
            <Text style={styles.detailTitle}>{selectedComplaint.title}</Text>
            <Text style={styles.addressText}>⌖  {selectedComplaint.address}</Text>
            {selectedComplaint.description ? <Text style={styles.detailDescription}>{selectedComplaint.description}</Text> : null}
            {selectedComplaint.festival ? <Text style={styles.festivalTag}>🎪 {selectedComplaint.festival}</Text> : null}
            <View style={styles.detailDivider} />
            <Text style={styles.detailInfo}>담당 부서  ·  {itemCategory.agency}</Text>
            <Text style={styles.detailInfo}>예상 처리  ·  {itemCategory.estimate}</Text>
            <ActionButton label="확인" onPress={() => setSelectedComplaint(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  function renderComposer() {
    const selectedCategory = getCategory(category);
    const aiOutcome = `‘${selectedCategory.label}’ 유형으로 분류되어 ${selectedCategory.agency}에 전달될 예정이에요. 예상 처리 기간은 ${selectedCategory.estimate}입니다.`;
    return (
      <Modal visible={composerOpen} animationType="slide" onRequestClose={() => setComposerOpen(false)}>
        <KeyboardAvoidingView style={styles.composerRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.composerHeader}>
            <Pressable onPress={() => (step > 1 ? setStep(step - 1) : setComposerOpen(false))}><Text style={styles.closeButton}>{step > 1 ? '‹' : '×'}</Text></Pressable>
            <Text style={styles.composerTitle}>불편사항 등록</Text>
            <Text style={styles.stepCounter}>{step}/3</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} /></View>
          <ScrollView style={styles.composerScroll} contentContainerStyle={styles.composerContent} keyboardShouldPersistTaps="handled">
            {step === 1 ? (
              <>
                <Text style={styles.stepHeading}>현장 사진을 추가해 주세요</Text>
                <Text style={styles.stepDescription}>사진은 문제 상황 확인과 빠른 처리에 도움이 돼요.</Text>
                <View style={styles.photoActions}>
                  <Pressable style={styles.photoAction} onPress={() => void addPhoto('camera')}><Text style={styles.photoActionIcon}>📷</Text><Text style={styles.photoActionLabel}>사진 촬영</Text></Pressable>
                  <Pressable style={styles.photoAction} onPress={() => void addPhoto('library')}><Text style={styles.photoActionIcon}>▧</Text><Text style={styles.photoActionLabel}>앨범에서 선택</Text></Pressable>
                </View>
                {photoUri ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    <Pressable style={styles.removePhoto} onPress={() => setPhotoUri(null)}><Text style={styles.removePhotoText}>×</Text></Pressable>
                    <View style={styles.aiPendingBadge}><Text style={styles.aiPendingText}>✦ AI 얼굴 블러 확인 필요</Text></View>
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}><Text style={styles.photoPlaceholderIcon}>＋</Text><Text style={styles.photoPlaceholderText}>사진을 추가해 주세요</Text></View>
                )}
                <View style={styles.privacyBox}>
                  <Text style={styles.privacyTitle}>🔒 사진 개인정보 보호</Text>
                  <Text style={styles.privacyBody}>이 데모에는 얼굴을 자동으로 감지·블러하는 AI 모델이 연결되어 있지 않아요. 원본 사진은 서버로 전송되지 않으며, 실제 서비스에서는 얼굴 블러가 적용된 사진만 등록해야 해요.</Text>
                  <Pressable style={styles.confirmRow} onPress={() => setFaceBlurAcknowledged((value) => !value)}>
                    <View style={[styles.checkbox, faceBlurAcknowledged && styles.checkboxChecked]}>{faceBlurAcknowledged ? <Text style={styles.checkmark}>✓</Text> : null}</View>
                    <Text style={styles.confirmText}>식별 가능한 얼굴이 없거나 직접 블러 처리했어요</Text>
                  </Pressable>
                </View>
                <View style={styles.privacyBox}>
                  <Text style={styles.privacyTitle}>🐾 동물 사체 사진 안내</Text>
                  <Text style={styles.privacyBody}>동물 사체는 자동 블러 대상이 아니에요. 앱에서 직접 편집할 수 없으니, 사진 편집 앱에서 직접 가림 처리한 뒤 선택해 주세요.</Text>
                  <Pressable style={styles.confirmRow} onPress={() => { setHasAnimalCarcass((value) => !value); setAnimalBlurConfirmed(false); }}>
                    <View style={[styles.checkbox, hasAnimalCarcass && styles.checkboxChecked]}>{hasAnimalCarcass ? <Text style={styles.checkmark}>✓</Text> : null}</View>
                    <Text style={styles.confirmText}>사진에 동물 사체가 있어요</Text>
                  </Pressable>
                  {hasAnimalCarcass ? (
                    <Pressable style={styles.confirmRow} onPress={() => setAnimalBlurConfirmed((value) => !value)}>
                      <View style={[styles.checkbox, animalBlurConfirmed && styles.checkboxChecked]}>{animalBlurConfirmed ? <Text style={styles.checkmark}>✓</Text> : null}</View>
                      <Text style={styles.confirmText}>사진을 직접 편집해 가림 처리했어요</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : null}
            {step === 2 ? (
              <>
                <Text style={styles.stepHeading}>어떤 문제가 있나요?</Text>
                <Text style={styles.stepDescription}>카테고리를 직접 선택하면 담당 부서 안내가 더 정확해져요.</Text>
                <Text style={styles.inputLabel}>카테고리</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((item) => (
                    <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.categoryOption, category === item.id && styles.categoryOptionSelected, category === item.id && { borderColor: item.color }]}>
                      <Text style={styles.categoryOptionEmoji}>{item.emoji}</Text><Text style={[styles.categoryOptionLabel, category === item.id && { color: item.color }]}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
                {category === 'festival' ? (
                  <>
                    <Text style={styles.inputLabel}>관련 축제</Text>
                    <View style={styles.festivalSelectBox}>
                      {FESTIVALS.filter((item) => item.active).map((festival) => (
                        <Pressable key={festival.name} style={styles.festivalSelectRow} onPress={() => setSelectedFestival(festival.name)}>
                          <View style={[styles.radio, selectedFestival === festival.name && styles.radioSelected]} />
                          <Text style={styles.festivalSelectText}>{festival.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}
                <Text style={styles.inputLabel}>제목</Text>
                <TextInput style={styles.textInput} placeholder="예: 보도블록이 파손되어 걸을 때 위험해요" value={title} onChangeText={setTitle} maxLength={50} />
                <Text style={styles.inputLabel}>상세 내용</Text>
                <TextInput style={[styles.textInput, styles.multilineInput]} placeholder="문제가 있는 위치와 상황을 자세히 알려주세요." value={description} onChangeText={setDescription} multiline maxLength={300} textAlignVertical="top" />
                <Text style={styles.characterCount}>{description.length}/300</Text>
                <Text style={styles.inputLabel}>위치</Text>
                <View style={styles.addressRow}>
                  <TextInput style={[styles.textInput, styles.addressInput]} placeholder="주소를 입력해 주세요" value={address} onChangeText={setAddress} />
                  <Pressable style={styles.gpsButton} onPress={() => void updateReportLocation()}><Text style={styles.gpsButtonText}>⌖ GPS</Text></Pressable>
                </View>
              </>
            ) : null}
            {step === 3 ? (
              <>
                <View style={styles.successIcon}><Text style={styles.successCheck}>✓</Text></View>
                <Text style={[styles.stepHeading, styles.centerText]}>AI 처리 미리보기</Text>
                <Text style={[styles.stepDescription, styles.centerText]}>등록 전에 담당 부서와 예상 처리를 확인해요.</Text>
                {photoUri ? <Image source={{ uri: photoUri }} style={styles.reviewPhoto} /> : null}
                <View style={styles.aiResultCard}>
                  <View style={styles.aiResultHeading}><Text style={styles.aiSparkle}>✦</Text><Text style={styles.aiResultTitle}>예상 처리 결과</Text><Text style={styles.demoTag}>데모</Text></View>
                  <Text style={styles.aiResultCopy}>{aiOutcome}</Text>
                  <View style={styles.aiResultTags}><Text style={[styles.resultTag, { color: selectedCategory.color, backgroundColor: `${selectedCategory.color}15` }]}>{selectedCategory.emoji} {selectedCategory.label}</Text><Text style={styles.resultTagNeutral}>담당 부서 안내</Text></View>
                  <Text style={styles.aiDisclaimer}>AI 연동 전 데모 예시입니다. 실제 분류·처리 기간과 다를 수 있어요.</Text>
                </View>
                <View style={styles.reviewSummary}>
                  <Text style={styles.summaryLabel}>제목</Text><Text style={styles.summaryValue}>{title}</Text>
                  <Text style={styles.summaryLabel}>위치</Text><Text style={styles.summaryValue}>{address || '위치 정보 없음'}</Text>
                  {category === 'festival' ? <><Text style={styles.summaryLabel}>축제</Text><Text style={styles.summaryValue}>{selectedFestival}</Text></> : null}
                </View>
                <View style={styles.localOnlyNotice}><Text style={styles.localOnlyText}>이 데모에서는 등록 정보가 기기에만 저장됩니다. 민원 기관으로 전송되지 않아요.</Text></View>
              </>
            ) : null}
          </ScrollView>
          <View style={styles.composerFooter}>
            <ActionButton label={step < 3 ? '다음' : '민원 등록하기'} onPress={step < 3 ? advanceStep : submitComplaint} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <View style={styles.appRoot}>
      <StatusBar style="dark" />
      <View style={styles.mainContent}>
        {activeScreen === 'map' ? renderMapScreen() : null}
        {activeScreen === 'list' ? renderListScreen() : null}
        {activeScreen === 'festival' ? renderFestivalScreen() : null}
        {activeScreen === 'mypage' ? renderMyPage() : null}
      </View>
      <View style={styles.tabBar}>
        {([
          ['map', '⌖', '지도'],
          ['list', '▤', '목록'],
          ['festival', '🎪', '축제'],
          ['mypage', '♙', '마이'],
        ] as const).map(([screen, icon, label]) => (
          <Pressable
            key={screen}
            style={styles.tabItem}
            onPress={() => navigateToScreen(screen)}
          >
            <Text style={[styles.tabIcon, activeScreen === screen && styles.tabIconActive]}>{icon}</Text>
            <Text style={[styles.tabLabel, activeScreen === screen && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {renderDetailModal()}
      {renderComposer()}
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1, backgroundColor: '#F7F9FC' },
  mainContent: { flex: 1, paddingTop: Platform.OS === 'android' ? 34 : 52 },
  tabBar: { height: 67, paddingBottom: Platform.OS === 'ios' ? 10 : 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#EEF1F5' },
  tabItem: { flex: 1, height: 58, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { color: '#9BA6B5', fontSize: 20, lineHeight: 25 },
  tabIconActive: { color: '#0878F9' },
  tabLabel: { color: '#96A1B0', fontSize: 10, marginTop: 1 },
  tabLabelActive: { color: '#0878F9', fontWeight: '700' },
  mapHeader: { height: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' },
  brandTitle: { color: '#18253A', fontSize: 22, fontWeight: '800', letterSpacing: -0.8 },
  brandAccent: { color: '#0878F9' },
  brandSubtitle: { marginTop: 2, color: '#78869A', fontSize: 11 },
  avatarButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDF4FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20 },
  locationPill: { height: 42, marginHorizontal: 16, marginTop: 10, marginBottom: 8, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EDF4' },
  locationPin: { color: '#0878F9', fontSize: 19, fontWeight: '700', marginRight: 6 },
  locationText: { flex: 1, fontSize: 12, color: '#526176' },
  refreshText: { paddingHorizontal: 6, color: '#0878F9', fontSize: 22 },
  mapContainer: { flex: 1, minHeight: 250, overflow: 'hidden', backgroundColor: '#E9F3EC' },
  mapLegend: { position: 'absolute', top: 13, left: 13, paddingHorizontal: 11, height: 32, borderRadius: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', elevation: 2 },
  legendDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6, backgroundColor: '#0878F9' },
  legendText: { fontSize: 11, color: '#445167', fontWeight: '600' },
  locateButton: { position: 'absolute', right: 14, bottom: 76, width: 42, height: 42, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  locateButtonText: { color: '#0878F9', fontSize: 23, fontWeight: '700' },
  mapReportButton: { position: 'absolute', alignSelf: 'center', bottom: 16, height: 48, paddingHorizontal: 24, borderRadius: 24, backgroundColor: '#0878F9', justifyContent: 'center', elevation: 4 },
  mapReportText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  nearbyHeader: { minHeight: 48, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#202D42', letterSpacing: -0.3 },
  sectionDetail: { fontSize: 12, color: '#8491A4' },
  moreLink: { color: '#0878F9', fontSize: 12, fontWeight: '600' },
  nearbyList: { maxHeight: 185, backgroundColor: '#FFFFFF' },
  nearbyContent: { paddingHorizontal: 14, paddingBottom: 12 },
  complaintCard: { minHeight: 82, paddingVertical: 12, paddingHorizontal: 13, marginBottom: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDF0F5' },
  categoryIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  categoryEmoji: { fontSize: 19 },
  complaintBody: { flex: 1, minWidth: 0 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  categoryLabel: { fontSize: 11, fontWeight: '700', marginRight: 7 },
  sampleTag: { color: '#71809A', fontSize: 9, marginRight: 7, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, overflow: 'hidden', backgroundColor: '#EDF1F6' },
  timeLabel: { color: '#9AA5B4', fontSize: 10 },
  complaintTitle: { color: '#28364B', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  addressText: { color: '#8793A4', fontSize: 10, marginTop: 4 },
  statusText: { alignSelf: 'flex-start', marginLeft: 8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, overflow: 'hidden', color: '#3478DB', fontSize: 10, backgroundColor: '#EAF3FF' },
  statusDone: { color: '#17936E', backgroundColor: '#E7F7F1' },
  festivalTag: { color: '#CA4B7B', fontSize: 10, marginTop: 5 },
  pageScroll: { flex: 1 },
  pageContent: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28 },
  pageDescription: { color: '#7C899C', fontSize: 12, marginTop: -5, marginBottom: 15 },
  chipRow: { paddingBottom: 15 },
  filterChip: { paddingHorizontal: 14, height: 34, marginRight: 7, borderRadius: 17, justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EDF3' },
  filterChipActive: { borderColor: '#0878F9', backgroundColor: '#0878F9' },
  filterChipText: { color: '#69778B', fontSize: 12 },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  emptyText: { paddingVertical: 30, textAlign: 'center', color: '#8995A6', fontSize: 13 },
  festivalHero: { padding: 20, marginBottom: 24, borderRadius: 22, backgroundColor: '#FFF0F4' },
  festivalEyebrow: { color: '#D05C83', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  festivalHeading: { color: '#392638', fontSize: 25, lineHeight: 33, fontWeight: '800', marginTop: 8 },
  festivalDescription: { color: '#7D6879', fontSize: 12, marginTop: 8 },
  festivalCard: { padding: 13, marginBottom: 9, borderRadius: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDF0F5' },
  festivalCardSelected: { borderColor: '#EC6D9A', backgroundColor: '#FFF9FB' },
  festivalCalendar: { width: 43, height: 43, borderRadius: 13, marginRight: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F4' },
  festivalCalendarEmoji: { fontSize: 19 },
  festivalCardBody: { flex: 1 },
  festivalName: { color: '#29364A', fontSize: 13, fontWeight: '700' },
  festivalInfo: { color: '#8490A0', fontSize: 10, marginTop: 4 },
  activeBadge: { color: '#D4547D', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, overflow: 'hidden', fontSize: 10, backgroundColor: '#FFE8EF' },
  endedBadge: { color: '#8A95A4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, overflow: 'hidden', fontSize: 10, backgroundColor: '#F0F2F5' },
  actionButton: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0878F9' },
  actionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { backgroundColor: '#EFF5FF', borderWidth: 1, borderColor: '#DAE8FF' },
  secondaryButtonText: { color: '#0878F9' },
  disabledButton: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  sectionGap: { height: 22 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 18, marginBottom: 24, borderRadius: 18, backgroundColor: '#FFFFFF' },
  profileEmoji: { fontSize: 40, marginRight: 13 },
  profileName: { color: '#26354A', fontSize: 17, fontWeight: '800' },
  profileCaption: { color: '#8995A6', fontSize: 11, marginTop: 4 },
  statRow: { flexDirection: 'row', marginBottom: 25 },
  statCard: { flex: 1, paddingVertical: 15, marginRight: 8, borderRadius: 14, alignItems: 'center', backgroundColor: '#FFFFFF' },
  statNumber: { color: '#0878F9', fontSize: 21, fontWeight: '800' },
  statLabel: { color: '#8491A4', fontSize: 10, marginTop: 5 },
  demoNotice: { padding: 13, borderRadius: 12, backgroundColor: '#EEF2F7', marginTop: 6 },
  demoNoticeText: { color: '#68778A', fontSize: 11, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#16223866' },
  detailSheet: { padding: 20, paddingBottom: 30, borderTopLeftRadius: 23, borderTopRightRadius: 23, backgroundColor: '#FFFFFF' },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, marginBottom: 18, borderRadius: 2, backgroundColor: '#D9DFE8' },
  detailCategoryRow: { flexDirection: 'row', alignItems: 'center' },
  detailTitle: { color: '#27354A', fontSize: 19, fontWeight: '800', lineHeight: 27, marginTop: 17, marginBottom: 6 },
  detailDescription: { color: '#536278', fontSize: 13, lineHeight: 20, marginTop: 12 },
  detailDivider: { height: 1, backgroundColor: '#EEF0F4', marginVertical: 16 },
  detailInfo: { color: '#526176', fontSize: 12, marginBottom: 10 },
  composerRoot: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? 28 : 48 },
  composerHeader: { height: 52, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { color: '#26364B', fontSize: 29, width: 35 },
  composerTitle: { color: '#26354A', fontSize: 16, fontWeight: '800' },
  stepCounter: { color: '#7F8DA1', fontSize: 13, width: 35, textAlign: 'right' },
  progressTrack: { height: 3, backgroundColor: '#EEF1F5' },
  progressFill: { height: 3, backgroundColor: '#0878F9' },
  composerScroll: { flex: 1 },
  composerContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20 },
  stepHeading: { color: '#202F43', fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  stepDescription: { color: '#7E8B9D', fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 20 },
  photoActions: { flexDirection: 'row', marginBottom: 13 },
  photoAction: { flex: 1, height: 76, marginRight: 9, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F7FD', borderWidth: 1, borderColor: '#E5EDF8' },
  photoActionIcon: { fontSize: 22, color: '#0878F9' },
  photoActionLabel: { color: '#4D5D73', fontSize: 11, fontWeight: '600', marginTop: 5 },
  photoPlaceholder: { height: 175, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F9FC', borderWidth: 1, borderStyle: 'dashed', borderColor: '#CAD5E4' },
  photoPlaceholderIcon: { color: '#9BA9BA', fontSize: 35 },
  photoPlaceholderText: { color: '#8A97A8', fontSize: 12, marginTop: 4 },
  photoPreviewWrap: { height: 190, borderRadius: 15, overflow: 'hidden', backgroundColor: '#EEF1F5' },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removePhoto: { position: 'absolute', top: 9, right: 9, width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#192434AA' },
  removePhotoText: { color: '#FFFFFF', fontSize: 21, lineHeight: 24 },
  aiPendingBadge: { position: 'absolute', bottom: 10, left: 10, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: '#15243BCC' },
  aiPendingText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  privacyBox: { marginTop: 13, padding: 13, borderRadius: 14, backgroundColor: '#F6F8FB' },
  privacyTitle: { color: '#43536A', fontSize: 12, fontWeight: '700' },
  privacyBody: { color: '#78869A', fontSize: 10, lineHeight: 16, marginTop: 6 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  checkbox: { width: 19, height: 19, marginRight: 8, borderWidth: 1, borderColor: '#BDC8D6', borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  checkboxChecked: { backgroundColor: '#0878F9', borderColor: '#0878F9' },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  confirmText: { flex: 1, color: '#4E5D72', fontSize: 10 },
  inputLabel: { color: '#3C4C61', fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginRight: -7 },
  categoryOption: { width: '31%', minHeight: 69, marginRight: '2.3%', marginBottom: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EDF3' },
  categoryOptionSelected: { backgroundColor: '#F8FBFF', borderWidth: 1.5 },
  categoryOptionEmoji: { fontSize: 19 },
  categoryOptionLabel: { color: '#69778B', fontSize: 10, marginTop: 4 },
  textInput: { height: 46, paddingHorizontal: 12, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E9F0', color: '#29374B', fontSize: 12 },
  multilineInput: { height: 92, paddingTop: 12 },
  characterCount: { alignSelf: 'flex-end', color: '#A0AAB8', fontSize: 10, marginTop: 5 },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  addressInput: { flex: 1 },
  gpsButton: { height: 43, paddingHorizontal: 12, marginLeft: 7, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3FF' },
  gpsButtonText: { color: '#0878F9', fontSize: 11, fontWeight: '700' },
  festivalSelectBox: { borderWidth: 1, borderColor: '#E7ECF2', borderRadius: 12, paddingHorizontal: 11 },
  festivalSelectRow: { height: 42, flexDirection: 'row', alignItems: 'center' },
  radio: { width: 17, height: 17, marginRight: 8, borderRadius: 9, borderWidth: 1, borderColor: '#BCC7D4' },
  radioSelected: { borderWidth: 5, borderColor: '#EC6D9A' },
  festivalSelectText: { color: '#536277', fontSize: 11 },
  successIcon: { width: 52, height: 52, alignSelf: 'center', marginTop: 5, marginBottom: 12, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7F2FF' },
  successCheck: { color: '#0878F9', fontSize: 28, fontWeight: '700' },
  centerText: { textAlign: 'center' },
  reviewPhoto: { width: '100%', height: 165, borderRadius: 14, marginBottom: 13 },
  aiResultCard: { padding: 15, borderRadius: 16, backgroundColor: '#F3F8FF', borderWidth: 1, borderColor: '#E1EDFF' },
  aiResultHeading: { flexDirection: 'row', alignItems: 'center' },
  aiSparkle: { color: '#0878F9', fontSize: 18, marginRight: 6 },
  aiResultTitle: { color: '#2C3D56', fontSize: 13, fontWeight: '800', flex: 1 },
  demoTag: { color: '#5E77A0', fontSize: 9, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: '#E3EDFB' },
  aiResultCopy: { color: '#596A81', fontSize: 12, lineHeight: 19, marginTop: 9 },
  aiResultTags: { flexDirection: 'row', marginTop: 11 },
  resultTag: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, overflow: 'hidden', fontSize: 10, fontWeight: '700', marginRight: 6 },
  resultTagNeutral: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, overflow: 'hidden', color: '#60718A', fontSize: 10, backgroundColor: '#E8EDF4' },
  aiDisclaimer: { color: '#8794A7', fontSize: 9, marginTop: 11 },
  reviewSummary: { padding: 14, marginTop: 12, borderRadius: 14, backgroundColor: '#F8F9FB' },
  summaryLabel: { color: '#8A96A6', fontSize: 10, marginBottom: 3 },
  summaryValue: { color: '#35445A', fontSize: 12, marginBottom: 11 },
  localOnlyNotice: { padding: 12, marginTop: 10, borderRadius: 11, backgroundColor: '#FFF8E8' },
  localOnlyText: { color: '#867348', fontSize: 10, lineHeight: 15 },
  composerFooter: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 15, borderTopWidth: 1, borderColor: '#EFF1F5', backgroundColor: '#FFFFFF' },
});
