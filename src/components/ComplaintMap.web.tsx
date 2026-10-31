import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ComplaintMapProps, MapRegion } from './ComplaintMap.types';
import { iconPaths } from './AppIcon';
import { colors } from '../theme/colors';
import { synchronizeMapRegion } from '../lib/mapViewport';

export default function ComplaintMap(props: ComplaintMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const reportedRegion = useRef<MapRegion | null>(null);
  useEffect(() => { latest.current = props; }, [props]);
  const [instance, setInstance] = useState<{ map: Leaflet.Map; L: typeof Leaflet } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let map: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    void import('leaflet').then((L) => {
      if (disposed || !host.current) return;
      const { region } = latest.current;
      map = L.map(host.current, { zoomControl: false, minZoom: 0, maxZoom: 19 }).setView([region.latitude, region.longitude], 15);
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.tileLayer(process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: process.env.EXPO_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).on('tileerror', () => setError('지도를 불러오지 못했어요. 네트워크 연결을 확인해 주세요.'))
        .on('tileload', () => setError('')).addTo(map);
      const activeMap = map;
      map.on('moveend', () => {
        const center = activeMap.getCenter();
        const bounds = activeMap.getBounds();
        const nextRegion = { latitude: center.lat, longitude: center.lng, latitudeDelta: bounds.getNorth() - bounds.getSouth(), longitudeDelta: bounds.getEast() - bounds.getWest() };
        // A gesture already moved the map. Do not replay its state as a camera command.
        reportedRegion.current = nextRegion;
        latest.current.onRegionChangeComplete(nextRegion);
      });
      observer = new ResizeObserver(() => activeMap.invalidateSize());
      observer.observe(host.current);
      setInstance({ map, L });
    }).catch(() => setError('지도 로딩에 실패했어요. 화면을 다시 열어 주세요.'));
    return () => { disposed = true; observer?.disconnect(); map?.remove(); };
  }, []);
  useEffect(() => {
    if (!instance) return;
    synchronizeMapRegion(instance.map, props.region, reportedRegion.current);
  }, [instance, props.region]);
  useEffect(() => {
    if (!instance) return;
    const { map, L } = instance;
    const layer = L.layerGroup().addTo(map);
    for (const item of props.complaints) {
      const svg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPaths[item.icon]}"/></svg>`;
      const icon = L.divIcon({ className: '', iconSize: [40, 40], iconAnchor: [20, 20], html: `<span style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:3px solid white;border-radius:15px;box-sizing:border-box;background:${item.color};box-shadow:0 2px 6px #293e3833">${svg}</span>` });
      L.marker([item.coordinate.latitude, item.coordinate.longitude], { icon, title: item.title, alt: item.title, keyboard: true }).on('click', () => latest.current.onComplaintPress(item.id)).addTo(layer);
    }
    return () => { layer.remove(); };
  }, [instance, props.complaints]);
  useEffect(() => {
    if (!instance || !props.userCoordinate) return;
    const marker = instance.L.circleMarker([props.userCoordinate.latitude, props.userCoordinate.longitude], {
      radius: 9, color: 'white', weight: 3, fillColor: colors.sky, fillOpacity: 1,
    }).bindTooltip('현재 위치').addTo(instance.map);
    return () => { marker.remove(); };
  }, [instance, props.userCoordinate]);
  return <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
    <div ref={host} aria-label="주변 민원 지도" style={{ width: '100%', height: '100%' }} />
    {error ? <div role="alert" style={{ position: 'absolute', top: 54, left: 12, right: 12, zIndex: 1000, padding: 10, background: 'white', color: colors.apple, fontSize: 12, borderRadius: 10 }}>{error}</div> : null}
  </div>;
}
