export type Session =
  | { role: 'admin'; adminId: string }
  | { role: 'teacher'; teacherId: string }
  | { role: 'student'; studentId: string; teacherId: string };

export type Role = Session['role'];

/** What the sign-in form asks: a student, or a teacher. The superadmin signs in as a teacher would. */
export type LoginRole = 'student' | 'teacher';
