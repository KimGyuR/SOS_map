import { AREAS } from '../domain/catalog';
import type { AreaId, CategoryId, Complaint, ComplaintStatus } from '../domain/types';
import type { MapRegion } from '../components/ComplaintMap.types';
import type { CategoryCode, ComplaintDetailDto, ComplaintSummaryDto, MyPageDto, StatusCode } from './types';

const CATEGORY_CODES: Record<CategoryId, CategoryCode> = {
  road: 'ROAD',
  trash: 'TRASH',
  streetlight: 'STREETLIGHT',
  parking: 'PARKING',
  noise: 'NOISE',
  animal: 'ANIMAL',
  festival: 'FESTIVAL',
  other: 'OTHER',
};

const STATUS_LABELS: Record<StatusCode, ComplaintStatus> = {
  RECEIVED: '접수',
  IN_PROGRESS: '처리 중',
  RESOLVED: '해결 완료',
};

export const toCategoryCode = (id: CategoryId): CategoryCode => CATEGORY_CODES[id];

export function toCategoryId(code: string): CategoryId {
  const match = (Object.keys(CATEGORY_CODES) as CategoryId[]).find((id) => CATEGORY_CODES[id] === code);
  return match ?? 'other';
}

export function toComplaintStatus(code: string): ComplaintStatus {
  return STATUS_LABELS[code as StatusCode] ?? '접수';
}

export function toStatusCode(status: ComplaintStatus): StatusCode {
  return (Object.keys(STATUS_LABELS) as StatusCode[]).find((code) => STATUS_LABELS[code] === status) ?? 'RECEIVED';
}

export function toAreaId(value: string): AreaId {
  return (AREAS as string[]).includes(value) ? (value as AreaId) : '기타';
}

/** The app keeps IDs as strings; the server expects numbers. */
export function toServerId(id: string): number {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`서버에 등록되지 않은 민원이에요. (id: ${id})`);
  return value;
}

/**
 * App complaint plus fields only the server provides. `createdAt` stays ISO 8601;
 * screens format it with formatRelativeTime from ./dates.
 */
export type ApiComplaint = Complaint & { thumbnailUrl?: string; };

export function toComplaint(dto: ComplaintSummaryDto): ApiComplaint {
  return {
    id: String(dto.complaintId),
    title: dto.title,
    address: dto.address,
    area: toAreaId(dto.area),
    category: toCategoryId(dto.category),
    status: toComplaintStatus(dto.status),
    latitude: dto.latitude,
    longitude: dto.longitude,
    createdAt: dto.createdAt,
    likeCount: dto.likeCount,
    ...(dto.festival ? { festival: dto.festival.name } : {}),
    ...(dto.thumbnailUrl ? { thumbnailUrl: dto.thumbnailUrl } : {}),
  };
}

/** Converts a summary list and collects which items the current user has liked. */
export function toComplaintList(dtos: ComplaintSummaryDto[]): { complaints: ApiComplaint[]; likedIds: Set<string>; } {
  return {
    complaints: dtos.map(toComplaint),
    likedIds: new Set(dtos.filter((dto) => dto.liked).map((dto) => String(dto.complaintId))),
  };
}

export type MyPage = {
  user: MyPageDto['user'];
  stats: MyPageDto['stats'];
  recentComplaints: ApiComplaint[];
  likedIds: Set<string>;
};

export function toMyPage(dto: MyPageDto): MyPage {
  const { complaints, likedIds } = toComplaintList(dto.recentComplaints);
  return { user: dto.user, stats: dto.stats, recentComplaints: complaints, likedIds };
}

export type ComplaintDetail = ApiComplaint & {
  description: string;
  agency: string;
  estimatedPeriod: string;
  imageUrl?: string;
  festivalId?: number;
  liked: boolean;
  mine: boolean;
};

export function toComplaintDetail(dto: ComplaintDetailDto): ComplaintDetail {
  return {
    id: String(dto.complaintId),
    title: dto.title,
    description: dto.description,
    address: dto.address,
    area: toAreaId(dto.area),
    category: toCategoryId(dto.category),
    status: toComplaintStatus(dto.status),
    latitude: dto.latitude,
    longitude: dto.longitude,
    agency: dto.agency,
    estimatedPeriod: dto.estimatedPeriod,
    createdAt: dto.createdAt,
    likeCount: dto.likeCount,
    liked: dto.liked,
    mine: dto.mine,
    ...(dto.imageUrl ? { imageUrl: dto.imageUrl } : {}),
    ...(dto.festival ? { festival: dto.festival.name, festivalId: dto.festival.festivalId } : {}),
  };
}

export type MapBounds = { minLat: number; maxLat: number; minLng: number; maxLng: number; };

/** Visible map edges for API 6, from the map's center and span. */
export function toMapBounds(region: MapRegion): MapBounds {
  return {
    minLat: region.latitude - region.latitudeDelta / 2,
    maxLat: region.latitude + region.latitudeDelta / 2,
    minLng: region.longitude - region.longitudeDelta / 2,
    maxLng: region.longitude + region.longitudeDelta / 2,
  };
}
