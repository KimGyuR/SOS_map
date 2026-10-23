import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComplaintMapProps, MapCoordinate } from './ComplaintMap.types';

function getPosition(coordinate: MapCoordinate, region: ComplaintMapProps['region']) {
  return {
    left: `${Math.max(7, Math.min(93, 50 + ((coordinate.longitude - region.longitude) / region.longitudeDelta) * 100))}%` as `${number}%`,
    top: `${Math.max(9, Math.min(88, 50 - ((coordinate.latitude - region.latitude) / region.latitudeDelta) * 100))}%` as `${number}%`,
  };
}

export default function ComplaintMap({ region, complaints, userCoordinate, onComplaintPress }: ComplaintMapProps) {
  return (
    <View style={styles.map}>
      <View style={styles.park} />
      <View style={[styles.park, styles.smallPark]} />
      <View style={[styles.road, styles.roadHorizontal]} />
      <View style={[styles.road, styles.roadVertical]} />
      <View style={[styles.road, styles.roadDiagonal]} />
      <View style={[styles.road, styles.roadDiagonalSecond]} />
      <Text style={[styles.placeLabel, { left: '15%', top: '21%' }]}>동성로</Text>
      <Text style={[styles.placeLabel, { left: '59%', top: '68%' }]}>중앙로</Text>
      <Text style={[styles.parkLabel, { left: '72%', top: '24%' }]}>공원</Text>
      <View style={styles.mapAttribution}><Text style={styles.attributionText}>웹 지도 미리보기 · 위치 권한 허용 시 내 주변 기준</Text></View>
      {complaints.map((item) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title} 민원 위치`}
          key={item.id}
          onPress={() => onComplaintPress(item.id)}
          style={[styles.marker, { backgroundColor: item.color, ...getPosition(item.coordinate, region) }]}
        >
          <Text style={styles.markerText}>{item.emoji}</Text>
        </Pressable>
      ))}
      {userCoordinate ? (
        <View style={[styles.userMarker, getPosition(userCoordinate, region)]}>
          <View style={styles.userPulse} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', backgroundColor: '#ECF2E9' },
  park: { position: 'absolute', left: '67%', top: '8%', width: '25%', height: '25%', borderRadius: 25, backgroundColor: '#D5E8D0' },
  smallPark: { left: '5%', top: '63%', width: '19%', height: '21%', backgroundColor: '#D9EAD2' },
  road: { position: 'absolute', backgroundColor: '#FFFFFF', borderColor: '#E8E4D9', borderWidth: 1 },
  roadHorizontal: { left: '-10%', top: '44%', width: '120%', height: 29 },
  roadVertical: { left: '41%', top: '-10%', width: 27, height: '120%' },
  roadDiagonal: { left: '18%', top: '-20%', width: 20, height: '145%', transform: [{ rotate: '32deg' }] },
  roadDiagonalSecond: { left: '74%', top: '-15%', width: 18, height: '135%', transform: [{ rotate: '-26deg' }], backgroundColor: '#F7F5ED' },
  placeLabel: { position: 'absolute', color: '#71816B', fontSize: 11, fontWeight: '600' },
  parkLabel: { position: 'absolute', color: '#6B9667', fontSize: 10 },
  mapAttribution: { position: 'absolute', left: 8, bottom: 7, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FFFFFFCC' },
  attributionText: { color: '#758174', fontSize: 8 },
  marker: { position: 'absolute', width: 35, height: 35, marginLeft: -17, marginTop: -17, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 18, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  markerText: { fontSize: 15 },
  userMarker: { position: 'absolute', width: 20, height: 20, marginLeft: -10, marginTop: -10, alignItems: 'center', justifyContent: 'center' },
  userPulse: { width: 17, height: 17, borderRadius: 9, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#0878F9', elevation: 5 },
});
