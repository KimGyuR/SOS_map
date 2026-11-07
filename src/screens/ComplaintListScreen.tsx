
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { AREAS } from '../domain/catalog';
import type { ComplaintStatus } from '../domain/types';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import SectionTitle from '../components/SectionTitle';
import ComplaintCard from '../components/ComplaintCard';
import type { AppModel } from '../hooks/useAppModel';

type Props = Pick<
  AppModel,
  | 'filterArea'
  | 'setFilterArea'
  | 'statusFilter'
  | 'setStatusFilter'
  | 'sortBy'
  | 'setSortBy'
  | 'serverListComplaints'
  | 'serverListLikedIds'
  | 'listTotalElements'
  | 'listHasNext'
  | 'listLoading'
  | 'listError'
  | 'listPage'
  | 'setListPage'
  | 'selectServerComplaint'
>;

type StatusFilter = 'all' | ComplaintStatus;
type SortBy = 'latest' | 'empathy';

const STATUS_FILTERS: {
  id: StatusFilter;
  label: string;
}[] = [
  { id: 'all', label: '전체 상태' },
  { id: '접수', label: '접수' },
  { id: '처리 중', label: '처리 중' },
  { id: '해결 완료', label: '해결 완료' },
];

const SORT_OPTIONS: {
  id: SortBy;
  label: string;
}[] = [
  { id: 'latest', label: '최신순' },
  { id: 'empathy', label: '공감순' },
];

export default function ComplaintListScreen({
  filterArea,
  setFilterArea,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  serverListComplaints,
  serverListLikedIds,
  listTotalElements,
  listHasNext,
  listLoading,
  listError,
  listPage,
  setListPage,
  selectServerComplaint,
}: Props) {
  return (
    <ScrollView
      style={styles.pageScroll}
      contentContainerStyle={styles.pageContent}
    >
      {/* 전체 민원 개수 */}
      <SectionTitle detail={`${listTotalElements}건`}>
        불편사항 목록
      </SectionTitle>

      <Text style={styles.pageDescription}>
        우리 동네에 등록된 문제를 확인하고 함께 해결해요.
      </Text>

      {/* 지역 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {[
          { id: 'all' as const, label: '전체 지역' },
          ...AREAS.map((area) => ({
            id: area,
            label: area,
          })),
        ].map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setFilterArea(item.id)}
            style={[
              styles.filterChip,
              filterArea === item.id && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                filterArea === item.id &&
                  styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 민원 처리 상태 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {STATUS_FILTERS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setStatusFilter(item.id)}
            style={[
              styles.filterChip,
              statusFilter === item.id &&
                styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === item.id &&
                  styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 정렬 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {SORT_OPTIONS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setSortBy(item.id)}
            style={[
              styles.filterChip,
              sortBy === item.id &&
                styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                sortBy === item.id &&
                  styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 서버 조회 중 */}
      {listLoading ? (
        <View style={{ paddingVertical: 24 }}>
          <ActivityIndicator
            size="small"
            color={colors.sky}
          />

          <Text style={styles.emptyText}>
            민원 목록을 불러오는 중...
          </Text>
        </View>
      ) : listError ? (
        // 서버 조회 실패
        <Text style={styles.emptyText}>
          민원 목록을 불러오지 못했어요: {listError}
        </Text>
      ) : serverListComplaints.length > 0 ? (
        // API #7 서버 민원 목록
        serverListComplaints.map((item) => (
          <ComplaintCard
            key={item.id}
            item={item}
            liked={serverListLikedIds.has(item.id)}

            // API #8 민원 상세 조회
            onSelect={selectServerComplaint}

            // API #12·#13 연결 전까지 공감 변경 비활성화
            onToggleLike={() => undefined}
          />
        ))
      ) : (
        <Text style={styles.emptyText}>
          등록된 민원이 없어요.
        </Text>
      )}

      {/* 페이지네이션 */}
      {!listLoading && !listError && listTotalElements > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 페이지"
            disabled={listPage === 0}
            onPress={() =>
              setListPage((page) => Math.max(0, page - 1))
            }
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: '#EEF2F6',
              opacity: listPage === 0 ? 0.4 : 1,
            }}
          >
            <Text style={{ color: '#334155', fontWeight: '600' }}>
              이전
            </Text>
          </Pressable>

          <Text style={{ color: '#334155', fontWeight: '600' }}>
            {listPage + 1} 페이지
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 페이지"
            disabled={!listHasNext}
            onPress={() => setListPage((page) => page + 1)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: '#EEF2F6',
              opacity: listHasNext ? 1 : 0.4,
            }}
          >
            <Text style={{ color: '#334155', fontWeight: '600' }}>
              다음
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
