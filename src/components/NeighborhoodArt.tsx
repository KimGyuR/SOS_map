import AppIcon from './AppIcon';
import { colors } from '../theme/colors';
import { StyleSheet, Text, View } from 'react-native';

/** Lightweight, resolution-independent neighborhood illustration. */
export default function NeighborhoodArt() {
  return (
    <View style={styles.scene} aria-hidden>
      <View style={styles.sun} />
      <View style={styles.ground} />
      <View style={styles.path} />
      <View style={[styles.house, styles.leftHouse]}>
        <View style={styles.roof} />
        <View style={styles.windowRow}><View style={styles.window} /><View style={styles.window} /></View>
        <View style={styles.door} />
      </View>
      <View style={[styles.house, styles.rightHouse]}>
        <View style={styles.windowRow}><View style={styles.window} /><View style={styles.window} /></View>
        <View style={styles.windowRow}><View style={styles.window} /><View style={styles.window} /></View>
        <View style={styles.awning} />
      </View>
      <View style={styles.trunk} /><View style={styles.tree} />
      <View style={styles.pin}><AppIcon name="heart" color="white" size={22} /></View>
      <View style={styles.note}><View style={styles.dot} /><Text style={styles.noteText}>작은 관심이 만드는 좋은 동네</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { height: 176, width: '100%', maxWidth: 360, alignSelf: 'center', overflow: 'hidden', marginTop: 12 },
  sun: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.market, top: 9, right: 48 },
  ground: { position: 'absolute', height: 78, width: '100%', bottom: 9, backgroundColor: '#E3EBDF', borderRadius: 100 },
  path: { position: 'absolute', width: 240, height: 12, backgroundColor: colors.magnolia, bottom: 48, left: 43, transform: [{ rotate: '-7deg' }] },
  house: { position: 'absolute', width: 70, backgroundColor: colors.earth, bottom: 51, borderRadius: 5, paddingTop: 15, alignItems: 'center' },
  leftHouse: { height: 67, left: 63 },
  rightHouse: { height: 92, right: 65, backgroundColor: colors.river, width: 74, paddingTop: 13 },
  roof: { position: 'absolute', width: 55, height: 55, backgroundColor: colors.history, top: -25, transform: [{ rotate: '45deg' }], borderRadius: 5, zIndex: -1 },
  windowRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  window: { width: 13, height: 16, borderRadius: 3, backgroundColor: '#FFF8DF' },
  door: { width: 17, height: 24, backgroundColor: '#A46E56', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  awning: { width: 84, height: 10, backgroundColor: colors.dalgubeol, borderRadius: 3 },
  trunk: { position: 'absolute', left: 32, bottom: 45, width: 6, height: 43, backgroundColor: '#9A7D59' },
  tree: { position: 'absolute', left: 15, bottom: 68, width: 40, height: 57, borderRadius: 22, backgroundColor: colors.forest },
  pin: { position: 'absolute', top: 4, left: '44%', width: 41, height: 46, borderRadius: 20, borderBottomLeftRadius: 4, backgroundColor: colors.sky, transform: [{ rotate: '-12deg' }], alignItems: 'center', justifyContent: 'center' },
  pinText: { color: '#FFFFFF', fontSize: 22 },
  note: { position: 'absolute', bottom: 9, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20 },
  dot: { width: 6, height: 6, backgroundColor: '#377B61', borderRadius: 3 },
  noteText: { fontSize: 11, color: '#466456', fontWeight: '600' },
});
