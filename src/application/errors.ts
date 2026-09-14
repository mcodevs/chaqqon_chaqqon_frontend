export type AppErrorCode =
  | 'TEACHER_EXISTS'
  | 'USERNAME_REQUIRED'
  | 'INVALID_USERNAME'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORDS_MISMATCH'
  | 'CREDENTIALS_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'STUDENT_FIELDS_REQUIRED'
  | 'INVALID_AGE'
  | 'USERNAME_TAKEN'
  | 'STUDENT_NOT_FOUND'
  | 'ROOM_ACTIVE'
  | 'ROOM_EMPTY'
  | 'ROOM_TOO_LARGE'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_NOT_RUNNING'
  | 'CLASSROOM_SIZE';

/** Expected, user-facing failure of a use case. Presentation maps `code` to a message. */
export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode) {
    super(code);
    this.name = 'AppError';
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
