import { validateReport } from '../domain/validation';
import * as Crypto from 'expo-crypto';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { CategoryId, Complaint } from '../domain/types';
import type { MapCoordinate, MapRegion } from '../components/ComplaintMap.types';
import { FESTIVALS } from '../domain/catalog';
import { getAreaFromAddress } from '../domain/complaints';
import type { LocatedPlace } from '../lib/currentLocation';

type Options = {
  region: MapRegion;
  userCoordinate: MapCoordinate | null;
  currentAddress: string;
  locateUser: () => Promise<LocatedPlace | null>;
  onSubmit: (complaint: Complaint) => void;
};
export function useReportComposer({ region, userCoordinate, currentAddress, locateUser, onSubmit }: Options) {
  const submitted = useRef(false);
  const draftVersion = useRef(0);
  const [selectedFestival, setSelectedFestival] = useState(FESTIVALS[0].name);
  const [composerOpen, setComposerOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId>('road');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [reportCoordinate, setReportCoordinate] = useState<{ latitude: number; longitude: number; } | null>(null);
  const [animalBlurConfirmed, setAnimalBlurConfirmed] = useState(false);
  const [hasAnimalCarcass, setHasAnimalCarcass] = useState(false);
  const [faceBlurAcknowledged, setFaceBlurAcknowledged] = useState(false);
  function openComposer(forFestival = false) {
    submitted.current = false;
    draftVersion.current += 1;

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
    if (!forFestival) setSelectedFestival(FESTIVALS.find((item) => item.active)?.name ?? FESTIVALS[0].name);
    setAddress(currentAddress);
  }

  async function addPhoto(source: 'camera' | 'library') {
    const version = draftVersion.current;
    try {
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (version === draftVersion.current && !result.canceled && result.assets[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
        setAnimalBlurConfirmed(false);
        setHasAnimalCarcass(false);
        setFaceBlurAcknowledged(false);
      }
    } catch {
      Alert.alert('사진을 불러오지 못했어요', '카메라 또는 사진 접근 권한을 확인하고 다시 시도해 주세요.');
    }
  }

  function validate(stepToCheck: number) {
    const issue = validateReport({ photoUri, title, description, faceBlurAcknowledged, hasAnimalCarcass, animalBlurConfirmed }, stepToCheck);
    if (issue) Alert.alert(issue.title, issue.message);
    return !issue;
  }
  function advanceStep() {
    if (validate(step)) setStep((current) => Math.min(4, current + 1));
  }
  function submitComplaint() {
    if (submitted.current || !validate(4)) return;
    submitted.current = true;
    const coordinate = reportCoordinate ?? { latitude: region.latitude, longitude: region.longitude };
    const newComplaint: Complaint = {
      id: Crypto.randomUUID(),
      title: title.trim(),
      address: address.trim() || '위치 정보 없음',
      area: getAreaFromAddress(address),
      category,
      status: '접수',
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      createdAt: '방금 전',
      description: description.trim(),
      likeCount: 0,
      ...(category === 'festival' ? { festival: selectedFestival } : {}),
    };
    onSubmit(newComplaint);
    setComposerOpen(false);



    Alert.alert('민원이 등록되었어요', '데모에서는 앱 실행 중에만 유지됩니다. 지도와 목록에서 확인할 수 있어요.');
  }
  async function updateReportLocation() {
    const version = draftVersion.current;
    const place = await locateUser();
    if (version !== draftVersion.current) return;
    if (place) { setReportCoordinate(place.coordinate); setAddress(place.address); }
    else Alert.alert('위치를 가져오지 못했어요', '위치 권한을 확인하거나 주소를 직접 입력해 주세요.');
  }
  return {
    selectedFestival,
    composerOpen,
    step,
    photoUri,
    category,
    title,
    description,
    address,
    reportCoordinate,
    animalBlurConfirmed,
    hasAnimalCarcass,
    faceBlurAcknowledged,
    setSelectedFestival,
    setComposerOpen,
    setStep,
    setPhotoUri,
    setCategory,
    setTitle,
    setDescription,
    setAddress,
    setAnimalBlurConfirmed,
    setHasAnimalCarcass,
    setFaceBlurAcknowledged,
    openComposer,
    addPhoto,
    advanceStep,
    submitComplaint,
    updateReportLocation,
  };
}

