export type SignupInput = { id: string; name: string; email: string; password: string; };

export function validateSignup(input: SignupInput, confirmation = input.password): string | null {
  if (!/^[a-zA-Z0-9._-]{4,20}$/.test(input.id.trim())) return '아이디는 영문, 숫자, 점, 밑줄, 하이픈을 사용해 4~20자로 입력해 주세요.';
  if (input.name.trim().length < 2) return '이름은 두 글자 이상 입력해 주세요.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return '올바른 이메일 주소를 입력해 주세요.';
  if (input.password.length < 8 || !/[A-Za-z]/.test(input.password) || !/\d/.test(input.password)) return '비밀번호는 영문과 숫자를 포함해 8자 이상 입력해 주세요.';
  if (input.password !== confirmation) return '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
  return null;
}

export type ReportValidationInput = {
  photoUri: string | null;
  title: string;
  description: string;
  faceBlurAcknowledged: boolean;
  hasAnimalCarcass: boolean;
  animalBlurConfirmed: boolean;
};
export type ValidationIssue = { title: string; message: string; };

/** Validate cumulatively so going back and editing cannot bypass previous steps. */
export function validateReport(input: ReportValidationInput, step = 4): ValidationIssue | null {
  if (!input.photoUri) return { title: '사진을 추가해 주세요', message: '현장 사진을 촬영하거나 앨범에서 선택해 주세요.' };
  if (step >= 2 && (!input.title.trim() || !input.description.trim())) return { title: '내용을 입력해 주세요', message: '문제 제목과 상세 내용을 작성해 주세요.' };
  if (step >= 3 && !input.faceBlurAcknowledged) return { title: '사진을 확인해 주세요', message: '얼굴 등 식별 정보를 확인하고, 필요하면 직접 블러 처리했는지 확인해 주세요.' };
  if (step >= 3 && input.hasAnimalCarcass && !input.animalBlurConfirmed) return { title: '동물 사체 사진을 확인해 주세요', message: '동물 사체는 자동으로 가려지지 않으므로 직접 편집한 사진인지 확인해 주세요.' };
  return null;
}
