import { type ChangeEvent, type FormEvent, useState } from 'react';
import type { StudentCredentials } from '@/application/studentService';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import { TextField } from '@/shared/ui/TextField';
import styles from './Teacher.module.css';

const EMPTY_FORM = { firstName: '', lastName: '', age: '', username: '', password: '' };

export function AddStudentForm({ onCreated }: { onCreated: (credentials: StudentCredentials) => void }) {
  const { students } = useServices();
  const [form, setForm] = useState(EMPTY_FORM);
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
      age: form.age.trim() === '' ? null : Number(form.age),
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
        <div className={styles.formGrid}>
          <TextField label="Ism" value={form.firstName} onChange={update('firstName')} />
          <TextField label="Familiya" value={form.lastName} onChange={update('lastName')} />
          <TextField
            label="Yoshi"
            type="number"
            inputMode="numeric"
            value={form.age}
            onChange={update('age')}
          />
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
          <Button tone="blue" variant="soft" onClick={suggestCredentials}>
            Login/parol tavsiya qil
          </Button>
          <Button type="submit" tone="green" disabled={addStudent.pending}>
            Qo'shish
          </Button>
        </div>
      </form>
    </Card>
  );
}
