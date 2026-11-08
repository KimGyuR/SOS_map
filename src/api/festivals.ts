import { apiRequest } from './client';

/** 서버 축제 목록을 화면과 민원 등록에서 공통으로 사용하는 모델 */
export type ServerFestival = {
  id: number;
  name: string;
  date: string;
  location: string;
  active: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function parseFestival(input: unknown): ServerFestival {
  const festival = record(input);
  if (!festival) throw new Error('서버 축제 데이터 형식이 올바르지 않아요.');

  const id = festival.festivalId ?? festival.id;
  const name = festival.name ?? festival.festivalName;
  if (typeof id !== 'number' || !Number.isInteger(id) || id < 1 ||
      typeof name !== 'string' || !name.trim()) {
    throw new Error('축제 목록에 festivalId 또는 name이 없어요.');
  }

  const start = str(festival.startDate ?? festival.startAt);
  const end = str(festival.endDate ?? festival.endAt);
  const status = str(festival.status).toUpperCase();
  const explicitActive = festival.active ?? festival.isActive ?? festival.ongoing ?? festival.isOngoing;
  let active: boolean;
  if (typeof explicitActive === 'boolean') {
    active = explicitActive;
  } else if (status) {
    active = ['ACTIVE', 'ONGOING', 'IN_PROGRESS', '진행중', '진행 중'].includes(status);
  } else if (start && end && !Number.isNaN(Date.parse(start)) && !Number.isNaN(Date.parse(end))) {
    const now = Date.now();
    const endTime = /^\d{4}-\d{2}-\d{2}$/.test(end)
      ? Date.parse(`${end}T23:59:59+09:00`)
      : Date.parse(end);
    active = Date.parse(start) <= now && now <= endTime;
  } else {
    // 서버에서 진행 중임을 확인할 수 없다면 신고 가능하다고 추정하지 않는다.
    active = false;
  }
  const date = str(festival.date) ||
    (start && end ? `${start.slice(0, 10)} ~ ${end.slice(0, 10)}` : '기간 정보 없음');
  const location = str(festival.location ?? festival.venue ?? festival.address) || '장소 정보 없음';
  return { id, name: name.trim(), date, location, active };
}

/** API #16. GET /festivals — 배열 또는 { festivals: [...] } 응답 지원 */
export async function getFestivals(signal?: AbortSignal): Promise<ServerFestival[]> {
  const raw = await apiRequest<unknown>('/festivals', { signal });
  const obj = record(raw);
  const list = Array.isArray(raw) ? raw : obj?.festivals ?? obj?.content ?? obj?.data;
  if (!Array.isArray(list)) {
    throw new Error('축제 API 응답 형식을 확인해야 해요. Swagger 응답 예시를 확인해 주세요.');
  }
  return list.map(parseFestival);
}
