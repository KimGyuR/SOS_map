import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES } from '../domain/catalog';
import type { ServerFestival } from '../api/festivals';
import type { CategoryId, Complaint } from '../domain/types';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import AppIcon from '../components/AppIcon';
import ActionButton from '../components/ActionButton';

// 바꾼 항목만 담겨요 (API 17번: 바꾼 항목만 보냄)
export type ComplaintEditChanges = {
  title?: string;
  description?: string;
  address?: string;
  category?: CategoryId;
  festival?: string;
  photoUri?: string;
  privacyCheck?: { faceBlurConfirmed: boolean; containsAnimalCarcass: boolean; animalBlurConfirmed: boolean };
};

type Props = {
  complaint: Complaint;
  festivals: ServerFestival[];
  onClose: () => void;
  onSave: (changes: ComplaintEditChanges) => Promise<void>;
};

export default function ComplaintEditModal({ complaint, festivals, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  // 임시: 아직 타입에 imageUrl이 없어서 이렇게 읽음. 서버 연결 후 complaint.imageUrl로 교체
  const originalImageUrl = (complaint as { imageUrl?: string }).imageUrl;
  const [category, setCategory] = useState<CategoryId>(complaint.category);
  const [festival, setFestival] = useState(complaint.festival ?? '');
  const [title, setTitle] = useState(complaint.title);
  const [description, setDescription] = useState(complaint.description ?? '');
  const [address, setAddress] = useState(complaint.address);
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [faceBlurConfirmed, setFaceBlurConfirmed] = useState(false);
  const [containsAnimalCarcass, setContainsAnimalCarcass] = useState(false);
  const [animalBlurConfirmed, setAnimalBlurConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const shownPhoto = newPhotoUri ?? originalImageUrl;

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets[0]?.uri) {
        setNewPhotoUri(result.assets[0].uri);
        setFaceBlurConfirmed(false);
        setContainsAnimalCarcass(false);
        setAnimalBlurConfirmed(false);
        setError('');
      }
    } catch {
      setError('사진을 불러오지 못했어요. 사진 접근 권한을 확인해 주세요.');
    }
  };

  const save = async () => {
    if (saving) return;
    if (!title.trim()) return setError('제목을 입력해 주세요.');
    if (category === 'festival' && festival !== (complaint.festival ?? '') && !festivals.some((item) => item.name === festival && item.active)) {
      return setError('서버에서 조회된 진행 중 축제를 선택해 주세요.');
    }
    if (newPhotoUri && !faceBlurConfirmed) return setError('새 사진의 얼굴·개인정보 블러를 확인해 주세요.');
    if (newPhotoUri && containsAnimalCarcass && !animalBlurConfirmed) return setError('동물 사체 사진은 직접 가림 처리한 뒤 확인해 주세요.');
    const changes: ComplaintEditChanges = {};
    if (title.trim() !== complaint.title) changes.title = title.trim();
    if (description.trim() !== (complaint.description ?? '')) changes.description = description.trim();
    if (address.trim() !== complaint.address) changes.address = address.trim();
    if (category !== complaint.category) changes.category = category;
    if (category === 'festival' && festival !== (complaint.festival ?? '')) changes.festival = festival;
    if (newPhotoUri) {
      changes.photoUri = newPhotoUri;
      changes.privacyCheck = { faceBlurConfirmed, containsAnimalCarcass, animalBlurConfirmed };
    }
    if (!Object.keys(changes).length) return setError('바뀐 내용이 없어요.');
    setError('');
    setSaving(true);
    try {
      await onSave(changes);
    } catch (error) {
      setError(error instanceof Error ? error.message : '민원을 수정하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}>
      <KeyboardAvoidingView style={[styles.composerRoot, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.composerHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="수정 닫기" onPress={() => { if (!saving) onClose(); }} disabled={saving}><AppIcon name="close" /></Pressable>
          <Text style={styles.composerTitle}>민원 수정</Text>
          <Text style={styles.stepCounter}> </Text>
        </View>
        <ScrollView style={styles.composerScroll} contentContainerStyle={styles.composerContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.inputLabel}>사진</Text>
          {shownPhoto ? (
            <Image source={{ uri: shownPhoto }} resizeMode="cover" style={styles.reviewPhoto} />
          ) : (
            <View style={styles.photoPlaceholder}><AppIcon name="image" color={colors.sky} /><Text style={styles.photoPlaceholderText}>등록된 사진이 없어요</Text></View>
          )}
          <View style={{ marginTop: 10 }}><ActionButton label="사진 변경" secondary onPress={() => void pickPhoto()} /></View>
          {newPhotoUri ? (
            <>
              <View style={styles.privacyBox}>
                <Text style={styles.privacyTitle}>🔍 얼굴·개인정보 블러 확인</Text>
                <Text style={styles.privacyBody}>새 사진 속 얼굴, 차량 번호판, 주소 등 식별 정보가 있는지 확인해 주세요.</Text>
                <Pressable style={styles.confirmRow} onPress={() => setFaceBlurConfirmed((value) => !value)}>
                  <View style={[styles.checkbox, faceBlurConfirmed && styles.checkboxChecked]}>{faceBlurConfirmed ? <Text style={styles.checkmark}>✓</Text> : null}</View>
                  <Text style={styles.confirmText}>식별 정보가 없거나 직접 블러 처리된 것을 확인했어요</Text>
                </Pressable>
              </View>
              <View style={styles.privacyBox}>
                <Text style={styles.privacyTitle}>동물 사체 이미지 확인</Text>
                <Pressable style={styles.confirmRow} onPress={() => { setContainsAnimalCarcass((value) => !value); setAnimalBlurConfirmed(false); }}>
                  <View style={[styles.checkbox, containsAnimalCarcass && styles.checkboxChecked]}>{containsAnimalCarcass ? <Text style={styles.checkmark}>✓</Text> : null}</View>
                  <Text style={styles.confirmText}>사진에 동물 사체가 포함되어 있어요</Text>
                </Pressable>
                {containsAnimalCarcass ? (
                  <Pressable style={styles.confirmRow} onPress={() => setAnimalBlurConfirmed((value) => !value)}>
                    <View style={[styles.checkbox, animalBlurConfirmed && styles.checkboxChecked]}>{animalBlurConfirmed ? <Text style={styles.checkmark}>✓</Text> : null}</View>
                    <Text style={styles.confirmText}>사진을 직접 편집해 가림 처리했어요</Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
          <Text style={styles.inputLabel}>카테고리</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((item) => (
              <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.categoryOption, category === item.id && styles.categoryOptionSelected, category === item.id && { borderColor: item.color }]}>
                <AppIcon name={item.icon} color={item.color} /><Text style={[styles.categoryOptionLabel, category === item.id && { color: item.color }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          {category === 'festival' ? (
            <>
              <Text style={styles.inputLabel}>관련 축제</Text>
              <View style={styles.festivalSelectBox}>
                {festivals.filter((item) => item.active).map((item) => (
                  <Pressable key={item.name} style={styles.festivalSelectRow} onPress={() => setFestival(item.name)}>
                    <View style={[styles.radio, festival === item.name && styles.radioSelected]} />
                    <Text style={styles.festivalSelectText}>{item.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <Text style={styles.inputLabel}>제목</Text>
          <TextInput style={styles.textInput} value={title} onChangeText={setTitle} maxLength={50} />
          <Text style={styles.inputLabel}>상세 내용</Text>
          <TextInput style={[styles.textInput, styles.multilineInput]} value={description} onChangeText={setDescription} multiline maxLength={300} textAlignVertical="top" />
          <Text style={styles.characterCount}>{description.length}/300</Text>
          <Text style={styles.inputLabel}>위치</Text>
          <TextInput style={styles.textInput} value={address} onChangeText={setAddress} />
          <Text style={[styles.privacyBody, { marginTop: 7 }]}>주소를 변경해도 지도 좌표는 이전 위치로 유지돼요. 좌표까지 변경하려면 새 민원을 등록해 주세요.</Text>
          {error ? <Text accessibilityRole="alert" style={{ color: '#D84848', fontSize: 12, marginTop: 12 }}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.composerFooter}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><ActionButton label="취소" secondary onPress={onClose} disabled={saving} /></View>
            <View style={{ flex: 1 }}><ActionButton label={saving ? "저장 중..." : "저장"} onPress={() => void save()} disabled={saving} /></View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
