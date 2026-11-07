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
 * API 6. GET /complaints/nearby — complaints inside the visible map area.
 * One response drives both the map pins and the "지도 주변 민원" cards.
 */
export async function getNearbyComplaints(
  region: MapRegion,
  options: { category?: CategoryId; signal?: AbortSignal; } = {},
): Promise<ComplaintList & { totalCount: number; }> {
  const response = await apiRequest<NearbyComplaintsDto>('/complaints/nearby', {
    query: { ...toMapBounds(region), category: options.category && toCategoryCode(options.category) },
    signal: options.signal,
  });
  return { ...toComplaintList(response.complaints), totalCount: response.totalCount };
}

export type ComplaintListQuery = {
  /** 'all' (the list screen's "전체" chip) sends no area filter. */
  area?: AreaId | 'all';
  category?: CategoryId;
  festivalId?: number;
  status?: ComplaintStatus;
  sort?: 'latest' | 'empathy';
  /** Starts at 0. */
  page?: number;
  size?: number;
};

export type ComplaintPage = ComplaintList & {
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
};

/** API 7. GET /complaints — filtered, paged list (server defaults: latest first, 20 per page). */
export async function getComplaints(query: ComplaintListQuery = {}, signal?: AbortSignal): Promise<ComplaintPage> {
  const response = await apiRequest<ComplaintPageDto>('/complaints', {
    query: {
      area: query.area === 'all' ? undefined : query.area,
      category: query.category && toCategoryCode(query.category),
      festivalId: query.festivalId,
      status: query.status && toStatusCode(query.status),
      sort: query.sort,
      page: query.page,
      size: query.size,
    },
    signal,
  });
  return {
    ...toComplaintList(response.content),
    page: response.page,
    size: response.size,
    totalElements: response.totalElements,
    hasNext: response.hasNext,
  };
}

/** API 8. GET /complaints/{complaintId}. Error: 404 COMPLAINT_NOT_FOUND. */
export async function getComplaintDetail(id: string, signal?: AbortSignal): Promise<ComplaintDetail> {
  return toComplaintDetail(await apiRequest<ComplaintDetailDto>(`/complaints/${toServerId(id)}`, { signal }));
}

export type ComplaintPreviewInput = {
  /** Photo ID from the upload API (13). */
  imageId: number;
  category: CategoryId;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  festivalId: number | null;
};

export type ComplaintPreview = Omit<ComplaintPreviewDto, 'area'> & { area: AreaId; };

/**
 * API 9. POST /complaints/preview — content check and face blur, nothing is saved.
 * `contentCheck.passed: false` is still a success: show `feedback` and let the user edit or continue.
 * Errors: 400 INVALID_INPUT, 403 FORBIDDEN, 404 IMAGE_NOT_FOUND, 502 AI_UNAVAILABLE.
 */
export async function previewComplaint(input: ComplaintPreviewInput, signal?: AbortSignal): Promise<ComplaintPreview> {
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
  const response = await apiRequest<ComplaintPreviewDto>('/complaints/preview', { method: 'POST', body, signal });
  return { ...response, area: toAreaId(response.area) };
}
