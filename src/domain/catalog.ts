import { colors } from '../theme/colors';
import type { MapRegion } from '../components/ComplaintMap.types';
import type { Category, CategoryId, Complaint, AreaId } from './types';

export const CATEGORIES: Category[] = [
  { id: 'road', label: '도로 파손', icon: 'road', color: colors.apple, agency: '도로관리과', estimate: '3~5일' },
  { id: 'trash', label: '쓰레기', icon: 'trash', color: colors.market, agency: '청소행정과', estimate: '1~2일' },
  { id: 'streetlight', label: '가로등', icon: 'streetlight', color: colors.sky, agency: '도로관리과', estimate: '2~4일' },
  { id: 'parking', label: '불법 주정차', icon: 'parking', color: colors.river, agency: '교통지도과', estimate: '현장 확인 후 조치' },
  { id: 'noise', label: '소음', icon: 'noise', color: colors.history, agency: '환경관리과', estimate: '2~3일' },
  { id: 'animal', label: '동물 사체', icon: 'animal', color: colors.stream, agency: '동물보호 담당 부서', estimate: '당일 확인' },
  { id: 'festival', label: '축제 불편', icon: 'festival', color: colors.earth, agency: '축제 운영센터', estimate: '당일~1일' },
  { id: 'other', label: '기타', icon: 'pin', color: colors.stream, agency: '민원 담당 부서', estimate: '담당 부서 확인 후 안내' },
];

export const INITIAL_REGION: MapRegion = {
  latitude: 35.8714,
  longitude: 128.6014,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

export const INITIAL_COMPLAINTS: Complaint[] = [
  { id: '1', title: '보도블록이 파손되어 걸을 때 위험해요', address: '대구 중구 동성로 12-3', area: '동성로', category: 'road', status: '처리 중', latitude: 35.8718, longitude: 128.6019, createdAt: '3시간 전', description: '보도블록이 파손되어 걸을 때 걸려 넘어질 위험이 있어요.', likeCount: 12, isSample: true },
  { id: '2', title: '공원 입구에 쓰레기가 쌓였어요', address: '대구 북구 산격동 120', area: '북구', category: 'trash', status: '접수', latitude: 35.874, longitude: 128.598, createdAt: '어제', description: '공원 입구에 쓰레기가 쌓여 있어 정리가 필요해요.', likeCount: 4, isSample: true },
  { id: '3', title: '골목 가로등이 켜지지 않아요', address: '대구 서구 비산동 8', area: '서구', category: 'streetlight', status: '해결 완료', latitude: 35.8688, longitude: 128.605, createdAt: '2일 전', description: '밤에 골목이 어두워 보행이 불편해요.', likeCount: 8, isSample: true },
  { id: '4', title: '축제 현장 안내 표지가 부족해요', address: '대구 중구 국채보상로 670', area: '중구', category: 'festival', status: '접수', latitude: 35.876, longitude: 128.607, createdAt: '1시간 전', description: '행사장 안내 표지가 부족해 길을 찾기 어려워요.', likeCount: 2, festival: '대구 야간 페스타', isSample: true },
];

export const AREAS: AreaId[] = ['동성로', '북구', '서구', '중구', '남구', '수성구', '달서구', '달성군', '기타'];

export const FESTIVALS = [
  { name: '대구 야간 페스타', date: '10.24 – 10.26', location: '국채보상운동기념공원', active: true },
  { name: '동성로 청년 페스티벌', date: '11.01 – 11.02', location: '동성로 일대', active: true },
  { name: '수성못 가을 음악회', date: '지난 행사', location: '수성못 상화동산', active: false },
];

export const getCategory = (id: CategoryId) => CATEGORIES.find((item) => item.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
