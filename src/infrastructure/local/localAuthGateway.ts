import { AppError } from '@/application/errors';
import type { AuthGateway } from '@/application/ports';
import type { Session } from '@/application/session';
import { normalizeUsername } from '@/domain/users';
import type { PasswordHasher } from '../security/pbkdf2PasswordHasher';
import type { LocalPlatform } from './localPlatform';
import type { StudentRecords } from './studentRecords';
import type { SessionStore } from './webSessionStore';

interface Dependencies {
  platform: LocalPlatform;
  records: StudentRecords;
  hasher: PasswordHasher;
  sessions: SessionStore;
  generateId: () => string;
}

/**
 * Browser-only accounts: fine for a single device, not a security boundary. The first visit creates
 * the superadmin, who then creates teachers; teachers create their students.
 */
export function createLocalAuthGateway({
  platform,
  records,
  hasher,
  sessions,
  generateId,
}: Dependencies): AuthGateway {
  const start = (session: Session): Session => {
    sessions.save(session);
    return session;
  };

  return {
    async needsSetup() {
      await platform.ready();
      return (await platform.getAdmin()) === null;
    },

    async setUpAdmin({ username, password }) {
      await platform.ready();
      if (await platform.getAdmin()) throw new AppError('ALREADY_SET_UP');
      if (await platform.isUsernameTaken(username)) throw new AppError('USERNAME_TAKEN');
      const id = generateId();
      await platform.saveAdmin({ id, username, passwordHash: await hasher.hash(password) });
      return start({ role: 'admin', adminId: id });
    },

    async signIn(role, { username, password }) {
      await platform.ready();
      if (role === 'teacher') {
        const admin = await platform.getAdmin();
        if (admin && normalizeUsername(admin.username) === username) {
          return (await hasher.verify(password, admin.passwordHash))
            ? start({ role: 'admin', adminId: admin.id })
            : null;
        }
        const teacher = (await platform.listTeachers()).find(
          (t) => normalizeUsername(t.username) === username,
        );
        if (!teacher) return null;
        return (await hasher.verify(password, teacher.passwordHash))
          ? start({ role: 'teacher', teacherId: teacher.id })
          : null;
      }

      const student = await records.findByUsername(username);
      if (!student?.teacherId) return null;
      return (await hasher.verify(password, student.passwordHash))
        ? start({ role: 'student', studentId: student.id, teacherId: student.teacherId })
        : null;
    },

    async signOut() {
      sessions.save(null);
    },

    async restoreSession() {
      await platform.ready();
      return sessions.load();
    },

    // Local sessions only end through signOut.
    onSessionEnded: () => () => {},
  };
}
