import { type AppErrorCode, isAppError } from '@/application/errors';
import { MAX_PREPAID_MONTHS } from '@/domain/billing';
import { CLASSROOM_PARTICIPANTS } from '@/domain/classroom';
import { MIN_PASSWORD_LENGTH } from '@/domain/users';

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  TEACHER_EXISTS: "O'qituvchi hisobi allaqachon yaratilgan",
  USERNAME_REQUIRED: 'Login kiriting',
  INVALID_USERNAME: "Login 3–30 ta lotin harfi, raqam yoki . _ - belgilaridan iborat bo'lsin",
  PASSWORD_TOO_SHORT: `Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lsin`,
  PASSWORDS_MISMATCH: 'Parollar mos emas',
  CREDENTIALS_REQUIRED: 'Login va parolni kiriting',
  INVALID_CREDENTIALS: "Login yoki parol noto'g'ri",
  FORBIDDEN: "Bu amal uchun ruxsat yo'q",
  STUDENT_FIELDS_REQUIRED: 'Ism, login va parolni kiriting',
  INVALID_BIRTH_YEAR: "Tug'ilgan yilni to'g'ri kiriting",
  USERNAME_TAKEN: 'Bu login band, boshqasini tanlang',
  STUDENT_NOT_FOUND: "O'quvchi topilmadi",
  ROOM_ACTIVE: 'Faol musobaqa xonasi bor — avval uni yoping',
  ROOM_EMPTY: "Kamida bitta o'quvchi tanlang",
  ROOM_TOO_LARGE: "Xonaga juda ko'p o'quvchi tanlandi",
  ROOM_NOT_FOUND: 'Musobaqa xonasi topilmadi',
  ROOM_NOT_RUNNING: 'Musobaqa hali boshlanmagan',
  CLASSROOM_SIZE: `Sinf musobaqasi uchun ${CLASSROOM_PARTICIPANTS.min}–${CLASSROOM_PARTICIPANTS.max} ta o'quvchi tanlang`,
  PAYMENT_NOT_FOUND: "Bekor qilinadigan to'lov yo'q",
  INVALID_PAID_UNTIL: `Ertangi kundan ${MAX_PREPAID_MONTHS} oygacha bo'lgan sanani tanlang`,
  ITEM_NOT_FOUND: 'Mahsulot topilmadi',
  INSUFFICIENT_STARS: "Yulduzchalaringiz yetarli emas",
  ORDER_NOT_FOUND: 'Buyurtma topilmadi',
};

const UNEXPECTED_ERROR = "Kutilmagan xatolik yuz berdi. Qaytadan urinib ko'ring.";

export function toErrorMessage(error: unknown): string {
  if (isAppError(error)) return ERROR_MESSAGES[error.code];
  console.error(error);
  return UNEXPECTED_ERROR;
}
