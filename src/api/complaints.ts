
import type { MapRegion } from '../components/ComplaintMap.types';
import type { AreaId, CategoryId, ComplaintStatus } from '../domain/types';
import { apiRequest } from './client';
import {
  toAreaId,
  toCategoryCode,
  toComplaintDetail,
  toComplaintList,
  toMapBounds,
  toServerId,
  toStatusCode,
  type ApiComplaint,
  type ComplaintDetail,
} from './mappers';
import type {
  ComplaintDetailDto,
  ComplaintPageDto,
  ComplaintPreviewDto,
  ComplaintPreviewRequest,
  NearbyComplaintsDto,
} from './types';

export type ComplaintList = {
  complaints: ApiComplaint[];
  likedIds: Set<string>;
};

/**
 * API #6. 지도에 표시할 주변 민원 조회
 */
export async function getNearbyComplaints(
  region: MapRegion,
  options: {
    category?: CategoryId;
    signal?: AbortSignal;
  } = {},
): Promise<ComplaintList & { totalCount: number }> {
  const response = await apiRequest<NearbyComplaintsDto>(
    '/complaints/nearby',
    {
      query: {
        ...toMapBounds(region),
        category:
          options.category && toCategoryCode(options.category),
      },
      signal: options.signal,
    },
  );

  return {
    ...toComplaintList(response.complaints),
    totalCount: response.totalCount,
  };
}

export type ComplaintListQuery = {
  area?: AreaId | 'all';
  category?: CategoryId;
  festivalId?: number;
  status?: ComplaintStatus;
  sort?: 'latest' | 'empathy';
  page?: number;
  size?: number;
};

export type ComplaintPage = ComplaintList & {
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
};

/**
 * API #7. 전체 민원 목록 조회
 */
export async function getComplaints(
  query: ComplaintListQuery = {},
  signal?: AbortSignal,
): Promise<ComplaintPage> {
  const response = await apiRequest<ComplaintPageDto>(
    '/complaints',
    {
      query: {
        area: query.area === 'all' ? undefined : query.area,
        category:
          query.category && toCategoryCode(query.category),
        festivalId: query.festivalId,
        status: query.status && toStatusCode(query.status),
        sort: query.sort,
        page: query.page,
        size: query.size,
      },
      signal,
    },
  );

  return {
    ...toComplaintList(response.content),
    page: response.page,
    size: response.size,
    totalElements: response.totalElements,
    hasNext: response.hasNext,
  };
}

/**
 * API #8. 민원 상세 조회
 */
export async function getComplaintDetail(
  id: string,
  signal?: AbortSignal,
): Promise<ComplaintDetail> {
  const response = await apiRequest<ComplaintDetailDto>(
    `/complaints/${toServerId(id)}`,
    { signal },
  );

  return toComplaintDetail(response);
}

export type ComplaintPreviewInput = {
  imageId: number;
  category: CategoryId;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  festivalId: number | null;
};

export type ComplaintPreview =
  Omit<ComplaintPreviewDto, 'area'> & {
    area: AreaId;
  };

/**
 * API #9. AI 민원 미리보기
 *
 * 사진 업로드 API #14에서 받은 imageId 사용
 * 내용 검사와 얼굴 블러 처리 결과를 반환
 */
export async function previewComplaint(
  input: ComplaintPreviewInput,
  signal?: AbortSignal,
): Promise<ComplaintPreview> {
  const body: ComplaintPreviewRequest = {
    imageId: input.imageId,
    category: toCategoryCode(input.category),
    title: input.title.trim(),
    description: input.description.trim(),
    address: input.address.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    festivalId: input.festivalId,
  };

  const response = await apiRequest<ComplaintPreviewDto>(
    '/complaints/preview',
    {
      method: 'POST',
      body,
      signal,
    },
  );

  return {
    ...response,
    area: toAreaId(response.area),
  };
}

// ======================================================
// API #10. AI 민원 처리 결과 이미지 생성
// ======================================================

/**
 * API #10 요청 데이터
 *
 * blurredImageId:
 * API #9 응답의 image.blurredImageId를 사용
 */
export type ResultImageInput = {
  blurredImageId: number;
  category: CategoryId;
  title: string;
  description: string;
};

/**
 * API #10 응답 데이터
 *
 * resultImageId: 생성된 이미지 ID
 * resultImageUrl: 생성된 이미지 주소
 * description: AI 결과 이미지 설명
 */
export type ResultImageResponse = {
  resultImageId: number;
  resultImageUrl: string;
  description: string;
};

/**
 * API #10
 * POST /complaints/preview/result-image
 *
 * AI가 민원 처리 후 예상 모습을 이미지로 생성
 */
export async function createResultImage(
  input: ResultImageInput,
  signal?: AbortSignal,
): Promise<ResultImageResponse> {
  return apiRequest<ResultImageResponse>(
    '/complaints/preview/result-image',
    {
      method: 'POST',

      body: {
        // API #9에서 받은 블러 처리 이미지 ID
        blurredImageId: input.blurredImageId,

        // 프론트 카테고리를 서버 enum 값으로 변환
        category: toCategoryCode(input.category),

        title: input.title.trim(),
        description: input.description.trim(),
      },

      signal,
      timeoutMs: 60_000, // AI 이미지 생성은 일반 요청보다 오래 걸릴 수 있음
    },
  );
}

/**
 * API #11. 실제 민원 등록
 *
 * POST /complaints
 * 성공 시 201 Created + ComplaintDetailResponse 반환
 */
export type ComplaintCreateInput = {
  imageId: number;
  resultImageId: number | null;
  category: CategoryId;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  festivalId: number | null;
  privacyCheck: {
    faceBlurConfirmed: boolean;
    containsAnimalCarcass: boolean;
    animalBlurConfirmed: boolean;
  };
};

export async function createComplaint(
  input: ComplaintCreateInput,
  signal?: AbortSignal,
): Promise<ComplaintDetail> {
  const response = await apiRequest<ComplaintDetailDto>(
    '/complaints',
    {
      method: 'POST',
      body: {
        imageId: input.imageId,
        resultImageId: input.resultImageId,
        category: toCategoryCode(input.category),
        title: input.title.trim(),
        description: input.description.trim(),
        address: input.address.trim(),
        latitude: input.latitude,
        longitude: input.longitude,
        festivalId: input.festivalId,
        privacyCheck: input.privacyCheck,
      },
      signal,
    },
  );

  // API #8과 동일한 응답 형식을 기존 앱 데이터로 변환
  return toComplaintDetail(response);
}

/**
 * API #12, #13 공통 응답
 *
 * liked: 현재 사용자의 공감 여부
 * likeCount: 서버에 저장된 전체 공감 수
 */
export type EmpathyResponse = {
  complaintId: number;
  liked: boolean;
  likeCount: number;
};

/**
 * API #12. 민원 공감 등록
 *
 * POST /complaints/{complaintId}/empathy
 */
export async function likeComplaint(
  complaintId: string,
): Promise<EmpathyResponse> {
  return apiRequest<EmpathyResponse>(
    `/complaints/${toServerId(complaintId)}/empathy`,
    {
      method: 'POST',
    },
  );
}

/**
 * API #13. 민원 공감 취소
 *
 * DELETE /complaints/{complaintId}/empathy
 */
export async function unlikeComplaint(
  complaintId: string,
): Promise<EmpathyResponse> {
  return apiRequest<EmpathyResponse>(
    `/complaints/${toServerId(complaintId)}/empathy`,
    {
      method: 'DELETE',
    },
  );
}
/**
 * API #17. 민원 수정 (PATCH /complaints/{complaintId})
 * 변경된 필드만 전송한다. 누락된 필드의 기존 값은 서버가 유지한다.
 */
export type ComplaintUpdateInput = {
  title?: string;
  description?: string;
  category?: CategoryId;
  address?: string;
  latitude?: number;
  longitude?: number;
  imageId?: number;
  festivalId?: number | null;
  privacyCheck?: {
    faceBlurConfirmed: boolean;
    containsAnimalCarcass: boolean;
    animalBlurConfirmed: boolean;
  };
};

export async function updateComplaint(
  complaintId: string,
  changes: ComplaintUpdateInput,
): Promise<ComplaintDetail> {
  if (!Object.keys(changes).length) {
    throw new Error('변경된 항목이 없어요.');
  }

  const body = {
    ...changes,
    ...(changes.category !== undefined
      ? { category: toCategoryCode(changes.category) }
      : {}),
    ...(changes.title !== undefined ? { title: changes.title.trim() } : {}),
    ...(changes.description !== undefined
      ? { description: changes.description.trim() }
      : {}),
    ...(changes.address !== undefined
      ? { address: changes.address.trim() }
      : {}),
  };

  // PATCH가 204 또는 축약 응답을 반환할 수도 있으므로 저장 후 상세를 다시 조회한다.
  await apiRequest<unknown>(`/complaints/${toServerId(complaintId)}`, {
    method: 'PATCH',
    body,
  });
  return getComplaintDetail(complaintId);
}

/** API #18. 본인 민원 삭제 (DELETE /complaints/{complaintId}) */
export async function deleteComplaint(complaintId: string): Promise<void> {
  await apiRequest<unknown>(`/complaints/${toServerId(complaintId)}`, {
    method: 'DELETE',
  });
}
