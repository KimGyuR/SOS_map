import type { Map as LeafletMap } from 'leaflet';
import type { MapRegion } from '../components/ComplaintMap.types';

type Viewport = Pick<LeafletMap, 'getCenter' | 'getZoom' | 'setView'>;

/** Parent state echoed from a gesture is not a command to move the camera again. */
export function synchronizeMapRegion(map: Viewport, region: MapRegion, reportedRegion: MapRegion | null) {
  if (region === reportedRegion) return;
  const center = map.getCenter();
  if (Math.abs(center.lat - region.latitude) > 0.000001 || Math.abs(center.lng - region.longitude) > 0.000001) {
    map.setView([region.latitude, region.longitude], map.getZoom());
  }
}
