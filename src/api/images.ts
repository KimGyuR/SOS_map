
import { apiRequest } from './client';

// API #14 사진 업로드 응답
export type ImageUploadResponse = {
  imageId: number;
  imageUrl: string;
};

/**
 * API #14: 민원 사진 업로드
 *
 * @param photoUri - Expo ImagePicker로 선택한 사진의 로컬 URI
 * @returns 서버에 저장된 사진 ID와 URL
 */
export async function uploadImage(
  photoUri: string,
  signal?: AbortSignal,
): Promise<ImageUploadResponse> {
  // 사진 확장자를 확인해 MIME 타입 결정
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

  // React Native의 FormData에 파일 첨부
  const formData = new FormData();

  formData.append(
    'image',
    {
      uri: photoUri,
      name: `complaint-${Date.now()}.${fileExtension}`,
      type: mimeType,
    } as unknown as Blob,
  );

  // 공통 API 클라이언트가 JWT와 multipart 요청 처리
  return apiRequest<ImageUploadResponse>('/images', {
    method: 'POST',
    body: formData,
    signal,
  });
}
