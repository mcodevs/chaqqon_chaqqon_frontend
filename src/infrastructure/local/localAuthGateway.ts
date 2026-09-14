import { AppError } from '@/application/errors';
import type { AuthGateway } from '@/application/ports';
import type { Session } from '@/application/session';
import { normalizeUsername } from '@/domain/users';
import type { PasswordHasher } from '../security/pbkdf2PasswordHasher';
import type { KeyValueStore } from '../storage/keyValueStore';
import type { StudentRecords } from './studentRecords';
import type { SessionStore } from './webSessionStore';

interface TeacherRecord {
  username: string;
  passwordHash: string;
}

interface Dependencies {
  store: KeyValueStore;
  records: StudentRecords;
  hasher: PasswordHasher;
  sessions: SessionStore;
}

const TEACHER_KEY = 'teacher';

/** Browser-only accounts: fine for a single device, not a security boundary. */
export function createLocalAuthGateway({ store, records, hasher, sessions }: Dependencies): AuthGateway {
  const getTeacher = () => store.get<TeacherRecord>(TEACHER_KEY);

  const start = (session: Session): Session => {
    sessions.save(session);
    return session;
  };

  return {
    hasTeacher: async () => (await getTeacher()) !== null,

    async registerTeacher({ username, password }) {
      if (await getTeacher()) throw new AppError('TEACHER_EXISTS');
      if (await records.findByUsername(username)) throw new AppError('USERNAME_TAKEN');
      await store.set<TeacherRecord>(TEACHER_KEY, { username, passwordHash: await hasher.hash(password) });
      return start({ role: 'teacher' });
    },

    async signIn(role, { username, password }) {
      if (role === 'teacher') {
        const teacher = await getTeacher();
        if (!teacher || normalizeUsername(teacher.username) !== username) return null;
        return (await hasher.verify(password, teacher.passwordHash)) ? start({ role: 'teacher' }) : null;
      }

      const student = await records.findByUsername(username);
      if (!student) return null;
      return (await hasher.verify(password, student.passwordHash))
        ? start({ role: 'student', studentId: student.id })
        : null;
    },

    async signOut() {
      sessions.save(null);
    },

    restoreSession: async () => sessions.load(),

    // Local sessions only end through signOut.
    onSessionEnded: () => () => {},
  };
}
