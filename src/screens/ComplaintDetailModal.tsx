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

type Props = Pick<AppModel,
  'category'
  | 'title'
  | 'description'
  | 'address'
  | 'likedComplaintIds'
  | 'toggleLike'
  | 'selectedComplaint'
  | 'setSelectedComplaint'
> & {
  // 서버 연결 담당이 연결할 함수 (API 17번 수정, 18번 삭제)
  onSaveEdit?: (id: string, changes: ComplaintEditChanges) => void;
  onDelete?: (id: string) => void;
};

export default function ComplaintDetailModal({
  category,
  title,
  description,
  address,
  likedComplaintIds,
  toggleLike,
  selectedComplaint,
  setSelectedComplaint,
  onSaveEdit,
  onDelete,
}: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  if (!selectedComplaint) return null;
  const closeModal = () => {
    setConfirmingDelete(false);
    setImageFailed(false);
    setEditing(false);
    setSelectedComplaint(null);
  };
  const isMine = true; // 임시값: 서버 연결 후 서버가 주는 mine 값으로 교체
  const canModify = isMine && selectedComplaint.status === '접수';
  // 임시: 아직 타입에 imageUrl이 없어서 이렇게 읽음. 서버 연결 후 selectedComplaint.imageUrl로 교체
  const imageUrl = (selectedComplaint as { imageUrl?: string }).imageUrl;
  const itemCategory = getCategory(selectedComplaint.category);
  return (
    <>
      <Modal visible={!editing} transparent animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.detailSheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <View style={styles.detailCategoryRow}>
              <View style={[styles.categoryIcon, { backgroundColor: `${itemCategory.color}18` }]}><AppIcon name={itemCategory.icon} color={itemCategory.color} /></View>
              <View style={styles.complaintBody}><View style={styles.cardMetaRow}><Text style={[styles.categoryLabel, { color: itemCategory.color }]}>{itemCategory.label}</Text>{selectedComplaint.isSample ? <Text style={styles.sampleTag}>데모</Text> : null}</View><Text style={styles.timeLabel}>{selectedComplaint.createdAt}</Text></View>
              <Text style={[styles.statusText, selectedComplaint.status === '해결 완료' && styles.statusDone]}>{selectedComplaint.status}</Text>
            </View>
            {imageUrl && !imageFailed ? (
              <Image
                accessibilityLabel="민원 사진"
                source={{ uri: imageUrl }}
                resizeMode="cover"
                onError={() => setImageFailed(true)}
                style={{ width: '100%', height: 160, borderRadius: 14, marginTop: 14, backgroundColor: '#EEF0F4' }}
              />
            ) : (
              <View style={{ width: '100%', height: 160, borderRadius: 14, marginTop: 14, backgroundColor: '#EEF0F4', alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon name="pin" size={28} color="#9AA7B5" />
                <Text style={[styles.detailInfo, { marginTop: 8, marginBottom: 0 }]}>등록된 사진이 없어요</Text>
              </View>
            )}
            <Text style={styles.detailTitle}>{selectedComplaint.title}</Text>
            <Text style={styles.detailInfo}>지역  ·  {selectedComplaint.area}</Text>
            <Text style={styles.addressText}>{selectedComplaint.address}</Text>
            {selectedComplaint.description ? <Text style={styles.detailDescription}>{selectedComplaint.description}</Text> : null}
            {selectedComplaint.festival ? <Text style={styles.festivalTag}>{selectedComplaint.festival}</Text> : null}
            <View style={styles.detailDivider} />
            <Text style={styles.detailInfo}>담당 부서  ·  {itemCategory.agency}</Text>
            <Text style={styles.detailInfo}>예상 처리  ·  {itemCategory.estimate}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={likedComplaintIds.has(selectedComplaint.id) ? '좋아요 취소' : '좋아요'}
              onPress={() => toggleLike(selectedComplaint.id)}
              style={styles.detailLikeButton}
            >
              <AppIcon name="heart" size={20} color={colors.apple} filled={likedComplaintIds.has(selectedComplaint.id)} />
              <Text style={styles.detailLikeLabel}>
                좋아요 {selectedComplaint.likeCount}
              </Text>
            </Pressable>
            {isMine ? (
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><ActionButton label="수정" secondary disabled={!canModify} onPress={() => setEditing(true)} /></View>
                  <View style={{ flex: 1 }}><ActionButton label="삭제" secondary disabled={!canModify} onPress={() => setConfirmingDelete(true)} /></View>
                </View>
                {!canModify ? <Text style={[styles.detailInfo, { marginTop: 8, marginBottom: 0 }]}>처리 중이거나 해결된 민원은 수정·삭제할 수 없어요.</Text> : null}
              </View>
            ) : null}
            <ActionButton label="확인" onPress={closeModal} />
          </Pressable>
          {confirmingDelete ? (
            <Pressable
              accessibilityLabel="삭제 확인 닫기"
              onPress={() => setConfirmingDelete(false)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            >
              <Pressable
                accessibilityRole="alert"
                onPress={() => undefined}
                style={{ width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22 }}
              >
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F2A24', marginBottom: 8 }}>정말 삭제할까요?</Text>
                <Text style={{ fontSize: 14, lineHeight: 21, color: '#5D6B63', marginBottom: 18 }}>삭제한 민원은 되돌릴 수 없어요.</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><ActionButton label="취소" secondary onPress={() => setConfirmingDelete(false)} /></View>
                  <View style={{ flex: 1 }}><ActionButton label="삭제하기" onPress={() => { onDelete?.(selectedComplaint.id); closeModal(); }} /></View>
                </View>
              </Pressable>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
      {editing ? (
        <ComplaintEditModal
          complaint={selectedComplaint}
          onClose={() => setEditing(false)}
          onSave={(changes) => {
            onSaveEdit?.(selectedComplaint.id, changes);
            setEditing(false);
          }}
        />
      ) : null}
    </>
  );
}
