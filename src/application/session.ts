export type Session = { role: 'teacher' } | { role: 'student'; studentId: string };

export type Role = Session['role'];
