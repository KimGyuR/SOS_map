import { Pressable, Text, View } from 'react-native';
import { getCategory } from '../domain/catalog';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import AppIcon from '../components/AppIcon';
import type { Complaint } from '../domain/types';

export default function ComplaintCard({ item, liked, onSelect, onToggleLike }: { item: Complaint; liked: boolean; onSelect: (item: Complaint) => void; onToggleLike: (id: string) => void; }) {
  const itemCategory = getCategory(item.category);

  return (
    <View key={item.id} style={styles.complaintCard}>
      <View style={[styles.categoryIcon, { backgroundColor: `${itemCategory.color}18` }]}>
        <AppIcon name={itemCategory.icon} color={itemCategory.color} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title} 상세 보기`}
        style={styles.complaintBody}
        onPress={() => onSelect(item)}
      >
        <View style={styles.cardMetaRow}>
          <Text style={styles.areaLabel}>{item.area}</Text>
          <Text style={[styles.categoryLabel, { color: itemCategory.color }]}>{itemCategory.label}</Text>
          {item.isSample ? <Text style={styles.sampleTag}>데모</Text> : null}
          <Text style={styles.timeLabel}>{item.createdAt}</Text>
        </View>
        <Text style={styles.complaintTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
        {item.festival ? <Text style={styles.festivalTag}>{item.festival}</Text> : null}
        <Text style={styles.detailLink}>세부 내용 보기 ›</Text>
      </Pressable>
      <View style={styles.cardSide}>
        <Text style={[styles.statusText, item.status === '해결 완료' && styles.statusDone]}>{item.status}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={liked ? '좋아요 취소' : '좋아요'}
          accessibilityState={{ selected: liked }}
          onPress={() => onToggleLike(item.id)}
          style={styles.likeButton}
        >
          <AppIcon name="heart" size={18} color={liked ? colors.apple : colors.muted} filled={liked} />
          <Text style={[styles.likeCount, liked && styles.likeCountActive]}>{item.likeCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}
