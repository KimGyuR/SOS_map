
import { Platform } from 'react-native';
import { apiRequest } from './client';

// API #14: 이미지 업로드 응답
export type ImageUploadResponse = {
  imageId: number;
  imageUrl: string;
};

/**
 * 민원 사진을 서버에 업로드하는 함수
 *
 * 웹: 실제 Blob 파일을 전송
 * 모바일: React Native의 파일 URI 객체를 전송
 */
export async function uploadImage(
  photoUri: string,
  signal?: AbortSignal,
): Promise<ImageUploadResponse> {
  // URI에서 확장자 확인
  const cleanUri = photoUri.split('?')[0];
  const extension = cleanUri.split('.').pop()?.toLowerCase();

  let mimeType = 'image/jpeg';
  let fileExtension = 'jpg';

  if (extension === 'png') {
    mimeType = 'image/png';
    fileExtension = 'png';
  } else if (extension === 'webp') {
    mimeType = 'image/webp';
    fileExtension = 'webp';
  } else if (extension === 'heic' || extension === 'heif') {
    mimeType = extension === 'heic' ? 'image/heic' : 'image/heif';
    fileExtension = extension;
  }

  const fileName = `complaint-${Date.now()}.${fileExtension}`;
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // 웹에서는 URI의 실제 이미지 데이터를 Blob으로 변환
    const response = await fetch(photoUri, { signal });

    if (!response.ok) {
      throw new Error('선택한 사진을 읽지 못했어요.');
    }

    const blob = await response.blob();

    // 실제 이미지 파일을 multipart/form-data에 추가
    formData.append('image', blob, fileName);
  } else {
    // iOS / Android에서는 React Native 방식 사용
    formData.append(
      'image',
      {
        uri: photoUri,
        name: fileName,
        type: mimeType,
      } as unknown as Blob,
    );
  }

  // JWT 인증과 multipart 요청은 기존 API 클라이언트에서 처리
  return apiRequest<ImageUploadResponse>('/images', {
    method: 'POST',
    body: formData,
    signal,
  });
}

/** API #15. 업로드했지만 민원에 연결하지 않은 이미지 삭제 */
export async function deleteImage(imageId: number): Promise<void> {
  if (!Number.isInteger(imageId) || imageId <= 0) {
    throw new Error('유효하지 않은 이미지 ID예요.');
  }
  await apiRequest<unknown>(`/images/${imageId}`, { method: 'DELETE' });
}
