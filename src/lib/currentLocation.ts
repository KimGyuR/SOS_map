import * as Location from 'expo-location';
import { Platform } from 'react-native';
import type { MapCoordinate } from '../components/ComplaintMap.types';

export type LocatedPlace = { coordinate: MapCoordinate; address: string };

/** Shared by map recentering and report GPS; address lookup must not discard GPS. */
export async function getCurrentPlace(): Promise<LocatedPlace> {
  if (Platform.OS !== 'web') {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      throw new Error('위치 권한을 허용하면 내 위치를 확인할 수 있어요.');
    }
  }
  const coordinate = await getCurrentCoordinate();
  let address = '';
  if (Platform.OS !== 'web') {
    try {
      const [place] = await Location.reverseGeocodeAsync(coordinate);
      if (place) address = [place.region, place.city, place.district, place.street, place.name].filter(Boolean).join(' ');
    } catch { /* Address lookup is optional; the coordinate is still valid. */ }
  }
  return { coordinate, address };
}

export async function getCurrentCoordinate() {
  if (Platform.OS === 'web') {
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      if (!globalThis.isSecureContext || !navigator.geolocation) {
        reject(new Error('현재 위치는 HTTPS 또는 localhost에서 사용할 수 있어요.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
      );
    });
  }
  const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: coords.latitude, longitude: coords.longitude };
}
