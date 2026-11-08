
import { validateReport } from '../domain/validation';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { CategoryId, Complaint } from '../domain/types';
import type {
  MapCoordinate,
  MapRegion,
} from '../components/ComplaintMap.types';
import type { ServerFestival } from '../api/festivals';
import type { LocatedPlace } from '../lib/currentLocation';
import { uploadImage } from '../api/images';
import {
  createComplaint,
  createResultImage,
  previewComplaint,
  type ComplaintPreview,
} from '../api/complaints';

type Options = {
  region: MapRegion;
  userCoordinate: MapCoordinate | null;
  currentAddress: string;
  locateUser: () => Promise<LocatedPlace | null>;
  onSubmit: (complaint: Complaint) => void;
  festivals: ServerFestival[];
};

type ResultImage = {
  id: number;
  url: string;
  description: string;
};

export function useReportComposer({
  region,
  userCoordinate,
  currentAddress,
  locateUser,
  onSubmit,
  festivals,
}: Options) {
  const submitted = useRef(false);
  const submitInProgress = useRef(false);
  const draftVersion = useRef(0);
  const previewInProgress = useRef(false);
  const resultImageInProgress = useRef(false);

  const [selectedFestival, setSelectedFestival] = useState('');

  // 서버에 실제 존재하는 활성 축제로 선택을 동기화
  useEffect(() => {
    const current = festivals.find((item) => item.name === selectedFestival && item.active);
    if (!current) {
      setSelectedFestival(festivals.find((item) => item.active)?.name ?? '');
    }
  }, [festivals, selectedFestival]);

  const selectedFestivalId =
    festivals.find((item) => item.name === selectedFestival && item.active)?.id ?? null;
  const [composerOpen, setComposerOpenState] = useState(false);
  const [step, setStepState] = useState(1);
  const [photoUri, setPhotoUriState] = useState<string | null>(null);
  const [category, setCategoryState] = useState<CategoryId>('road');
  const [title, setTitleState] = useState('');
  const [description, setDescriptionState] = useState('');
  const [address, setAddressState] = useState('');
  // 위치는 사진 촬영 장소와 다를 수 있으므로 사용자 확인을 필수로 한다.
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const [reportCoordinate, setReportCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [animalBlurConfirmed, setAnimalBlurConfirmed] = useState(false);
  const [hasAnimalCarcass, setHasAnimalCarcass] = useState(false);
  const [faceBlurAcknowledged, setFaceBlurAcknowledged] =
    useState(false);

  // API #9
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewResult, setPreviewResult] =
    useState<ComplaintPreview | null>(null);

  // API #10
  const [resultImage, setResultImage] =
    useState<ResultImage | null>(null);
  const [resultImageLoading, setResultImageLoading] = useState(false);
  const [resultImageFailed, setResultImageFailed] = useState(false);

  // API #11
  const [submitLoading, setSubmitLoading] = useState(false);

  const contentCheck = previewResult?.contentCheck ?? null;
  const blurredPhotoUri =
    previewResult?.image.blurredImageUrl ?? null;
  const faceCount = previewResult?.image.faceCount ?? null;
  const previewAgency = previewResult?.agency ?? null;
  const previewEstimatedPeriod =
    previewResult?.estimatedPeriod ?? null;

  function clearPreview() {
    draftVersion.current += 1;

    setPreviewResult(null);
    setPreviewError('');
    setPreviewLoading(false);

    setResultImage(null);
    setResultImageLoading(false);
    setResultImageFailed(false);
  }

  function setTitle(value: string) {
    if (submitInProgress.current) return;
    clearPreview();
    setTitleState(value);
  }

  function setDescription(value: string) {
    if (submitInProgress.current) return;
    clearPreview();
    setDescriptionState(value);
  }

  function setAddress(value: string) {
    if (submitInProgress.current) return;
    clearPreview();
    setAddressState(value);
    // 주소만 바꾸면 GPS 좌표와 달라질 수 있으므로 확정을 해제한다.
    setLocationConfirmed(false);
  }

  function setCategory(value: CategoryId) {
    if (submitInProgress.current) return;
    clearPreview();
    setCategoryState(value);
  }

  function setPhotoUri(value: string | null) {
    if (submitInProgress.current) return;
    clearPreview();
    setPhotoUriState(value);
    setLocationConfirmed(false); // 사진을 바꾸면 민원 발생 장소를 다시 확인
  }

  function setComposerOpen(value: boolean) {
    if (submitInProgress.current && !value) return;

    if (!value) {
      clearPreview();
    }

    setComposerOpenState(value);
  }

  function setStep(value: number) {
    if (submitInProgress.current) return;

    if (value < 3 && step >= 3) {
      clearPreview();
    }

    setStepState(value);
  }

  function openComposer(forFestival = false) {
    if (submitInProgress.current) return;

    submitted.current = false;
    clearPreview();

    setComposerOpenState(true);
    setStepState(1);
    setPhotoUriState(null);
    setTitleState('');
    setDescriptionState('');
    setCategoryState(forFestival ? 'festival' : 'road');

    setReportCoordinate(
      userCoordinate ?? {
        latitude: region.latitude,
        longitude: region.longitude,
      },
    );

    setAnimalBlurConfirmed(false);
    setHasAnimalCarcass(false);
    setFaceBlurAcknowledged(false);

    if (!forFestival || !festivals.some((item) => item.name === selectedFestival && item.active)) {
      setSelectedFestival(festivals.find((item) => item.active)?.name ?? '');
    }

    setAddressState(currentAddress);
    setLocationConfirmed(false); // 현재 GPS는 임시 위치일 뿐, 신고 위치가 아님
  }

  async function addPhoto(source: 'camera' | 'library') {
    if (submitInProgress.current) return;

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

    if (issue) {
      Alert.alert(issue.title, issue.message);
      return false;
    }

    if (stepToCheck >= 2 && (!locationConfirmed || !reportCoordinate || !address.trim())) {
      Alert.alert('민원 발생 위치를 확인해 주세요',
        'GPS 또는 지도에서 실제 민원 발생 위치를 지정해 주세요. 사진을 업로드한 위치와는 다를 수 있어요.');
      return false;
    }

    return true;
  }

  // API #10: 결과 이미지 생성
  async function requestResultImage(
    preview: ComplaintPreview,
    version: number,
  ) {
    if (resultImageInProgress.current) return;

    resultImageInProgress.current = true;
    setResultImage(null);
    setResultImageLoading(true);
    setResultImageFailed(false);

    try {
      const response = await createResultImage({
        blurredImageId: preview.image.blurredImageId,
        category,
        title,
        description,
      });

      if (version !== draftVersion.current) return;

      // API #11에서 사용할 이미지 ID도 보관
      setResultImage({
        id: response.resultImageId,
        url: response.resultImageUrl,
        description: response.description,
      });
    } catch (error) {
      if (version !== draftVersion.current) return;

      setResultImageFailed(true);
      console.warn('AI 결과 이미지 생성 실패:', error);
    } finally {
      resultImageInProgress.current = false;

      if (version === draftVersion.current) {
        setResultImageLoading(false);
      }
    }
  }

  // API #14 → API #9 → API #10
  async function requestAiPreview() {
    if (previewInProgress.current || submitInProgress.current) return;
    if (!validate(3)) return;

    if (!photoUri) {
      Alert.alert('사진이 필요해요', '사진을 먼저 추가해 주세요.');
      return;
    }

    if (category === 'festival' && selectedFestivalId === null) {
      Alert.alert(
        '축제를 선택해 주세요',
        '서버에서 조회한 진행 중 축제가 필요해요. 축제 목록을 확인해 주세요.',
      );
      return;
    }

    previewInProgress.current = true;
    const version = draftVersion.current;

    setPreviewLoading(true);
    setPreviewError('');
    setPreviewResult(null);
    setResultImage(null);
    setResultImageLoading(false);
    setResultImageFailed(false);

    try {
      const coordinate = reportCoordinate ?? {
        latitude: region.latitude,
        longitude: region.longitude,
      };

      // API #14: 사진 업로드
      const uploadedImage = await uploadImage(photoUri);

      if (version !== draftVersion.current) return;

      // API #9: 얼굴 블러 및 AI 미리보기 (내용 검사 필드는 선택적)
      const preview = await previewComplaint({
        imageId: uploadedImage.imageId,
        category,
        title,
        description,
        address,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        festivalId: category === 'festival' ? selectedFestivalId : null,
      });

      if (version !== draftVersion.current) return;

      setPreviewResult(preview);

      if (preview.contentCheck?.passed === false) {
        Alert.alert(
          '민원 내용을 확인해 주세요',
          preview.contentCheck.feedback,
        );
        return;
      }

      setStepState(4);

      // API #10은 별도로 실행해 4단계에서 로딩 표시
      void requestResultImage(preview, version);
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
    if (previewInProgress.current || submitInProgress.current) return;

    if (step === 3) {
      void requestAiPreview();
      return;
    }

    if (validate(step)) {
      setStepState((current) => Math.min(4, current + 1));
    }
  }

  // API #11: 실제 서버에 민원 등록
  async function submitComplaint() {
    if (submitted.current || submitInProgress.current) return;
    if (!validate(4)) return;

    if (!previewResult || previewResult.contentCheck?.passed === false) {
      Alert.alert(
        'AI 점검이 필요해요',
        'AI 미리보기를 완료한 후 등록해 주세요.',
      );
      return;
    }

    // 결과 이미지 생성 중이면 완료 후 등록하도록 안내
    if (resultImageInProgress.current || resultImageLoading) {
      Alert.alert(
        'AI 이미지 생성 중',
        '예상 결과 이미지 생성이 완료되면 등록해 주세요.',
      );
      return;
    }

    submitInProgress.current = true;
    setSubmitLoading(true);

    const version = draftVersion.current;

    try {
      const coordinate = reportCoordinate ?? {
        latitude: region.latitude,
        longitude: region.longitude,
      };

      const createdComplaint = await createComplaint({
        // API #9에서 받은 블러 이미지 ID
        imageId: previewResult.image.blurredImageId,

        // API #10 실패 또는 건너뛰기 시 null
        resultImageId: resultImage?.id ?? null,

        category,
        title,
        description,
        address,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        festivalId: category === 'festival' ? selectedFestivalId : null,

        privacyCheck: {
          faceBlurConfirmed: faceBlurAcknowledged,
          containsAnimalCarcass: hasAnimalCarcass,
          animalBlurConfirmed: animalBlurConfirmed,
        },
      });

      if (version !== draftVersion.current) return;

      submitted.current = true;

      // 서버에서 생성된 complaintId와 실제 데이터를 지도/목록에 반영
      onSubmit(createdComplaint);

      clearPreview();
      setComposerOpenState(false);

      Alert.alert(
        '민원 등록 완료',
        '민원이 서버에 정상적으로 등록되었어요.',
      );
    } catch (error) {
      if (version !== draftVersion.current) return;

      const message =
        error instanceof Error
          ? error.message
          : '민원 등록 중 오류가 발생했어요.';

      Alert.alert(
        '민원 등록 실패',
        `${message}\n\n작성 내용은 유지되므로 다시 시도할 수 있어요.`,
      );
    } finally {
      submitInProgress.current = false;
      setSubmitLoading(false);
    }
  }

  // 지도에서 선택한 좌표와 해당 주소를 반드시 함께 저장한다.
  function confirmReportLocation(place: LocatedPlace) {
    if (submitInProgress.current || previewInProgress.current) return;
    if (!Number.isFinite(place.coordinate.latitude) ||
        !Number.isFinite(place.coordinate.longitude) || !place.address.trim()) return;
    clearPreview();
    setReportCoordinate(place.coordinate);
    setAddressState(place.address.trim());
    setLocationConfirmed(true);
  }

  async function updateReportLocation() {
    if (submitInProgress.current) return;

    const version = draftVersion.current;
    const place = await locateUser();

    if (version !== draftVersion.current) return;

    if (place?.address.trim()) {
      confirmReportLocation(place);
    } else {
      Alert.alert(
        '위치를 가져오지 못했어요',
        '위치 권한을 확인하거나 지도에서 민원 발생 위치를 직접 지정해 주세요.',
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
    locationConfirmed,
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
    confirmReportLocation,

    previewLoading,
    previewError,
    previewResult,
    contentCheck,
    blurredPhotoUri,
    faceCount,
    previewAgency,
    previewEstimatedPeriod,

    resultImage,
    resultImageLoading,
    resultImageFailed,

    submitLoading,
  };
}
