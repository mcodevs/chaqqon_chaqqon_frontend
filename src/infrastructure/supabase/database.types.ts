/*
 * Mirrors supabase/migrations. After changing the schema, regenerate with:
 *   npx supabase gen types typescript --linked > src/infrastructure/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type NoArgs = Record<PropertyKey, never>;
type Role = 'teacher' | 'student';
type RoomStatus = 'waiting' | 'running' | 'finished';
type PracticeMode = 'practice' | 'online' | 'classroom';
type PaymentKind = 'payment' | 'launch';

type ProfileRow = {
  id: string;
  role: Role;
  username: string;
  first_name: string;
  last_name: string;
  age: number | null;
  created_at: string;
};

type RoomRow = {
  id: string;
  created_at: string;
  status: RoomStatus;
  participant_ids: string[];
  configs: Json;
};

type RoomProgressRow = {
  room_id: string;
  student_id: string;
  answered: number;
  correct: number;
  total: number;
  finished: boolean;
};

type PracticeResultRow = {
  id: string;
  student_id: string;
  completed_at: string;
  config: Json;
  correct: number;
  total: number;
  mode: PracticeMode;
  room_id: string | null;
};

type StudentPaymentRow = {
  id: string;
  student_id: string;
  recorded_at: string;
  paid_until: string;
  kind: PaymentKind;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: '13' };
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Pick<ProfileRow, 'id' | 'role' | 'username'> & Partial<ProfileRow>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      rooms: {
        Row: RoomRow;
        Insert: Pick<RoomRow, 'status' | 'participant_ids' | 'configs'> & Partial<RoomRow>;
        Update: Partial<RoomRow>;
        Relationships: [];
      };
      room_progress: {
        Row: RoomProgressRow;
        Insert: Omit<RoomProgressRow, 'finished'> & Partial<RoomProgressRow>;
        Update: Partial<RoomProgressRow>;
        Relationships: [];
      };
      practice_results: {
        Row: PracticeResultRow;
        Insert: Pick<PracticeResultRow, 'student_id' | 'config' | 'correct' | 'total'> &
          Partial<PracticeResultRow>;
        Update: Partial<PracticeResultRow>;
        Relationships: [];
      };
      student_payments: {
        Row: StudentPaymentRow;
        Insert: Pick<StudentPaymentRow, 'student_id' | 'paid_until'> & Partial<StudentPaymentRow>;
        Update: Partial<StudentPaymentRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      teacher_exists: { Args: NoArgs; Returns: boolean };
      student_accounts: {
        Args: NoArgs;
        Returns: Pick<ProfileRow, 'id' | 'username' | 'first_name' | 'last_name' | 'age'>[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
