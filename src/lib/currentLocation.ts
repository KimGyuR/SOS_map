
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { MapCoordinate } from '../components/ComplaintMap.types';

// GPS 조회 결과: 위도·경도와 실제 주소
export type LocatedPlace = {
  coordinate: MapCoordinate;
  address: string;
};

// 웹 환경에서 GPS 좌표를 주소로 변환
async function reverseGeocodeWeb(
  coordinate: MapCoordinate,
): Promise<string> {
  const { latitude, longitude } = coordinate;

  const url =
    'https://nominatim.openstreetmap.org/reverse?' +
    new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'json',
      addressdetails: '1',
      'accept-language': 'ko',
      zoom: '18',
    }).toString();

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `주소 변환 요청 실패: HTTP ${response.status}`,
    );
  }

  const data: {
    display_name?: string;
    address?: {
      road?: string;
      house_number?: string;
      suburb?: string;
      borough?: string;
      city_district?: string;
      city?: string;
      county?: string;
      state?: string;
    };
  } = await response.json();

  const address = data.address;

  if (address) {
    const formatted = [
      address.state,
      address.city ?? address.county,
      address.city_district ?? address.borough ?? address.suburb,
      address.road,
      address.house_number,
    ]
      .filter(Boolean)
      .join(' ');

    if (formatted) {
      return formatted;
    }
  }

  return data.display_name ?? '';
}

// 현재 GPS 좌표와 주소를 가져오는 함수
export async function getCurrentPlace(): Promise<LocatedPlace> {
  // 모바일에서만 Expo 위치 권한 요청
  if (Platform.OS !== 'web') {
    const permission =
      await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      throw new Error(
        '위치 권한을 허용하면 내 위치를 확인할 수 있어요.',
      );
    }
  }

  // 1. 현재 GPS 좌표 조회
  const coordinate = await getCurrentCoordinate();

  let address = '';

  // 2. 좌표를 실제 주소로 변환
  try {
    if (Platform.OS === 'web') {
      // 웹: OpenStreetMap 주소 변환 API
      address = await reverseGeocodeWeb(coordinate);
    } else {
      // 모바일: Expo 주소 변환 기능
      const [place] =
        await Location.reverseGeocodeAsync(coordinate);

      if (place) {
        address = [
          place.region,
          place.city,
          place.district,
          place.street,
          place.name,
        ]
          .filter(Boolean)
          .join(' ');
      }
    }
  } catch (error) {
    // 주소 변환이 실패해도 GPS 좌표는 유지
    console.warn('GPS 주소 변환 실패:', error);
  }

  return {
    coordinate,
    address,
  };
}

// 현재 GPS 좌표를 가져오는 함수
export async function getCurrentCoordinate(): Promise<MapCoordinate> {
  // 웹 브라우저 GPS
  if (Platform.OS === 'web') {
    return new Promise<MapCoordinate>((resolve, reject) => {
      if (
        !globalThis.isSecureContext ||
        !navigator.geolocation
      ) {
        reject(
          new Error(
            '현재 위치는 HTTPS 또는 localhost에서 사용할 수 있어요.',
          ),
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          resolve({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        },
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        },
      );
    });
  }

  // iOS / Android GPS
  const { coords } =
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}
