import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { AreaId, Complaint, Screen } from '../domain/types';
import { isWithinRegion } from '../domain/complaintState';
import { useAuthSession } from './useAuthSession';
import { useUserLocation } from './useUserLocation';
import { useComplaints } from './useComplaints';
import { useReportComposer } from './useReportComposer';

/** Coordinates feature hooks; UI components receive only the fields they use. */
export function useAppModel() {
  const router = useRouter();
  const { screen } = useLocalSearchParams<{ screen?: string; }>();
  const activeScreen: Screen = screen === 'list' || screen === 'festival' || screen === 'mypage' ? screen : 'map';
  const auth = useAuthSession();
  const location = useUserLocation();
  const store = useComplaints();
  const [filterArea, setFilterArea] = useState<AreaId | 'all'>('all');
  const { isAuthenticated } = auth;
  const { locateUser } = location;
  useEffect(() => {
    if (isAuthenticated) void locateUser();
  }, [isAuthenticated, locateUser]);

  function navigateToScreen(next: Screen) {
    router.setParams({ screen: next });
    store.setSelectedComplaint(null);
  }
  function onSubmit(complaint: Complaint) {
    store.addComplaint(complaint);
    setFilterArea('all');
    navigateToScreen(complaint.category === 'festival' ? 'festival' : 'map');
  }
  const composer = useReportComposer({ ...location, onSubmit });
  function openComposer(forFestival = false) {
    store.setSelectedComplaint(null);
    composer.openComposer(forFestival);
  }
  async function signOut() {
    if (await auth.signOut()) {
      store.setSelectedComplaint(null);
      composer.setComposerOpen(false);
    }
  }
  const visibleComplaints = useMemo(() => store.complaints.filter((item) =>
    (activeScreen !== 'festival' || item.category === 'festival') &&
    (filterArea === 'all' || item.area === filterArea)
  ), [store.complaints, activeScreen, filterArea]);
  const nearbyComplaints = useMemo(() => store.complaints.filter((item) => isWithinRegion(item, location.region)), [store.complaints, location.region]);

  return {
    ...auth, ...location, ...store, ...composer,
    activeScreen, filterArea, setFilterArea, visibleComplaints, nearbyComplaints,
    navigateToScreen, openComposer, signOut,
  };
}

export type AppModel = ReturnType<typeof useAppModel>;
