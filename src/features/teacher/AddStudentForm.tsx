import { type ChangeEvent, type FormEvent, useState } from 'react';
import type { StudentCredentials } from '@/application/studentService';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { AvatarPickerModal } from '@/shared/ui/AvatarPickerModal';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import { ErrorMessage } from '@/shared/ui/Notice';
import { TextField } from '@/shared/ui/TextField';
import styles from './Teacher.module.css';

import { LEVEL_GROUPS, LEVEL_META, type LevelGroup } from '@/domain/users';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  birthYear: '',
  levelGroup: 'A' as LevelGroup,
  avatarUrl: null as string | null,
  username: '',
  password: '',
};

export function AddStudentForm({ onCreated }: { onCreated: (credentials: StudentCredentials) => void }) {
  const { students } = useServices();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [tempStudentId] = useState(() => crypto.randomUUID());
  const addStudent = useAsyncAction(students.add);

  const update = (field: keyof typeof EMPTY_FORM) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const suggestCredentials = () => {
    setForm((current) => ({ ...current, ...students.suggestCredentials(current.firstName) }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const created = await addStudent.run({
      firstName: form.firstName,
      lastName: form.lastName,
      birthYear: form.birthYear.trim() === '' ? null : Number(form.birthYear),
      levelGroup: form.levelGroup,
      avatarUrl: form.avatarUrl,
      username: form.username,
      password: form.password,
    });
    if (created) {
      setForm(EMPTY_FORM);
      onCreated(created.credentials);
    }
  };

  return (
    <Card title="Yangi o'quvchi qo'shish">
      <form onSubmit={handleSubmit} noValidate>
        {/* Profil rasmi (Avatar) tanlash */}
        <div className={styles.editAvatarRow}>
          <NameAvatar name={form.firstName || "O'quvchi"} avatarUrl={form.avatarUrl} size={48} />
          <div>
            <button type="button" className={styles.editAvatarBtn} onClick={() => setShowAvatarPicker(true)}>
              🎨 Profil rasmini tanlash
            </button>
            {form.avatarUrl && (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setForm((curr) => ({ ...curr, avatarUrl: null }))}
              >
                Olib tashlash
              </button>
            )}
          </div>
        </div>

        <div className={styles.formGrid}>
          <TextField label="Ism" value={form.firstName} onChange={update('firstName')} />
          <TextField label="Familiya" value={form.lastName} onChange={update('lastName')} />
          <TextField
            label="Tug'ilgan yili"
            type="number"
            inputMode="numeric"
            placeholder="masalan, 2018"
            value={form.birthYear}
            onChange={update('birthYear')}
          />
          <label className={styles.fieldLabel}>
            <span>Bilim darajasi (Toifa)</span>
            <select
              value={form.levelGroup}
              onChange={(e) => setForm((curr) => ({ ...curr, levelGroup: e.target.value as LevelGroup }))}
              className={styles.selectInput}
            >
              {LEVEL_GROUPS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {LEVEL_META[lvl].label}: {LEVEL_META[lvl].formula} ({LEVEL_META[lvl].description})
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="Login"
            autoCapitalize="none"
            value={form.username}
            onChange={update('username')}
          />
          <TextField label="Parol" value={form.password} onChange={update('password')} />
        </div>
        <ErrorMessage>{addStudent.error}</ErrorMessage>
        <div className={styles.buttonRow}>
          <Button variant="outline" onClick={suggestCredentials}>
            Login/parol tavsiya qil
          </Button>
          <Button type="submit" disabled={addStudent.pending}>
            Qo'shish
          </Button>
        </div>
      </form>
      {showAvatarPicker && (
        <AvatarPickerModal
          studentId={tempStudentId}
          currentAvatarUrl={form.avatarUrl}
          onSelect={(newUrl) => setForm((curr) => ({ ...curr, avatarUrl: newUrl }))}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </Card>
  );
}
