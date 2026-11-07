
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type {
  AreaId,
  Complaint,
  ComplaintStatus,
  Screen,
} from '../domain/types';
import { isWithinRegion } from '../domain/complaintState';
import { getCategory } from '../domain/catalog';
import { getMyPage } from '../api/users';
import {
  getNearbyComplaints,
  getComplaintDetail,
  getComplaints,
} from '../api/complaints';
import type { ComplaintDetail, MyPage } from '../api/mappers';
import { useAuthSession } from './useAuthSession';
import { useUserLocation } from './useUserLocation';
import { useComplaints } from './useComplaints';
import { useReportComposer } from './useReportComposer';

type StatusFilter = 'all' | ComplaintStatus;
type SortBy = 'latest' | 'empathy';

const LIST_PAGE_SIZE = 10;

/** Coordinates feature hooks; UI components receive only the fields they use. */
export function useAppModel() {
  const router = useRouter();
  const { screen } = useLocalSearchParams<{ screen?: string }>();

  const activeScreen: Screen =
    screen === 'list' || screen === 'festival' || screen === 'mypage'
      ? screen
      : 'map';

  const auth = useAuthSession();
  const location = useUserLocation();
  const store = useComplaints();

  const { isAuthenticated } = auth;
  const { locateUser } = location;

  // API #7: 목록 검색 조건
  const [filterArea, setFilterArea] = useState<AreaId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('latest');
  const [listPage, setListPage] = useState(0);

  // API #5: 마이페이지
  const [myPage, setMyPage] = useState<MyPage | null>(null);
  const [myPageLoading, setMyPageLoading] = useState(false);
  const [myPageError, setMyPageError] = useState('');

  // API #6: 지도 주변 민원
  const [serverNearbyComplaints, setServerNearbyComplaints] =
    useState<Complaint[]>([]);
  const [serverNearbyLikedIds, setServerNearbyLikedIds] =
    useState<Set<string>>(new Set());
  const [nearbyTotalCount, setNearbyTotalCount] = useState(0);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');

  // API #7: 전체 민원 목록
  const [serverListComplaints, setServerListComplaints] =
    useState<Complaint[]>([]);
  const [serverListLikedIds, setServerListLikedIds] =
    useState<Set<string>>(new Set());
  const [listTotalElements, setListTotalElements] = useState(0);
  const [listHasNext, setListHasNext] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // API #8: 민원 상세
  const [serverSelectedComplaint, setServerSelectedComplaint] =
    useState<ComplaintDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const detailController = useRef<AbortController | null>(null);
  const detailRequestId = useRef(0);

  // 로그인 후 현재 위치 조회
  useEffect(() => {
    if (isAuthenticated) void locateUser();
  }, [isAuthenticated, locateUser]);

  // API #5: 마이페이지 조회
  useEffect(() => {
    if (!isAuthenticated || activeScreen !== 'mypage') return;

    const controller = new AbortController();
    let cancelled = false;

    async function loadMyPage() {
      setMyPage(null);
      setMyPageLoading(true);
      setMyPageError('');

      try {
        const result = await getMyPage(controller.signal);
        if (!cancelled) setMyPage(result);
      } catch (error) {
        if (!cancelled) {
          setMyPageError(
            error instanceof Error
              ? error.message
              : '마이페이지 정보를 불러오지 못했어요.',
          );
        }
      } finally {
        if (!cancelled) setMyPageLoading(false);
      }
    }

    void loadMyPage();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isAuthenticated, activeScreen]);

  // API #6: 지도 주변 민원 조회
  useEffect(() => {
    if (!isAuthenticated || activeScreen !== 'map') return;

    const controller = new AbortController();
    let cancelled = false;

    const timeout = setTimeout(() => {
      async function loadNearbyComplaints() {
        setNearbyLoading(true);
        setNearbyError('');

        try {
          const result = await getNearbyComplaints(location.region, {
            signal: controller.signal,
          });

          if (!cancelled) {
            setServerNearbyComplaints(result.complaints);
            setServerNearbyLikedIds(result.likedIds);
            setNearbyTotalCount(result.totalCount);
          }
        } catch (error) {
          if (!cancelled) {
            setNearbyError(
              error instanceof Error
                ? error.message
                : '주변 민원을 불러오지 못했어요.',
            );
          }
        } finally {
          if (!cancelled) setNearbyLoading(false);
        }
      }

      void loadNearbyComplaints();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [isAuthenticated, activeScreen, location.region]);

  // API #7: 전체 민원 목록 조회
  useEffect(() => {
    if (!isAuthenticated || activeScreen !== 'list') return;

    const controller = new AbortController();
    let cancelled = false;

    async function loadComplaintList() {
      setListLoading(true);
      setListError('');

      // 이전 필터의 데이터가 현재 필터 결과처럼 보이지 않도록 초기화
      setServerListComplaints([]);
      setServerListLikedIds(new Set());
      setListTotalElements(0);
      setListHasNext(false);

      try {
        const result = await getComplaints(
          {
            area: filterArea,
            status: statusFilter === 'all' ? undefined : statusFilter,
            sort: sortBy,
            page: listPage,
            size: LIST_PAGE_SIZE,
          },
          controller.signal,
        );

        if (!cancelled) {
          setServerListComplaints(result.complaints);
          setServerListLikedIds(result.likedIds);
          setListTotalElements(result.totalElements);
          setListHasNext(result.hasNext);
        }
      } catch (error) {
        if (!cancelled) {
          setListError(
            error instanceof Error
              ? error.message
              : '민원 목록을 불러오지 못했어요.',
          );
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }

    void loadComplaintList();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    isAuthenticated,
    activeScreen,
    filterArea,
    statusFilter,
    sortBy,
    listPage,
  ]);

  // 지역 변경 시 첫 페이지부터 다시 조회
  function changeFilterArea(area: AreaId | 'all') {
    setFilterArea(area);
    setListPage(0);
  }

  // 상태 변경 시 첫 페이지부터 다시 조회
  function changeStatusFilter(status: StatusFilter) {
    setStatusFilter(status);
    setListPage(0);
  }

  // 정렬 변경 시 첫 페이지부터 다시 조회
  function changeSortBy(sort: SortBy) {
    setSortBy(sort);
    setListPage(0);
  }

  // API #8: 상세 요청 취소 및 초기화
  function clearServerSelection() {
    detailRequestId.current += 1;
    detailController.current?.abort();
    detailController.current = null;

    setServerSelectedComplaint(null);
    setDetailLoading(false);
    setDetailError('');
  }

  // API #8: 서버 민원 상세 조회
  async function selectServerComplaintById(id: string) {
    clearServerSelection();
    store.setSelectedComplaint(null);

    const controller = new AbortController();
    detailController.current = controller;

    const requestId = detailRequestId.current;

    setDetailLoading(true);

    try {
      const result = await getComplaintDetail(id, controller.signal);

      if (detailRequestId.current === requestId) {
        setServerSelectedComplaint(result);
      }
    } catch (error) {
      if (
        detailRequestId.current === requestId &&
        !controller.signal.aborted
      ) {
        setDetailError(
          error instanceof Error
            ? error.message
            : '민원 상세 정보를 불러오지 못했어요.',
        );
      }
    } finally {
      if (detailRequestId.current === requestId) {
        setDetailLoading(false);
        detailController.current = null;
      }
    }
  }

  function selectServerComplaint(item: Complaint) {
    void selectServerComplaintById(item.id);
  }

  function setSelectedComplaint(item: Complaint | null) {
    if (item === null) {
      clearServerSelection();
      store.setSelectedComplaint(null);
      return;
    }

    if (item.isSample) {
      clearServerSelection();
      store.setSelectedComplaint(item);
      return;
    }

    void selectServerComplaintById(item.id);
  }

  // 서버 민원 지도 마커 변환
  const serverMapComplaints = useMemo(
    () =>
      serverNearbyComplaints.map((item) => {
        const category = getCategory(item.category);

        return {
          id: item.id,
          title: item.title,
          coordinate: {
            latitude: item.latitude,
            longitude: item.longitude,
          },
          icon: category.icon,
          color: category.color,
        };
      }),
    [serverNearbyComplaints],
  );

  function navigateToScreen(next: Screen) {
    router.setParams({ screen: next });
    setSelectedComplaint(null);
  }

  function onSubmit(complaint: Complaint) {
    store.addComplaint(complaint);
    changeFilterArea('all');

    navigateToScreen(
      complaint.category === 'festival' ? 'festival' : 'map',
    );
  }

  const composer = useReportComposer({ ...location, onSubmit });

  function openComposer(forFestival = false) {
    setSelectedComplaint(null);
    composer.openComposer(forFestival);
  }

  async function signOut() {
    if (await auth.signOut()) {
      clearServerSelection();

      setMyPage(null);
      setMyPageError('');
      setMyPageLoading(false);

      setServerNearbyComplaints([]);
      setServerNearbyLikedIds(new Set());
      setNearbyTotalCount(0);
      setNearbyError('');
      setNearbyLoading(false);

      setServerListComplaints([]);
      setServerListLikedIds(new Set());
      setListTotalElements(0);
      setListHasNext(false);
      setListError('');
      setListLoading(false);
      setListPage(0);

      store.setSelectedComplaint(null);
      composer.setComposerOpen(false);
    }
  }

  // 기존 로컬 민원 데이터 (축제 등 기존 화면 호환)
  const visibleComplaints = useMemo(
    () =>
      store.complaints.filter(
        (item) =>
          (activeScreen !== 'festival' ||
            item.category === 'festival') &&
          (filterArea === 'all' || item.area === filterArea),
      ),
    [store.complaints, activeScreen, filterArea],
  );

  const nearbyComplaints = useMemo(
    () =>
      store.complaints.filter((item) =>
        isWithinRegion(item, location.region),
      ),
    [store.complaints, location.region],
  );

  const selectedComplaint =
    serverSelectedComplaint ?? store.selectedComplaint;

  return {
    ...auth,
    ...location,
    ...store,
    ...composer,

    activeScreen,
    filterArea,
    setFilterArea: changeFilterArea,
    visibleComplaints,
    nearbyComplaints,

    navigateToScreen,
    openComposer,
    signOut,

    selectedComplaint,
    setSelectedComplaint,

    // API #5
    myPage,
    myPageLoading,
    myPageError,

    // API #6
    serverNearbyComplaints,
    serverNearbyLikedIds,
    serverMapComplaints,
    nearbyTotalCount,
    nearbyLoading,
    nearbyError,

    // API #7
    serverListComplaints,
    serverListLikedIds,
    listTotalElements,
    listHasNext,
    listLoading,
    listError,
    listPage,
    setListPage,
    statusFilter,
    setStatusFilter: changeStatusFilter,
    sortBy,
    setSortBy: changeSortBy,

    // API #8
    serverSelectedComplaint,
    selectServerComplaint,
    selectServerComplaintById,
    detailLoading,
    detailError,
  };
}

export type AppModel = ReturnType<typeof useAppModel>;
