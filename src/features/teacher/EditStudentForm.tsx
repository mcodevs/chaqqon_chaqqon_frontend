import { type ChangeEvent, type FormEvent, useState } from 'react';
import { LEVEL_GROUPS, LEVEL_META, type LevelGroup, type StudentAccount } from '@/domain/users';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { AvatarPickerModal } from '@/shared/ui/AvatarPickerModal';
import { Button } from '@/shared/ui/Button';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import { ErrorMessage } from '@/shared/ui/Notice';
import { TextField } from '@/shared/ui/TextField';
import styles from './Teacher.module.css';

interface EditStudentFormProps {
  student: StudentAccount;
  onSaved: () => void;
  onCancel: () => void;
}

export function EditStudentForm({ student, onSaved, onCancel }: EditStudentFormProps) {
  const { students } = useServices();
  const [firstName, setFirstName] = useState(student.firstName);
  const [lastName, setLastName] = useState(student.lastName ?? '');
  const [birthYear, setBirthYear] = useState(student.birthYear ? String(student.birthYear) : '');
  const [levelGroup, setLevelGroup] = useState<LevelGroup>(student.levelGroup ?? 'A');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(student.avatarUrl ?? null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const updateProfile = useAsyncAction(students.updateProfile);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanFirstName = firstName.trim();
    if (!cleanFirstName) return;

    const success = await updateProfile.run(student.id, {
      firstName: cleanFirstName,
      lastName: lastName.trim(),
      birthYear: birthYear.trim() === '' ? null : Number(birthYear),
      levelGroup,
      avatarUrl,
    });

    if (success) {
      onSaved();
    }
  };

  return (
    <form className={styles.editForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.editFormHeader}>
        <span className={styles.editFormTitle}>{student.firstName} profilini tahrirlash</span>
      </div>

      {/* Avatar tanlash */}
      <div className={styles.editAvatarRow}>
        <NameAvatar name={firstName || student.firstName} avatarUrl={avatarUrl} size={48} />
        <div>
          <button type="button" className={styles.editAvatarBtn} onClick={() => setShowAvatarPicker(true)}>
            🎨 Profil rasmini tanlash
          </button>
        </div>
      </div>

      <div className={styles.formGrid}>
        <TextField
          label="Ism"
          value={firstName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
        />
        <TextField
          label="Familiya"
          value={lastName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
        />
        <TextField
          label="Tug'ilgan yili"
          type="number"
          inputMode="numeric"
          placeholder="masalan, 2018"
          value={birthYear}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setBirthYear(e.target.value)}
        />
        <label className={styles.fieldLabel}>
          <span>Bilim darajasi (Toifa)</span>
          <select
            value={levelGroup}
            onChange={(e) => setLevelGroup(e.target.value as LevelGroup)}
            className={styles.selectInput}
          >
            {LEVEL_GROUPS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {LEVEL_META[lvl].label}: {LEVEL_META[lvl].formula} ({LEVEL_META[lvl].description})
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorMessage>{updateProfile.error}</ErrorMessage>

      <div className={styles.buttonRow}>
        <Button type="button" variant="outline" onClick={onCancel}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={updateProfile.pending}>
          {updateProfile.pending ? 'Saqlanmoqda...' : 'Saqlash'}
        </Button>
      </div>

      {showAvatarPicker && (
        <AvatarPickerModal
          studentId={student.id}
          currentAvatarUrl={avatarUrl}
          onSelect={(newUrl) => setAvatarUrl(newUrl)}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </form>
  );
}
