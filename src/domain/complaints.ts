import type { AreaId } from './types';

export function getAreaFromAddress(value: string): AreaId {
  if (value.includes('동성로')) return '동성로';
  if (value.includes('북구')) return '북구';
  if (value.includes('서구')) return '서구';
  if (value.includes('중구')) return '중구';
  if (value.includes('남구')) return '남구';
  if (value.includes('수성구')) return '수성구';
  if (value.includes('달서구')) return '달서구';
  if (value.includes('달성군')) return '달성군';
  return '기타';
}
