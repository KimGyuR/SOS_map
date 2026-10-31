import { Modal, Pressable, Text, View } from 'react-native';
import { getCategory } from '../domain/catalog';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import AppIcon from '../components/AppIcon';
import ActionButton from '../components/ActionButton';
import type { AppModel } from '../hooks/useAppModel';

type Props = Pick<AppModel,
  'category'
  | 'title'
  | 'description'
  | 'address'
  | 'likedComplaintIds'
  | 'toggleLike'
  | 'selectedComplaint'
  | 'setSelectedComplaint'
>;

export default function ComplaintDetailModal({
  category,
  title,
  description,
  address,
  likedComplaintIds,
  toggleLike,
  selectedComplaint,
  setSelectedComplaint,
}: Props) {
  if (!selectedComplaint) return null;
  const itemCategory = getCategory(selectedComplaint.category);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedComplaint(null)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setSelectedComplaint(null)}>
        <Pressable style={styles.detailSheet} onPress={() => undefined}>
          <View style={styles.sheetHandle} />
          <View style={styles.detailCategoryRow}>
            <View style={[styles.categoryIcon, { backgroundColor: `${itemCategory.color}18` }]}><AppIcon name={itemCategory.icon} color={itemCategory.color} /></View>
            <View style={styles.complaintBody}><View style={styles.cardMetaRow}><Text style={[styles.categoryLabel, { color: itemCategory.color }]}>{itemCategory.label}</Text>{selectedComplaint.isSample ? <Text style={styles.sampleTag}>데모</Text> : null}</View><Text style={styles.timeLabel}>{selectedComplaint.createdAt}</Text></View>
            <Text style={[styles.statusText, selectedComplaint.status === '해결 완료' && styles.statusDone]}>{selectedComplaint.status}</Text>
          </View>
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
          <ActionButton label="확인" onPress={() => setSelectedComplaint(null)} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
