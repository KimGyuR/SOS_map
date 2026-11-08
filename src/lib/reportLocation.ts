import { Platform } from 'react-native';
import * as Location from 'expo-location';
import type { MapCoordinate } from '../components/ComplaintMap.types';

// 지도에서 선택한 좌표를 실제 민원 주소로 변환한다.
export async function reverseReportLocation(coordinate: MapCoordinate): Promise<string> {
  if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude) ||
      Math.abs(coordinate.latitude) > 90 || Math.abs(coordinate.longitude) > 180) {
    throw new Error('올바른 지도 위치가 아니에요.');
  }
  if (Platform.OS !== 'web') {
    const [place] = await Location.reverseGeocodeAsync(coordinate);
    const formatted = [place?.region, place?.city, place?.district, place?.street, place?.name]
      .filter(Boolean).join(' ').trim();
    if (!formatted) throw new Error('선택한 위치의 주소를 찾지 못했어요.');
    return formatted.slice(0, 255);
  }
  const params = new URLSearchParams({
    lat: String(coordinate.latitude), lon: String(coordinate.longitude),
    format: 'json', addressdetails: '1', 'accept-language': 'ko', zoom: '18',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('지도 주소 조회에 실패했어요. 다시 시도해 주세요.');
  const data: {
    display_name?: string;
    address?: Record<string, string>;
  } = await response.json();
  const a = data.address;
  const address = a
    ? [a.state, a.city ?? a.county, a.city_district ?? a.borough ?? a.suburb,
       a.road ?? a.pedestrian, a.house_number].filter(Boolean).join(' ')
    : '';
  const value = (address || data.display_name || '').trim();
  if (!value) throw new Error('선택한 위치의 주소를 찾지 못했어요.');
  return value.slice(0, 255);
}

// 검색은 지도 이동 용도로만 사용한다. 검색 결과를 신고 좌표로 곧바로 확정하지 않는다.
export async function searchReportLocation(query: string): Promise<MapCoordinate> {
  if (!query.trim()) throw new Error('지역 또는 주소를 입력해 주세요.');
  if (Platform.OS !== 'web') {
    const matches = await Location.geocodeAsync(query.trim());
    const first = matches[0];
    if (!first) throw new Error('검색 결과가 없어요. 주소를 더 자세히 입력해 주세요.');
    return { latitude: first.latitude, longitude: first.longitude };
  }
  const params = new URLSearchParams({
    q: query.trim(), format: 'json', limit: '1', 'accept-language': 'ko',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('장소 검색에 실패했어요. 다시 시도해 주세요.');
  const data: Array<{ lat: string; lon: string }> = await response.json();
  if (!data.length) throw new Error('검색 결과가 없어요. 주소를 더 자세히 입력해 주세요.');
  const latitude = Number(data[0].lat);
  const longitude = Number(data[0].lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('검색한 위치의 좌표를 확인하지 못했어요.');
  }
  return { latitude, longitude };
}
