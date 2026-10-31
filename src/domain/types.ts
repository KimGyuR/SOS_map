import type { IconName } from '../components/AppIcon';

export type CategoryId = 'road' | 'trash' | 'streetlight' | 'parking' | 'noise' | 'animal' | 'festival' | 'other';

export type Screen = 'map' | 'list' | 'festival' | 'mypage';

export type ComplaintStatus = '접수' | '처리 중' | '해결 완료';

export type AreaId = '동성로' | '북구' | '서구' | '중구' | '남구' | '수성구' | '달서구' | '달성군' | '기타';

export type Category = {
  id: CategoryId;
  label: string;
  icon: IconName;
  color: string;
  agency: string;
  estimate: string;
};

export type Complaint = {
  id: string;
  title: string;
  address: string;
  area: AreaId;
  category: CategoryId;
  status: ComplaintStatus;
  latitude: number;
  longitude: number;
  createdAt: string;
  description?: string;
  likeCount: number;
  isSample?: boolean;
  festival?: string;
};
