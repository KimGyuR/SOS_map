import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './theme/appStyles';
import { useAppModel } from './hooks/useAppModel';
import BottomNavigation from './components/BottomNavigation';
import LoginScreen from './screens/LoginScreen';
import MapScreen from './screens/MapScreen';
import ComplaintListScreen from './screens/ComplaintListScreen';
import FestivalScreen from './screens/FestivalScreen';
import ProfileScreen from './screens/ProfileScreen';
import ComplaintDetailModal from './screens/ComplaintDetailModal';
import ReportComposer from './screens/ReportComposer';

export default function SosApp() {
  const insets = useSafeAreaInsets();
  const model = useAppModel();
  const { isAuthenticated, activeScreen } = model;
  return (
    <View style={[styles.appRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />
      {isAuthenticated ? (
        <>
          <View style={styles.mainContent}>
            {activeScreen === 'map' ? <MapScreen {...model} /> : null}
            {activeScreen === 'list' ? <ComplaintListScreen {...model} /> : null}
            {activeScreen === 'festival' ? <FestivalScreen {...model} /> : null}
            {activeScreen === 'mypage' ? <ProfileScreen {...model} /> : null}
          </View>
          <BottomNavigation activeScreen={activeScreen} navigateToScreen={model.navigateToScreen} />
          <ComplaintDetailModal {...model} />
          <ReportComposer {...model} />
        </>
      ) : <LoginScreen {...model} />}
    </View>
  );
}
