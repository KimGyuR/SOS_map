
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
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
  likeComplaint,
  unlikeComplaint,
  previewComplaint,
  updateComplaint,
  deleteComplaint,
  type ComplaintUpdateInput,
} from '../api/complaints';
import type { ComplaintDetail, MyPage } from '../api/mappers';
import { useAuthSession } from './useAuthSession';
import { useUserLocation } from './useUserLocation';
import { useComplaints } from './useComplaints';
import { useReportComposer } from './useReportComposer';
import type { ComplaintEditChanges } from '../screens/ComplaintEditModal';
import { uploadImage, deleteImage } from '../api/images';
import { getFestivals, type ServerFestival } from '../api/festivals';

type StatusFilter = 'all' | ComplaintStatus;
type SortBy = 'latest' | 'empathy';

const LIST_PAGE_SIZE = 10;

/** 앱의 API 데이터, 화면 이동 및 상태를 통합 관리 */
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

  // 서버 저장 성공 시 지도/목록/축제/마이페이지 재조회
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const pendingMutations = useRef(new Set<string>());
  // 조회 응답 지연 중에도 수정/삭제한 민원이 다시 나타나지 않도록 보정
  const editedOverrides = useRef(new Map<string, Complaint>());
  const deletedIds = useRef(new Set<string>());
  const [mutationVersion, setMutationVersion] = useState(0);

  const [serverFestivals, setServerFestivals] = useState<ServerFestival[]>([]);
  const [festivalsLoading, setFestivalsLoading] = useState(false);
  const [festivalsError, setFestivalsError] = useState('');
  const [festivalComplaints, setFestivalComplaints] = useState<Complaint[]>([]);
  const [festivalLikedIds, setFestivalLikedIds] = useState<Set<string>>(new Set());

  const mergeServerChanges = (items: Complaint[]) =>
    items.filter((item) => !deletedIds.current.has(item.id))
      .map((item) => editedOverrides.current.get(item.id) ?? item);

  // 마이페이지 재조회 중에도 공감 상태가 이전 값으로 되돌아가지 않도록
  // 최근 서버 응답에 공감 등록·취소 결과를 덮어씌운다.
  function applyMyPageEmpathy(page: MyPage): MyPage {
    const likedIds = new Set(page.likedIds);
    let empathyCountDifference = 0;
    const recentComplaints = page.recentComplaints.map((item) => {
      const latest = empathyOverrides.current.get(item.id);
      if (!latest) return item;

      if (latest.liked) likedIds.add(item.id);
      else likedIds.delete(item.id);

      // 늦게 도착한 마이페이지 응답에도 최신 공감 수를 적용한다.
      // '받은 공감'은 내 민원의 공감 수를 합산한 통계다.
      empathyCountDifference += latest.likeCount - item.likeCount;
      return { ...item, likeCount: latest.likeCount };
    });

    return {
      ...page,
      likedIds,
      recentComplaints,
      stats: {
        ...page.stats,
        receivedEmpathyCount: Math.max(
          0,
          page.stats.receivedEmpathyCount + empathyCountDifference,
        ),
      },
    };
  }

  // API #16: 서버 축제 목록 (샘플 목록을 서버 데이터로 위장하지 않음)
  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    let cancelled = false;
    async function loadFestivals() {
      setFestivalsLoading(true);
      setFestivalsError('');
      try {
        const result = await getFestivals(controller.signal);
        if (!cancelled) setServerFestivals(result);
      } catch (error) {
        if (!cancelled) {
          setServerFestivals([]);
          setFestivalsError(error instanceof Error ? error.message : '축제 목록 조회에 실패했어요.');
        }
      } finally {
        if (!cancelled) setFestivalsLoading(false);
      }
    }
    void loadFestivals();
    return () => { cancelled = true; controller.abort(); };
  }, [isAuthenticated]);

  // 축제 페이지의 민원도 샘플이 아닌 서버 API #7에서 조회
  useEffect(() => {
    if (!isAuthenticated || activeScreen !== 'festival') return;
    const controller = new AbortController();
    let cancelled = false;
    async function loadFestivalComplaints() {
      try {
        const result = await getComplaints({ category: 'festival', size: 100 }, controller.signal);
        if (!cancelled) {
          setFestivalComplaints(mergeServerChanges(result.complaints));
          setFestivalLikedIds(result.likedIds);
        }
      } catch (error) {
        if (!cancelled) console.warn('축제 민원 목록 조회 실패:', error);
      }
    }
    void loadFestivalComplaints();
    return () => { cancelled = true; controller.abort(); };
  }, [isAuthenticated, activeScreen, dataRefreshKey]);

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

  // API #12·#13: 공감 중복 요청 방지
  const pendingLikes = useRef(new Set<string>());

  // 공감 처리 후 화면 간 상태 일치를 위한 최신 서버 값
  const empathyOverrides = useRef(
    new Map<string, { liked: boolean; likeCount: number }>(),
  );

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
        if (!cancelled) setMyPage(applyMyPageEmpathy(result));
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
  }, [isAuthenticated, activeScreen, dataRefreshKey]);

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
            const complaints = result.complaints.map((item) => {
              const override = empathyOverrides.current.get(item.id);
              return override
                ? { ...item, likeCount: override.likeCount }
                : item;
            });

            const likedIds = new Set(result.likedIds);

            for (const item of complaints) {
              const override = empathyOverrides.current.get(item.id);
              if (!override) continue;

              if (override.liked) likedIds.add(item.id);
              else likedIds.delete(item.id);
            }

            setServerNearbyComplaints(mergeServerChanges(complaints));
            setServerNearbyLikedIds(likedIds);
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
  }, [isAuthenticated, activeScreen, location.region, dataRefreshKey]);

  // API #7: 전체 민원 목록 조회
  useEffect(() => {
    if (!isAuthenticated || activeScreen !== 'list') return;

    const controller = new AbortController();
    let cancelled = false;

    async function loadComplaintList() {
      setListLoading(true);
      setListError('');

      // 이전 필터 결과가 잠시 보이지 않도록 초기화
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
          const complaints = result.complaints.map((item) => {
            const override = empathyOverrides.current.get(item.id);
            return override
              ? { ...item, likeCount: override.likeCount }
              : item;
          });

          const likedIds = new Set(result.likedIds);

          for (const item of complaints) {
            const override = empathyOverrides.current.get(item.id);
            if (!override) continue;

            if (override.liked) likedIds.add(item.id);
            else likedIds.delete(item.id);
          }

          setServerListComplaints(mergeServerChanges(complaints));
          setServerListLikedIds(likedIds);
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
    dataRefreshKey,
  ]);

  // 지역 변경 시 첫 페이지부터 조회
  function changeFilterArea(area: AreaId | 'all') {
    setFilterArea(area);
    setListPage(0);
  }

  // 상태 변경 시 첫 페이지부터 조회
  function changeStatusFilter(status: StatusFilter) {
    setStatusFilter(status);
    setListPage(0);
  }

  // 정렬 변경 시 첫 페이지부터 조회
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
        const override = empathyOverrides.current.get(id);
        if (deletedIds.current.has(id)) return;

        setServerSelectedComplaint(
          override
            ? {
                ...result,
                liked: override.liked,
                likeCount: override.likeCount,
              }
            : result,
        );
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

  // API #12·#13: 서버 민원 공감 등록 및 취소
  async function toggleServerLike(id: string) {
    // 동일 민원에 대해 요청이 진행 중이면 무시
    if (pendingLikes.current.has(id)) return;

    // 최신 공감 상태를 우선 확인
    const override = empathyOverrides.current.get(id);

    const liked =
      override?.liked ??
      (serverSelectedComplaint?.id === id
        ? serverSelectedComplaint.liked
        : serverNearbyLikedIds.has(id) ||
          serverListLikedIds.has(id) ||
          festivalLikedIds.has(id) ||
          (myPage?.likedIds.has(id) ?? false));

    pendingLikes.current.add(id);

    try {
      // 공감 여부에 따라 POST 또는 DELETE 호출
      const result = liked
        ? await unlikeComplaint(id)
        : await likeComplaint(id);

      // 서버 응답을 최신 상태로 보관
      empathyOverrides.current.set(id, {
        liked: result.liked,
        likeCount: result.likeCount,
      });

      // 공감 ID Set 변경
      const updateLikedIds = (previous: Set<string>) => {
        const next = new Set(previous);

        if (result.liked) next.add(id);
        else next.delete(id);

        return next;
      };

      setServerNearbyLikedIds(updateLikedIds);
      setServerListLikedIds(updateLikedIds);
      setFestivalLikedIds(updateLikedIds);

      // 지도·목록의 공감 수 갱신
      const updateComplaints = (previous: Complaint[]) =>
        previous.map((item) =>
          item.id === id
            ? { ...item, likeCount: result.likeCount }
            : item,
        );

      setServerNearbyComplaints(updateComplaints);
      setServerListComplaints(updateComplaints);
      setFestivalComplaints(updateComplaints);

      // 마이페이지 카드뿐 아니라 상단 '받은 공감' 통계도 즉시 갱신한다.
      setMyPage((previous) => {
        if (!previous) return previous;

        const previousComplaint = previous.recentComplaints.find(
          (item) => item.id === id,
        );
        // 내가 등록한 민원이 마이페이지에 있을 때만 받은 공감 통계에 반영한다.
        const difference = previousComplaint
          ? result.likeCount - previousComplaint.likeCount
          : 0;

        return {
          ...previous,
          likedIds: updateLikedIds(previous.likedIds),
          recentComplaints: updateComplaints(previous.recentComplaints),
          stats: {
            ...previous.stats,
            receivedEmpathyCount: Math.max(
              0,
              previous.stats.receivedEmpathyCount + difference,
            ),
          },
        };
      });

      // 상세 화면의 공감 여부 및 수 갱신
      setServerSelectedComplaint((previous) =>
        previous?.id === id
          ? {
              ...previous,
              liked: result.liked,
              likeCount: result.likeCount,
            }
          : previous,
      );
    } catch (error) {
      Alert.alert(
        '공감 처리 실패',
        error instanceof Error
          ? error.message
          : '공감 상태를 변경하지 못했어요.',
      );
    } finally {
      pendingLikes.current.delete(id);
    }
  }

  // API #17: 변경한 필드만 PATCH, 저장 성공한 경우에만 화면 갱신
  async function onSaveEdit(id: string, changes: ComplaintEditChanges): Promise<void> {
    if (pendingMutations.current.has(id)) throw new Error('이미 저장 처리 중이에요.');
    const detail = serverSelectedComplaint;
    if (!detail || detail.id !== id || !detail.mine || detail.status !== '접수') {
      throw new Error('수정 가능한 본인 민원 상세정보가 없어요.');
    }
    pendingMutations.current.add(id);
    let uploadedImageId: number | null = null;
    let previewCompleted = false;
    try {
      const input: ComplaintUpdateInput = {};
      if (changes.title !== undefined) input.title = changes.title;
      if (changes.description !== undefined) input.description = changes.description;
      if (changes.address !== undefined) input.address = changes.address;
      if (changes.category !== undefined) input.category = changes.category;

      const category = changes.category ?? detail.category;
      const festivalName = changes.festival ?? (category === 'festival' ? detail.festival : undefined);
      const festival = serverFestivals.find((item) => item.name === festivalName);
      if (category === 'festival' && !festival && (changes.category || changes.festival)) {
        throw new Error('서버에 등록된 축제를 선택해 주세요.');
      }
      if (changes.festival !== undefined || changes.category !== undefined) {
        input.festivalId = category === 'festival'
          ? festival?.id ?? detail.festivalId ?? null
          : null;
      }

      if (changes.photoUri) {
        // 새 사진도 AI 미리보기를 거쳐 얼굴이 가려진 이미지 ID만 연결
        const uploaded = await uploadImage(changes.photoUri);
        uploadedImageId = uploaded.imageId;
        const preview = await previewComplaint({
          imageId: uploaded.imageId,
          category,
          title: changes.title ?? detail.title,
          description: changes.description ?? detail.description,
          address: changes.address ?? detail.address,
          latitude: detail.latitude,
          longitude: detail.longitude,
          festivalId: category === 'festival' ? festival?.id ?? detail.festivalId ?? null : null,
        });
        if (preview.contentCheck?.passed === false) {
          throw new Error(preview.contentCheck.feedback || '민원 내용을 다시 확인해 주세요.');
        }
        previewCompleted = true;
        input.imageId = preview.image.blurredImageId;
        input.privacyCheck = changes.privacyCheck;
      }

      const updated = await updateComplaint(id, input);
      editedOverrides.current.set(id, updated);
      setServerSelectedComplaint(updated);
      const applyUpdated = (items: Complaint[]) =>
        items.map((item) => item.id === id ? updated : item);
      setServerNearbyComplaints(applyUpdated);
      setServerListComplaints(applyUpdated);
      setFestivalComplaints(applyUpdated);
      setMutationVersion((v) => v + 1);
      setDataRefreshKey((v) => v + 1);
    } catch (error) {
      // 미리보기도 실패했다면, 민원에 연결되지 않은 원본 업로드를 정리한다.
      // 블러 이미지가 생성된 이후에는 서버 연관관계가 확실하지 않아 자동 삭제하지 않는다.
      if (uploadedImageId !== null && !previewCompleted) {
        try { await deleteImage(uploadedImageId); }
        catch (cleanupError) { console.warn('임시 이미지 정리 실패:', cleanupError); }
      }
      throw error;
    } finally {
      pendingMutations.current.delete(id);
    }
  }

  // API #18: 삭제 완료 응답 전에는 앱에서 민원을 제거하지 않는다.
  async function onDelete(id: string): Promise<void> {
    if (pendingMutations.current.has(id)) throw new Error('이미 처리 중이에요.');
    if (serverSelectedComplaint?.id !== id || !serverSelectedComplaint.mine ||
        serverSelectedComplaint.status !== '접수') {
      throw new Error('삭제 가능한 본인 민원이 아니에요.');
    }
    pendingMutations.current.add(id);
    try {
      await deleteComplaint(id);
      deletedIds.current.add(id);
      editedOverrides.current.delete(id);
      empathyOverrides.current.delete(id);
      const remove = (items: Complaint[]) => items.filter((item) => item.id !== id);
      setServerNearbyComplaints(remove);
      setServerListComplaints(remove);
      setFestivalComplaints(remove);
      const removeLike = (previous: Set<string>) => {
        const next = new Set(previous); next.delete(id); return next;
      };
      setServerNearbyLikedIds(removeLike);
      setServerListLikedIds(removeLike);
      setFestivalLikedIds(removeLike);
      setSelectedComplaint(null);
      setMutationVersion((v) => v + 1);
      setDataRefreshKey((v) => v + 1);
    } finally {
      pendingMutations.current.delete(id);
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
    setDataRefreshKey((v) => v + 1);
    changeFilterArea('all');

    navigateToScreen(
      complaint.category === 'festival' ? 'festival' : 'map',
    );
  }

  const composer = useReportComposer({ ...location, onSubmit, festivals: serverFestivals });

  function openComposer(forFestival = false) {
    setSelectedComplaint(null);
    composer.openComposer(forFestival);
  }

  async function signOut() {
    if (await auth.signOut()) {
      clearServerSelection();

      // 이전 계정의 공감 기록 제거
      pendingLikes.current.clear();
      empathyOverrides.current.clear();
      pendingMutations.current.clear();
      editedOverrides.current.clear();
      deletedIds.current.clear();
      setMutationVersion((v) => v + 1);
      setServerFestivals([]);
      setFestivalsError('');
      setFestivalComplaints([]);
      setFestivalLikedIds(new Set());

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

  // 기존 로컬 임시 데이터에도 서버 수정·삭제를 반영한다.
  const visibleComplaints = useMemo(
    () => mergeServerChanges(store.complaints).filter(
      (item) => (activeScreen !== 'festival' || item.category === 'festival') &&
        (filterArea === 'all' || item.area === filterArea),
    ),
    [store.complaints, activeScreen, filterArea, mutationVersion],
  );

  const nearbyComplaints = useMemo(
    () => mergeServerChanges(store.complaints).filter((item) =>
      isWithinRegion(item, location.region),
    ),
    [store.complaints, location.region, mutationVersion],
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

    // API #12·#13
    toggleServerLike,

    // API #16: 서버 축제 조회
    serverFestivals,
    festivalsLoading,
    festivalsError,
    festivalComplaints,
    festivalLikedIds,

    // API #17·#18: 서버 민원 수정 및 삭제
    onSaveEdit,
    onDelete,
  };
}

export type AppModel = ReturnType<typeof useAppModel>;
