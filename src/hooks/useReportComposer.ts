
import { validateReport } from '../domain/validation';
import * as Crypto from 'expo-crypto';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { CategoryId, Complaint } from '../domain/types';
import type {
  MapCoordinate,
  MapRegion,
} from '../components/ComplaintMap.types';
import { FESTIVALS } from '../domain/catalog';
import { getAreaFromAddress } from '../domain/complaints';
import type { LocatedPlace } from '../lib/currentLocation';
import { uploadImage } from '../api/images';
import {
  previewComplaint,
  type ComplaintPreview,
} from '../api/complaints';

type Options = {
  region: MapRegion;
  userCoordinate: MapCoordinate | null;
  currentAddress: string;
  locateUser: () => Promise<LocatedPlace | null>;
  onSubmit: (complaint: Complaint) => void;
};

export function useReportComposer({
  region,
  userCoordinate,
  currentAddress,
  locateUser,
  onSubmit,
}: Options) {
  const submitted = useRef(false);
  const draftVersion = useRef(0);

  // 중복 API 요청 방지
  const previewInProgress = useRef(false);

  const [selectedFestival, setSelectedFestival] = useState(
    FESTIVALS[0].name,
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId>('road');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');

  const [reportCoordinate, setReportCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [animalBlurConfirmed, setAnimalBlurConfirmed] = useState(false);
  const [hasAnimalCarcass, setHasAnimalCarcass] = useState(false);
  const [faceBlurAcknowledged, setFaceBlurAcknowledged] =
    useState(false);

  // API #9 AI 미리보기 결과
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewResult, setPreviewResult] =
    useState<ComplaintPreview | null>(null);

  const contentCheck = previewResult?.contentCheck ?? null;
  const blurredPhotoUri =
    previewResult?.image.blurredImageUrl ?? null;
  const faceCount = previewResult?.image.faceCount ?? null;
  const previewAgency = previewResult?.agency ?? null;
  const previewEstimatedPeriod =
    previewResult?.estimatedPeriod ?? null;

  // 기존 미리보기 결과 초기화
  function clearPreview() {
    draftVersion.current += 1;
    setPreviewResult(null);
    setPreviewError('');
    setPreviewLoading(false);
  }

  function openComposer(forFestival = false) {
    submitted.current = false;
    clearPreview();

    setComposerOpen(true);
    setStep(1);
    setPhotoUri(null);
    setTitle('');
    setDescription('');
    setCategory(forFestival ? 'festival' : 'road');

    setReportCoordinate(
      userCoordinate ?? {
        latitude: region.latitude,
        longitude: region.longitude,
      },
    );

    setAnimalBlurConfirmed(false);
    setHasAnimalCarcass(false);
    setFaceBlurAcknowledged(false);

    if (!forFestival) {
      setSelectedFestival(
        FESTIVALS.find((item) => item.active)?.name ??
          FESTIVALS[0].name,
      );
    }

    setAddress(currentAddress);
  }

  async function addPhoto(source: 'camera' | 'library') {
    const version = draftVersion.current;

    try {
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.8,
            });

      if (
        version === draftVersion.current &&
        !result.canceled &&
        result.assets[0]?.uri
      ) {
        clearPreview();

        setPhotoUri(result.assets[0].uri);
        setAnimalBlurConfirmed(false);
        setHasAnimalCarcass(false);
        setFaceBlurAcknowledged(false);
      }
    } catch {
      Alert.alert(
        '사진을 불러오지 못했어요',
        '카메라 또는 사진 접근 권한을 확인하고 다시 시도해 주세요.',
      );
    }
  }

  function validate(stepToCheck: number) {
    const issue = validateReport(
      {
        photoUri,
        title,
        description,
        faceBlurAcknowledged,
        hasAnimalCarcass,
        animalBlurConfirmed,
      },
      stepToCheck,
    );

    if (issue) Alert.alert(issue.title, issue.message);
    return !issue;
  }

  // API #14 사진 업로드 → API #9 AI 미리보기
  async function requestAiPreview() {
    if (previewInProgress.current) return;
    if (!validate(3)) return;

    if (!photoUri) {
      Alert.alert('사진이 필요해요', '사진을 먼저 추가해 주세요.');
      return;
    }

    // 서버 축제 ID가 아직 연결되지 않았으므로 잘못된 요청 방지
    if (category === 'festival') {
      Alert.alert(
        '축제 정보 연결이 필요해요',
        '축제 민원 AI 미리보기는 서버 축제 목록 연결 후 사용할 수 있어요.',
      );
      return;
    }

    previewInProgress.current = true;
    const version = draftVersion.current;

    setPreviewLoading(true);
    setPreviewError('');
    setPreviewResult(null);

    try {
      const coordinate = reportCoordinate ?? {
        latitude: region.latitude,
        longitude: region.longitude,
      };

      // 1. API #14: 사진을 서버에 업로드
      const uploadedImage = await uploadImage(photoUri);

      if (version !== draftVersion.current) return;

      // 2. API #9: 업로드된 imageId로 AI 분석 요청
      const result = await previewComplaint({
        imageId: uploadedImage.imageId,
        category,
        title,
        description,
        address,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        festivalId: null,
      });

      if (version !== draftVersion.current) return;

      setPreviewResult(result);

      // 내용 검사를 통과하지 못하면 3단계에서 수정하도록 유지
      if (!result.contentCheck.passed) {
        Alert.alert(
          '민원 내용을 확인해 주세요',
          result.contentCheck.feedback,
        );
        return;
      }

      // 검사 통과 시 AI 미리보기 화면으로 이동
      setStep(4);
    } catch (error) {
      if (version !== draftVersion.current) return;

      const message =
        error instanceof Error
          ? error.message
          : 'AI 미리보기를 불러오지 못했어요.';

      setPreviewError(message);
      Alert.alert('AI 미리보기 실패', message);
    } finally {
      previewInProgress.current = false;

      if (version === draftVersion.current) {
        setPreviewLoading(false);
      }
    }
  }

  function advanceStep() {
    if (previewInProgress.current) return;

    // 3단계에서 API #9 실행
    if (step === 3) {
      void requestAiPreview();
      return;
    }

    if (validate(step)) {
      setStep((current) => Math.min(4, current + 1));
    }
  }

  function submitComplaint() {
    if (submitted.current || !validate(4)) return;

    // API #9 내용 검사 통과 여부 확인
    if (!previewResult?.contentCheck.passed) {
      Alert.alert(
        'AI 점검이 필요해요',
        'AI 미리보기를 완료한 후 등록해 주세요.',
      );
      return;
    }

    submitted.current = true;

    const coordinate = reportCoordinate ?? {
      latitude: region.latitude,
      longitude: region.longitude,
    };

    // 현재 등록은 기존 로컬 데모 방식 유지
    // 실제 서버 등록은 API #11 연결 시 변경
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
      ...(category === 'festival'
        ? { festival: selectedFestival }
        : {}),
    };

    onSubmit(newComplaint);
    setComposerOpen(false);

    Alert.alert(
      '민원 작성 완료',
      'AI 미리보기는 서버에서 처리했지만, 민원 등록은 아직 데모 방식이에요. 실제 서버 등록은 API #11 연결 후 가능합니다.',
    );
  }

  async function updateReportLocation() {
    const version = draftVersion.current;
    const place = await locateUser();

    if (version !== draftVersion.current) return;

    if (place) {
      clearPreview();
      setReportCoordinate(place.coordinate);
      setAddress(place.address);
    } else {
      Alert.alert(
        '위치를 가져오지 못했어요',
        '위치 권한을 확인하거나 주소를 직접 입력해 주세요.',
      );
    }
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

    // API #9 결과를 ReportComposer.tsx에 전달
    previewLoading,
    previewError,
    previewResult,
    contentCheck,
    blurredPhotoUri,
    faceCount,
    previewAgency,
    previewEstimatedPeriod,
  };
}
