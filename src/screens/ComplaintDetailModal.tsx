
import { useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { getCategory } from '../domain/catalog';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import AppIcon from '../components/AppIcon';
import ActionButton from '../components/ActionButton';
import type { AppModel } from '../hooks/useAppModel';
import ComplaintEditModal from './ComplaintEditModal';
import type { ComplaintEditChanges } from './ComplaintEditModal';
import type { ComplaintDetail } from '../api/mappers';

type Props = Pick<
  AppModel,
  | 'category'
  | 'title'
  | 'description'
  | 'address'
  | 'likedComplaintIds'
  | 'toggleLike'
  | 'selectedComplaint'
  | 'setSelectedComplaint'
  | 'serverSelectedComplaint'
  | 'serverFestivals'
> & {
  onSaveEdit: (id: string, changes: ComplaintEditChanges) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export default function ComplaintDetailModal({
  likedComplaintIds,
  toggleLike,
  selectedComplaint,
  setSelectedComplaint,
  serverSelectedComplaint,
  serverFestivals,
  onSaveEdit,
  onDelete,
}: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!selectedComplaint) return null;

  const closeModal = () => {
    if (deleting) return;
    setConfirmingDelete(false);
    setDeleteError('');
    setImageFailed(false);
    setEditing(false);
    setSelectedComplaint(null);
  };

  // 서버 상세 데이터가 실제로 조회된 민원인지 확인
  const serverDetail: ComplaintDetail | null =
    serverSelectedComplaint?.id === selectedComplaint.id
      ? serverSelectedComplaint
      : null;

  // 서버가 확인한 본인 민원에만 수정·삭제 권한 부여
  const isMine = serverDetail?.mine === true;

  const canModify =
    isMine &&
    selectedComplaint.status === '접수' &&
    !deleting;

  // 서버 상세 응답의 사진·담당 부서·처리 기간 사용
  const imageUrl = serverDetail?.imageUrl;
  const itemCategory = getCategory(selectedComplaint.category);

  const agency = serverDetail?.agency || itemCategory.agency;
  const estimatedPeriod =
    serverDetail?.estimatedPeriod || itemCategory.estimate;

  const liked = serverDetail
    ? serverDetail.liked
    : likedComplaintIds.has(selectedComplaint.id);

  // 공감 기능은 서버 상세 모달보다 지도/목록의 공감 버튼에서 처리한다.
  const canToggleLike = !serverDetail;

  return (
    <>
      <Modal
        visible={!editing}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={closeModal}
        >
          <Pressable
            style={styles.detailSheet}
            onPress={() => undefined}
          >
            <View style={styles.sheetHandle} />

            {/* 민원 분류 및 상태 */}
            <View style={styles.detailCategoryRow}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: `${itemCategory.color}18` },
                ]}
              >
                <AppIcon
                  name={itemCategory.icon}
                  color={itemCategory.color}
                />
              </View>

              <View style={styles.complaintBody}>
                <View style={styles.cardMetaRow}>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: itemCategory.color },
                    ]}
                  >
                    {itemCategory.label}
                  </Text>

                  {selectedComplaint.isSample ? (
                    <Text style={styles.sampleTag}>데모</Text>
                  ) : null}
                </View>

                <Text style={styles.timeLabel}>
                  {selectedComplaint.createdAt}
                </Text>
              </View>

              <Text
                style={[
                  styles.statusText,
                  selectedComplaint.status === '해결 완료' &&
                    styles.statusDone,
                ]}
              >
                {selectedComplaint.status}
              </Text>
            </View>

            {/* 민원 사진 */}
            {imageUrl && !imageFailed ? (
              <Image
                accessibilityLabel="민원 사진"
                source={{ uri: imageUrl }}
                resizeMode="cover"
                onError={() => setImageFailed(true)}
                style={{
                  width: '100%',
                  height: 160,
                  borderRadius: 14,
                  marginTop: 14,
                  backgroundColor: '#EEF0F4',
                }}
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: 160,
                  borderRadius: 14,
                  marginTop: 14,
                  backgroundColor: '#EEF0F4',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppIcon name="pin" size={28} color="#9AA7B5" />

                <Text
                  style={[
                    styles.detailInfo,
                    { marginTop: 8, marginBottom: 0 },
                  ]}
                >
                  등록된 사진이 없어요
                </Text>
              </View>
            )}

            {/* 민원 상세 정보 */}
            <Text style={styles.detailTitle}>
              {selectedComplaint.title}
            </Text>

            <Text style={styles.detailInfo}>
              지역  ·  {selectedComplaint.area}
            </Text>

            <Text style={styles.addressText}>
              {selectedComplaint.address}
            </Text>

            {selectedComplaint.description ? (
              <Text style={styles.detailDescription}>
                {selectedComplaint.description}
              </Text>
            ) : null}

            {selectedComplaint.festival ? (
              <Text style={styles.festivalTag}>
                {selectedComplaint.festival}
              </Text>
            ) : null}

            <View style={styles.detailDivider} />

            <Text style={styles.detailInfo}>
              담당 부서  ·  {agency}
            </Text>

            <Text style={styles.detailInfo}>
              예상 처리  ·  {estimatedPeriod}
            </Text>

            {/* 공감 기능 */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                liked ? '좋아요 취소' : '좋아요'
              }
              accessibilityState={{ disabled: !canToggleLike }}
              disabled={!canToggleLike}
              onPress={() => toggleLike(selectedComplaint.id)}
              style={[
                styles.detailLikeButton,
                !canToggleLike && { opacity: 0.65 },
              ]}
            >
              <AppIcon
                name="heart"
                size={20}
                color={colors.apple}
                filled={liked}
              />

              <Text style={styles.detailLikeLabel}>
                좋아요 {selectedComplaint.likeCount}
              </Text>
            </Pressable>

            {/* 본인 민원만 수정·삭제 영역 표시 */}
            {isMine ? (
              <View style={{ marginBottom: 14 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <ActionButton
                      label="수정"
                      secondary
                      disabled={!canModify}
                      onPress={() => setEditing(true)}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <ActionButton
                      label="삭제"
                      secondary
                      disabled={!canModify}
                      onPress={() => setConfirmingDelete(true)}
                    />
                  </View>
                </View>

                {!canModify ? (
                  <Text
                    style={[
                      styles.detailInfo,
                      { marginTop: 8, marginBottom: 0 },
                    ]}
                  >
                    현재 이 민원은 수정·삭제할 수 없어요.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <ActionButton
              label="확인"
              onPress={closeModal}
            />
          </Pressable>

          {/* 삭제 확인 */}
          {confirmingDelete && canModify ? (
            <Pressable
              accessibilityLabel="삭제 확인 닫기"
              onPress={() => setConfirmingDelete(false)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              <Pressable
                accessibilityRole="alert"
                onPress={() => undefined}
                style={{
                  width: '100%',
                  maxWidth: 340,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  padding: 22,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: '#1F2A24',
                    marginBottom: 8,
                  }}
                >
                  정말 삭제할까요?
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 21,
                    color: '#5D6B63',
                    marginBottom: 18,
                  }}
                >
                  삭제한 민원은 되돌릴 수 없어요.
                </Text>

                {deleteError ? (
                  <Text accessibilityRole="alert" style={{ color: '#D84848', marginBottom: 12 }}>{deleteError}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ActionButton
                      label="취소"
                      secondary
                      disabled={deleting}
                      onPress={() => setConfirmingDelete(false)}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <ActionButton
                      label={deleting ? '삭제 중...' : '삭제하기'}
                      disabled={deleting}
                      onPress={() => {
                        if (deleting) return;
                        setDeleting(true);
                        setDeleteError('');
                        void onDelete(selectedComplaint.id)
                          .then(() => {
                            setDeleting(false);
                            setConfirmingDelete(false);
                            closeModal();
                          })
                          .catch((error) => {
                            setDeleteError(error instanceof Error ? error.message : '민원을 삭제하지 못했어요.');
                            setDeleting(false);
                          });
                      }}
                    />
                  </View>
                </View>
              </Pressable>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>

      {/* 민원 수정 */}
      {editing && canModify ? (
        <ComplaintEditModal
          complaint={serverDetail ?? selectedComplaint}
          festivals={serverFestivals}
          onClose={() => setEditing(false)}
          onSave={async (changes) => {
            await onSaveEdit(selectedComplaint.id, changes);
            setEditing(false);
          }}
        />
      ) : null}
    </>
  );
}
