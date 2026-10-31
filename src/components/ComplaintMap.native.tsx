import AppIcon from './AppIcon';
import { colors } from '../theme/colors';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
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
      showsUserLocation={false}
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
            <AppIcon name={item.icon} size={21} color="white" />
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
    width: 40,
    height: 40,
    borderRadius: 15,
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
    backgroundColor: colors.sky,
    elevation: 5,
  },
});
