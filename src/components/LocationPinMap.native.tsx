import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import type { MapCoordinate } from './ComplaintMap.types';

type Props = { coordinate: MapCoordinate; onPress: (value: MapCoordinate) => void };

export default function LocationPinMap({ coordinate, onPress }: Props) {
  const map = useRef<MapView | null>(null);
  useEffect(() => {
    map.current?.animateToRegion({
      ...coordinate, latitudeDelta: 0.018, longitudeDelta: 0.018,
    }, 250);
  }, [coordinate.latitude, coordinate.longitude]);

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialRegion={{ ...coordinate, latitudeDelta: 0.018, longitudeDelta: 0.018 }}
      onPress={(event: MapPressEvent) => onPress(event.nativeEvent.coordinate)}
      showsUserLocation={false}
    >
      <Marker coordinate={coordinate} title="민원 발생 위치" />
    </MapView>
  );
}
