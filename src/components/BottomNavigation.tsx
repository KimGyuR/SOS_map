import { Pressable, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import AppIcon from '../components/AppIcon';
import type { AppModel } from '../hooks/useAppModel';

export default function BottomNavigation({ activeScreen, navigateToScreen }: Pick<AppModel, 'activeScreen' | 'navigateToScreen'>) {
  return (<View style={styles.tabBar}>
    {([
      ['map', 'map', '지도'],
      ['list', 'list', '목록'],
      ['festival', 'festival', '축제'],
      ['mypage', 'user', '마이'],
    ] as const).map(([screen, icon, label]) => (
      <Pressable
        key={screen}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeScreen === screen }}
        style={[styles.tabItem, activeScreen === screen && styles.tabItemActive]}
        onPress={() => navigateToScreen(screen)}
      >
        <AppIcon name={icon} color={activeScreen === screen ? colors.sky : colors.muted} />
        <Text style={[styles.tabLabel, activeScreen === screen && styles.tabLabelActive]}>{label}</Text>
      </Pressable>
    ))}
  </View>);
}
