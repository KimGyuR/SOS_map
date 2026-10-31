import type { IconName } from './AppIcon';
export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapRegion = MapCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapComplaint = {
  id: string;
  title: string;
  coordinate: MapCoordinate;
  icon: IconName;
  color: string;
};

export type ComplaintMapProps = {
  region: MapRegion;
  onRegionChangeComplete: (region: MapRegion) => void;
  complaints: MapComplaint[];
  userCoordinate: MapCoordinate | null;
  onComplaintPress: (id: string) => void;
};
