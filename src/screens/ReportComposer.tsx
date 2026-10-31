import { getAreaFromAddress } from '../domain/complaints';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CATEGORIES, FESTIVALS, getCategory } from '../domain/catalog';
import { colors } from '../theme/colors';
import { styles } from '../theme/appStyles';
import AppIcon from '../components/AppIcon';
import ActionButton from '../components/ActionButton';
import type { AppModel } from '../hooks/useAppModel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = Pick<AppModel,
  'selectedFestival'
  | 'composerOpen'
  | 'step'
  | 'photoUri'
  | 'category'
  | 'title'
  | 'description'
  | 'address'
  | 'animalBlurConfirmed'
  | 'hasAnimalCarcass'
  | 'faceBlurAcknowledged'
  | 'setSelectedFestival'
  | 'setComposerOpen'
  | 'setStep'
  | 'setPhotoUri'
  | 'setCategory'
  | 'setTitle'
  | 'setDescription'
  | 'setAddress'
  | 'setAnimalBlurConfirmed'
  | 'setHasAnimalCarcass'
  | 'setFaceBlurAcknowledged'
  | 'addPhoto'
  | 'advanceStep'
  | 'submitComplaint'
  | 'updateReportLocation'
>;

export default function ReportComposer({
  selectedFestival,
  composerOpen,
  step,
  photoUri,
  category,
  title,
  description,
  address,
  animalBlurConfirmed,
  hasAnimalCarcass,
  faceBlurAcknowledged,
  setSelectedFestival,
  setComposerOpen,
  setStep,
  setPhotoUri,
  setCategory,
  setTitle,
  setDescription,
  setAddress,
  setAnimalBlurConfirmed,
  setHasAnimalCarcass,
  setFaceBlurAcknowledged,
  addPhoto,
  advanceStep,
  submitComplaint,
  updateReportLocation,
}: Props) {
  const insets = useSafeAreaInsets();
  const selectedCategory = getCategory(category);
  const aiOutcome = `‘${selectedCategory.label}’ 유형으로 분류되어 ${selectedCategory.agency}에 전달될 예정이에요. 예상 처리 기간은 ${selectedCategory.estimate}입니다.`;
  return (
    <Modal visible={composerOpen} animationType="slide" onRequestClose={() => setComposerOpen(false)}>
      <KeyboardAvoidingView style={[styles.composerRoot, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.composerHeader}>
          <Pressable onPress={() => (step > 1 ? setStep(step - 1) : setComposerOpen(false))}><AppIcon name={step > 1 ? 'back' : 'close'} /></Pressable>
          <Text style={styles.composerTitle}>불편사항 등록</Text>
          <Text style={styles.stepCounter}>{step}/4</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} /></View>
        <ScrollView style={styles.composerScroll} contentContainerStyle={styles.composerContent} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <>
              <Text style={styles.stepHeading}>현장 사진을 추가해 주세요</Text>
              <Text style={styles.stepDescription}>사진은 문제 상황 확인과 빠른 처리에 도움이 돼요.</Text>
              <View style={styles.photoActions}>
                <Pressable style={styles.photoAction} onPress={() => void addPhoto('camera')}><AppIcon name="camera" color={colors.sky} /><Text style={styles.photoActionLabel}>사진 촬영</Text></Pressable>
                <Pressable style={styles.photoAction} onPress={() => void addPhoto('library')}><AppIcon name="image" color={colors.sky} /><Text style={styles.photoActionLabel}>앨범에서 선택</Text></Pressable>
              </View>
              {photoUri ? (
                <View style={styles.photoPreviewWrap}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <Pressable style={styles.removePhoto} onPress={() => setPhotoUri(null)}><AppIcon name="close" color={'white'} /></Pressable>
                  <View style={styles.aiPendingBadge}><Text style={styles.aiPendingText}>AI 얼굴 블러 확인 필요</Text></View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}><AppIcon name="plus" color={colors.sky} /><Text style={styles.photoPlaceholderText}>사진을 추가해 주세요</Text></View>
              )}
              <View style={styles.privacyBox}>
                <Text style={styles.privacyTitle}>사진 개인정보 보호</Text>
                <Text style={styles.privacyBody}>다음 단계에서 사진을 확대해 얼굴 등 식별 정보에 블러가 필요한지 직접 확인해요. 데모에서는 자동 감지·블러 처리를 하지 않습니다.</Text>
              </View>
              <View style={styles.privacyBox}>
                <Text style={styles.privacyTitle}>동물 사체 사진 안내</Text>
                <Text style={styles.privacyBody}>동물 사체는 자동 블러 대상이 아니에요. 앱에서 직접 편집할 수 없으니, 사진 편집 앱에서 직접 가림 처리한 뒤 선택해 주세요.</Text>
              </View>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <Text style={styles.stepHeading}>어떤 문제가 있나요?</Text>
              <Text style={styles.stepDescription}>카테고리를 직접 선택하면 담당 부서 안내가 더 정확해져요.</Text>
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
                    {FESTIVALS.filter((item) => item.active).map((festival) => (
                      <Pressable key={festival.name} style={styles.festivalSelectRow} onPress={() => setSelectedFestival(festival.name)}>
                        <View style={[styles.radio, selectedFestival === festival.name && styles.radioSelected]} />
                        <Text style={styles.festivalSelectText}>{festival.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
              <Text style={styles.inputLabel}>제목</Text>
              <TextInput style={styles.textInput} placeholder="예: 보도블록이 파손되어 걸을 때 위험해요" value={title} onChangeText={setTitle} maxLength={50} />
              <Text style={styles.inputLabel}>상세 내용</Text>
              <TextInput style={[styles.textInput, styles.multilineInput]} placeholder="문제가 있는 위치와 상황을 자세히 알려주세요." value={description} onChangeText={setDescription} multiline maxLength={300} textAlignVertical="top" />
              <Text style={styles.characterCount}>{description.length}/300</Text>
              <Text style={styles.inputLabel}>위치</Text>
              <View style={styles.addressRow}>
                <TextInput style={[styles.textInput, styles.addressInput]} placeholder="주소를 입력해 주세요" value={address} onChangeText={setAddress} />
                <Pressable style={styles.gpsButton} onPress={() => void updateReportLocation()}><Text style={styles.gpsButtonText}>GPS</Text></Pressable>
              </View>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <Text style={styles.stepHeading}>민원 작성 내용 점검</Text>
              <Text style={styles.stepDescription}>등록 내용과 사진의 개인정보를 확인해 주세요. 사진 블러 여부는 직접 눈으로 확인해야 해요.</Text>
              {photoUri ? <Image source={{ uri: photoUri }} style={styles.reviewPhoto} /> : null}
              <View style={styles.privacyBox}>
                <Text style={styles.privacyTitle}>🔍 얼굴·개인정보 블러 확인</Text>
                <Text style={styles.privacyBody}>사진 속 사람 얼굴, 차량 번호판, 주소 등 식별 정보가 있는지 확인해 주세요. 자동 감지 기능은 아직 연결되지 않았습니다.</Text>
                <Pressable style={styles.confirmRow} onPress={() => setFaceBlurAcknowledged((value) => !value)}>
                  <View style={[styles.checkbox, faceBlurAcknowledged && styles.checkboxChecked]}>{faceBlurAcknowledged ? <Text style={styles.checkmark}>✓</Text> : null}</View>
                  <Text style={styles.confirmText}>식별 정보가 없거나 직접 블러 처리된 것을 확인했어요</Text>
                </Pressable>
              </View>
              <View style={styles.privacyBox}>
                <Text style={styles.privacyTitle}>동물 사체 이미지 확인</Text>
                <Text style={styles.privacyBody}>동물 사체는 앱에서 자동으로 가리거나 블러 처리하지 않습니다. 사진에 포함된 경우 직접 편집해 가려 주세요.</Text>
                <Pressable style={styles.confirmRow} onPress={() => { setHasAnimalCarcass((value) => !value); setAnimalBlurConfirmed(false); }}>
                  <View style={[styles.checkbox, hasAnimalCarcass && styles.checkboxChecked]}>{hasAnimalCarcass ? <Text style={styles.checkmark}>✓</Text> : null}</View>
                  <Text style={styles.confirmText}>사진에 동물 사체가 포함되어 있어요</Text>
                </Pressable>
                {hasAnimalCarcass ? (
                  <Pressable style={styles.confirmRow} onPress={() => setAnimalBlurConfirmed((value) => !value)}>
                    <View style={[styles.checkbox, animalBlurConfirmed && styles.checkboxChecked]}>{animalBlurConfirmed ? <Text style={styles.checkmark}>✓</Text> : null}</View>
                    <Text style={styles.confirmText}>사진을 직접 편집해 가림 처리했어요</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.reviewSummary}>
                <Text style={styles.summaryLabel}>지역 · 카테고리</Text><Text style={styles.summaryValue}>{getAreaFromAddress(address)} · {selectedCategory.label}</Text>
                <Text style={styles.summaryLabel}>제목</Text><Text style={styles.summaryValue}>{title}</Text>
                <Text style={styles.summaryLabel}>상세 내용</Text><Text style={styles.summaryValue}>{description}</Text>
                <Text style={styles.summaryLabel}>위치</Text><Text style={styles.summaryValue}>{address || '위치 정보 없음'}</Text>
                {category === 'festival' ? <><Text style={styles.summaryLabel}>축제</Text><Text style={styles.summaryValue}>{selectedFestival}</Text></> : null}
              </View>
              <View style={styles.localOnlyNotice}><Text style={styles.localOnlyText}>얼굴 블러의 실제 적용 여부를 자동 검증하지 않습니다. 체크 전 사진을 직접 확인하고, 필요한 부분은 사진 편집 앱에서 먼저 가려 주세요.</Text></View>
            </>
          ) : null}
          {step === 4 ? (
            <>
              <View style={styles.successIcon}><AppIcon name="check" color={colors.sky} /></View>
              <Text style={[styles.stepHeading, styles.centerText]}>AI 처리 미리보기</Text>
              <Text style={[styles.stepDescription, styles.centerText]}>점검한 민원의 담당 부서와 예상 처리를 확인해요.</Text>
              {photoUri ? <Image source={{ uri: photoUri }} style={styles.reviewPhoto} /> : null}
              <View style={styles.aiResultCard}>
                <View style={styles.aiResultHeading}><AppIcon name="spark" color={colors.sky} /><Text style={styles.aiResultTitle}>예상 처리 결과</Text><Text style={styles.demoTag}>데모</Text></View>
                <Text style={styles.aiResultCopy}>{aiOutcome}</Text>
                <View style={styles.aiResultTags}><Text style={[styles.resultTag, { color: selectedCategory.color, backgroundColor: `${selectedCategory.color}15` }]}>{selectedCategory.label}</Text><Text style={styles.resultTagNeutral}>담당 부서 안내</Text></View>
                <Text style={styles.aiDisclaimer}>AI 연동 전 데모 예시입니다. 실제 분류·처리 기간과 다를 수 있어요.</Text>
              </View>
              <View style={styles.reviewSummary}>
                <Text style={styles.summaryLabel}>지역 · 제목</Text><Text style={styles.summaryValue}>{getAreaFromAddress(address)} · {title}</Text>
                <Text style={styles.summaryLabel}>위치</Text><Text style={styles.summaryValue}>{address || '위치 정보 없음'}</Text>
                {category === 'festival' ? <><Text style={styles.summaryLabel}>축제</Text><Text style={styles.summaryValue}>{selectedFestival}</Text></> : null}
              </View>
              <View style={styles.localOnlyNotice}><Text style={styles.localOnlyText}>이 데모에서는 등록 정보가 기기에만 저장됩니다. 민원 기관으로 전송되지 않아요.</Text></View>
            </>
          ) : null}
        </ScrollView>
        <View style={styles.composerFooter}>
          <ActionButton
            label={step < 3 ? '다음' : step === 3 ? '점검 완료하고 AI 미리보기' : '민원 등록하기'}
            onPress={step < 4 ? advanceStep : submitComplaint}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
