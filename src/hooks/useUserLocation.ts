import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapCoordinate, MapRegion } from '../components/ComplaintMap.types';
import { INITIAL_REGION } from '../domain/catalog';
import { getCurrentPlace, type LocatedPlace } from '../lib/currentLocation';

export function useUserLocation() {
  const [region, setRegion] = useState<MapRegion>(INITIAL_REGION);
  const [userCoordinate, setUserCoordinate] = useState<MapCoordinate | null>(null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [locationMessage, setLocationMessage] = useState('대구 중구 · 현재 위치를 확인해 보세요');
  const [locationLoading, setLocationLoading] = useState(false);
  const pending = useRef<Promise<LocatedPlace | null> | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const locateUser = useCallback((): Promise<LocatedPlace | null> => {
    if (pending.current) return pending.current;
    setLocationLoading(true);
    const request = getCurrentPlace().then((place) => {
      if (mounted.current) {
        setUserCoordinate(place.coordinate);
        setRegion({ ...INITIAL_REGION, ...place.coordinate });
        setCurrentAddress(place.address);
        setLocationMessage(place.address || '현재 위치를 확인했어요');
      }
      return place;
    }).catch((error: unknown) => {
      if (mounted.current) {
        setLocationMessage(error instanceof Error ? error.message : '위치를 찾지 못했어요. 위치 권한을 확인하고 다시 시도해 주세요.');
      }
      return null;
    }).finally(() => {
      pending.current = null;
      if (mounted.current) setLocationLoading(false);
    });
    pending.current = request;
    return request;
  }, []);

  return { region, setRegion, userCoordinate, currentAddress, locationMessage, locationLoading, locateUser };
}
