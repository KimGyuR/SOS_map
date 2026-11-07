// Shapes exactly as the server sends them. Screens use src/domain/types instead.
export type CategoryCode = 'ROAD' | 'TRASH' | 'STREETLIGHT' | 'PARKING' | 'NOISE' | 'ANIMAL' | 'FESTIVAL' | 'OTHER';

export type StatusCode = 'RECEIVED' | 'IN_PROGRESS' | 'RESOLVED';

export type FestivalRefDto = {
  festivalId: number;
  name: string;
};

/** 민원 요약 객체: shared by APIs 5, 6 and 7. */
export type ComplaintSummaryDto = {
  complaintId: number;
  title: string;
  address: string;
  area: string;
  category: CategoryCode;
  status: StatusCode;
  latitude: number;
  longitude: number;
  likeCount: number;
  liked: boolean;
  festival: FestivalRefDto | null;
  thumbnailUrl: string | null;
  /** ISO 8601, e.g. "2026-11-02T14:30:00+09:00". */
  createdAt: string;
};

/** API 1 request. The password confirmation is checked only in the app. */
export type SignupRequest = {
  loginId: string;
  name: string;
  email: string;
  password: string;
};

/** API 1 response (201). */
export type UserDto = {
  userId: number;
  loginId: string;
  name: string;
  email: string;
};

/** API 2 response (200). A taken email is still 200 with `available: false`. */
export type EmailAvailabilityDto = {
  email: string;
  available: boolean;
};

/** API 3 response (200). A taken login ID is still 200 with `available: false`. */
export type LoginIdAvailabilityDto = {
  loginId: string;
  available: boolean;
};

/** API 4 request. */
export type LoginRequest = {
  loginId: string;
  password: string;
};

/** API 4 response (200). `expiresIn` is in seconds (currently 7 days). */
export type LoginResponseDto = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: Omit<UserDto, 'email'>;
};

/** API 5 response (200). */
export type MyPageDto = {
  user: UserDto;
  stats: {
    reportedCount: number;
    resolvedCount: number;
    receivedEmpathyCount: number;
  };
  /** Up to 4, newest first. */
  recentComplaints: ComplaintSummaryDto[];
};

/** API 6 response (200). Drives both the map pins and the nearby cards. */
export type NearbyComplaintsDto = {
  totalCount: number;
  complaints: ComplaintSummaryDto[];
};

/** API 7 response (200). `page` starts at 0. */
export type ComplaintPageDto = {
  content: ComplaintSummaryDto[];
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
};

/** API 8 response (200). */
export type ComplaintDetailDto = {
  complaintId: number;
  title: string;
  description: string;
  address: string;
  area: string;
  category: CategoryCode;
  status: StatusCode;
  latitude: number;
  longitude: number;
  agency: string;
  estimatedPeriod: string;
  imageUrl: string | null;
  festival: FestivalRefDto | null;
  likeCount: number;
  liked: boolean;
  /** True when the viewer wrote this complaint (for future edit/delete buttons). */
  mine: boolean;
  createdAt: string;
};

/** API 9 request. Nothing is saved; the server only computes a preview. */
export type ComplaintPreviewRequest = {
  imageId: number;
  category: CategoryCode;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  festivalId: number | null;
};

/** API 9 response (200). A failed content check is still 200 with `passed: false`. */
export type ComplaintPreviewDto = {
  agency: string;
  estimatedPeriod: string;
  area: string;
  contentCheck: {
    passed: boolean;
    feedback: string;
  };
  image: {
    originalImageId: number;
    /** Send this ID (not the original) when registering the complaint in API 10. */
    blurredImageId: number;
    blurredImageUrl: string;
    /** 0 means the blurred image is identical to the original. */
    faceCount: number;
  };
};
