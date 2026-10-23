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
  emoji: string;
  color: string;
};

export type ComplaintMapProps = {
  region: MapRegion;
  onRegionChangeComplete: (region: MapRegion) => void;
  complaints: MapComplaint[];
  userCoordinate: MapCoordinate | null;
  onComplaintPress: (id: string) => void;
};
