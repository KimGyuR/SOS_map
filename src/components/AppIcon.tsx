import Svg, { Path } from 'react-native-svg';
import { Platform } from 'react-native';
import { colors } from '../theme/colors';

export const iconPaths = {
  map: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5z M9 3v16 M15 5v16',
  list: 'M9 5h12 M9 12h12 M9 19h12 M3 5h1 M3 12h1 M3 19h1',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1114 0z M14 10a2 2 0 11-4 0 2 2 0 014 0',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0 M4 21v-2a8 8 0 0116 0v2',
  locate: 'M19 12a7 7 0 11-14 0 7 7 0 0114 0 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M14 12a2 2 0 11-4 0 2 2 0 014 0',
  refresh: 'M20 7a9 9 0 10.5 9 M20 3v5h-5',
  road: 'M7 3L3 21 M17 3l4 18 M12 3v4 M12 10v4 M12 17v4',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  streetlight: 'M9 17h6 M10 21h4 M8 13a6 6 0 118 0l-1 4H9l-1-4',
  parking: 'M5 10l2-6h10l2 6 M3 11h18v7H3z M5 18v3 M19 18v3 M6 14h2 M16 14h2',
  noise: 'M3 9h4l5-5v16l-5-5H3V9z M16 8a6 6 0 010 8 M19 4a11 11 0 010 16',
  animal: 'M7 21c-5 0-4-6-1-7l6-3 6 3c3 1 4 7-1 7l-5-2-5 2z M6 7a2 3 0 11-4 0 2 3 0 014 0 M11 4a2 3 0 11-4 0 2 3 0 014 0 M17 4a2 3 0 11-4 0 2 3 0 014 0 M22 7a2 3 0 11-4 0 2 3 0 014 0',
  festival: 'M12 2v4 M12 2h5l-2 2h-3 M3 13l9-7 9 7H3z M5 13v8h14v-8 M9 21l3-8 3 8',
  camera: 'M3 7h4l2-3h6l2 3h4v14H3V7z M16 13a4 4 0 11-8 0 4 4 0 018 0',
  image: 'M3 3h18v18H3V3z M3 17l6-6 4 4 3-3 5 5 M9 7h.01',
  heart: 'M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-5 4 0 10 8 17 8-7 13-13 8-17z',
  plus: 'M12 4v16 M4 12h16', check: 'M4 12l5 5L20 6', close: 'M5 5l14 14 M19 5L5 19',
  back: 'M15 4l-8 8 8 8', spark: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z',
} as const;
export type IconName = keyof typeof iconPaths;
export default function AppIcon({ name, size = 22, color = colors.dalgubeol, filled = false }: { name: IconName; size?: number; color?: string; filled?: boolean }) {
  const decorativeProps = Platform.OS === 'web'
    ? { 'aria-hidden': true as const, focusable: false }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...decorativeProps}><Path d={iconPaths[name]} /></Svg>;
}
