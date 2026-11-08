import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapCoordinate } from './ComplaintMap.types';

type Props = { coordinate: MapCoordinate; onPress: (value: MapCoordinate) => void };

export default function LocationPinMap({ coordinate, onPress }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const latestOnPress = useRef(onPress);
  const lastClicked = useRef<MapCoordinate | null>(null);
  const [ready, setReady] = useState<{ map: Leaflet.Map; L: typeof Leaflet } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { latestOnPress.current = onPress; }, [onPress]);
  useEffect(() => {
    let disposed = false;
    let map: Leaflet.Map | null = null;
    let resize: ResizeObserver | undefined;
    void import('leaflet').then((L) => {
      if (disposed || !container.current) return;
      map = L.map(container.current, { zoomControl: true, maxZoom: 19 })
        .setView([coordinate.latitude, coordinate.longitude], 15);
      L.tileLayer(process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: process.env.EXPO_PUBLIC_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors',
      }).addTo(map);
      map.on('click', (e: Leaflet.LeafletMouseEvent) => {
        const value = { latitude: e.latlng.lat, longitude: e.latlng.lng };
        lastClicked.current = value;
        latestOnPress.current(value);
      });
      resize = new ResizeObserver(() => map?.invalidateSize());
      resize.observe(container.current);
      setReady({ map, L });
    }).catch(() => setError('지도를 불러오지 못했어요.'));
    return () => {
      disposed = true;
      resize?.disconnect();
      map?.remove();
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const selected = ready.L.circleMarker([coordinate.latitude, coordinate.longitude], {
      radius: 9, color: '#FFFFFF', weight: 3, fillColor: '#287FC2', fillOpacity: 1,
    }).addTo(ready.map);
    const clicked = lastClicked.current;
    if (clicked?.latitude !== coordinate.latitude || clicked?.longitude !== coordinate.longitude) {
      ready.map.setView([coordinate.latitude, coordinate.longitude], Math.max(ready.map.getZoom(), 15));
    }
    return () => { selected.remove(); };
  }, [ready, coordinate.latitude, coordinate.longitude]);

  return <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <div ref={container} aria-label="민원 발생 위치 선택 지도" style={{ width: '100%', height: '100%' }} />
    {error ? <div role="alert" style={{ position: 'absolute', top: 8, left: 8, background: '#FFFFFF', padding: 8 }}>{error}</div> : null}
  </div>;
}
