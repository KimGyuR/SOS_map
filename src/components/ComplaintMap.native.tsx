import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';
import type { ComplaintMapProps } from './ComplaintMap.types';

export default function ComplaintMap({
  region,
  onRegionChangeComplete,
  complaints,
  userCoordinate,
  onComplaintPress,
}: ComplaintMapProps) {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
      showsUserLocation={Boolean(userCoordinate)}
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      {complaints.map((item) => (
        <Marker
          key={item.id}
          coordinate={item.coordinate}
          onPress={() => onComplaintPress(item.id)}
          tracksViewChanges={false}
        >
          <View style={[styles.marker, { backgroundColor: item.color }]}>
            <Text style={styles.markerText}>{item.emoji}</Text>
          </View>
        </Marker>
      ))}
      {userCoordinate ? (
        <Marker coordinate={userCoordinate} title="내 위치" tracksViewChanges={false}>
          <View style={styles.myLocationMarker} />
        </Marker>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 35,
    height: 35,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  markerText: { fontSize: 15 },
  myLocationMarker: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#0878F9',
    elevation: 5,
  },
});
