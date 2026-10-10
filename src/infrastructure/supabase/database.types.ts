/*
 * Mirrors supabase/migrations. After changing the schema, regenerate with:
 *   npx supabase gen types typescript --linked > src/infrastructure/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type NoArgs = Record<PropertyKey, never>;
type Role = 'admin' | 'teacher' | 'student';
type RoomStatus = 'waiting' | 'running' | 'finished';
type PracticeMode = 'practice' | 'online' | 'classroom';
type PaymentKind = 'payment' | 'launch';

type ProfileRow = {
  id: string;
  role: Role;
  username: string;
  first_name: string;
  last_name: string;
  birth_year: number | null;
  level_group: 'A' | 'B' | 'C' | 'D';
  avatar_url: string | null;
  last_active_at: string | null;
  created_at: string;
  /** A student's teacher; null for a teacher. */
  teacher_id: string | null;
};

type WrittenHomeworkRow = {
  id: string;
  student_id: string;
  date: string;
  status: 'bajardi' | 'chala' | 'bajarmadi';
  notes: string;
  updated_at: string;
};

type RoomRow = {
  id: string;
  created_at: string;
  status: RoomStatus;
  participant_ids: string[];
  configs: Json;
  /** Defaults to the teacher who creates the room. */
  teacher_id: string;
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

type MarketItemRow = {
  id: string;
  title: string;
  cost_stars: number;
  image_url: string;
  stock: number | null;
  created_at: string;
  /** Defaults to the teacher who creates the item. */
  teacher_id: string;
};

type MarketOrderRow = {
  id: string;
  student_id: string;
  item_id: string;
  item_title: string;
  cost_stars: number;
  status: 'pending' | 'delivered' | 'cancelled';
  created_at: string;
};

type StarAwardRow = {
  id: string;
  student_id: string;
  delta: number;
  reason: 'homework' | 'purchase' | 'refund' | 'teacher_grant';
  source_result_id: string | null;
  source_order_id: string | null;
  note: string | null;
  created_at: string;
};

type TariffRow = {
  id: string;
  name: string;
  monthly_price: number;
  max_students: number | null;
  features: string[];
  description: string;
  is_public: boolean;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type TeacherRow = {
  profile_id: string;
  tariff_id: string;
  billing_starts_on: string | null;
  phone: string;
  center_name: string;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
};

type TeacherLedgerRow = {
  id: string;
  teacher_id: string;
  kind: 'payment' | 'bonus' | 'adjustment' | 'charge';
  amount: number;
  period_start: string | null;
  tariff_id: string | null;
  note: string;
  recorded_by: string | null;
  created_at: string;
};

type PlatformSettingsRow = {
  id: boolean;
  contact_phone: string;
  contact_telegram: string;
  updated_at: string;
};

type TeacherOverviewRow = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  center_name: string;
  tariff_id: string;
  billing_starts_on: string | null;
  disabled_at: string | null;
  created_at: string;
  student_count: number;
  active_students: number;
  open_students: number;
  new_students: number;
  practice_count: number;
  correct_answers: number;
  total_answers: number;
  homework_rooms: number;
};

type TeacherApplicationRow = {
  id: string;
  full_name: string;
  phone: string;
  students_count: number | null;
  telegram_username: string;
  city: string;
  center_name: string;
  heard_from: string;
  tariff_id: string | null;
  note: string;
  status: 'new' | 'contacted' | 'approved' | 'rejected';
  teacher_id: string | null;
  handled_by: string | null;
  admin_note: string;
  created_at: string;
  updated_at: string;
};

type TelegramLinkRow = {
  id: string;
  profile_id: string;
  chat_id: number;
  created_at: string;
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
      market_items: {
        Row: MarketItemRow;
        Insert: Pick<MarketItemRow, 'title' | 'cost_stars' | 'image_url'> & Partial<MarketItemRow>;
        Update: Partial<MarketItemRow>;
        Relationships: [];
      };
      market_orders: {
        Row: MarketOrderRow;
        Insert: Pick<MarketOrderRow, 'student_id' | 'item_id' | 'item_title' | 'cost_stars'> &
          Partial<MarketOrderRow>;
        Update: Partial<MarketOrderRow>;
        Relationships: [];
      };
      written_homework: {
        Row: WrittenHomeworkRow;
        Insert: Pick<WrittenHomeworkRow, 'student_id' | 'status'> & Partial<WrittenHomeworkRow>;
        Update: Partial<WrittenHomeworkRow>;
        Relationships: [];
      };
      star_awards: {
        Row: StarAwardRow;
        // The app never writes a star: both inserts come from database triggers.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      telegram_links: {
        Row: TelegramLinkRow;
        Insert: Pick<TelegramLinkRow, 'profile_id' | 'chat_id'> & Partial<TelegramLinkRow>;
        Update: Partial<TelegramLinkRow>;
        Relationships: [];
      };
      tariffs: {
        Row: TariffRow;
        Insert: Pick<TariffRow, 'name' | 'monthly_price'> &
          Partial<Pick<TariffRow, 'max_students' | 'features' | 'description' | 'is_public' | 'sort_order'>>;
        Update: Partial<
          Pick<
            TariffRow,
            | 'name'
            | 'monthly_price'
            | 'max_students'
            | 'features'
            | 'description'
            | 'is_public'
            | 'sort_order'
            | 'archived_at'
            | 'updated_at'
          >
        >;
        Relationships: [];
      };
      teachers: {
        Row: TeacherRow;
        // Written only through RPCs and the Edge Functions.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      teacher_ledger: {
        Row: TeacherLedgerRow;
        // The admin records money; charges come from the database.
        Insert: Pick<TeacherLedgerRow, 'teacher_id' | 'kind' | 'amount'> &
          Partial<Pick<TeacherLedgerRow, 'note'>>;
        Update: never;
        Relationships: [];
      };
      teacher_applications: {
        Row: TeacherApplicationRow;
        // Guests apply through submit_teacher_application().
        Insert: never;
        Update: Partial<Pick<TeacherApplicationRow, 'status' | 'teacher_id' | 'admin_note'>>;
        Relationships: [];
      };
      platform_settings: {
        Row: PlatformSettingsRow;
        Insert: never;
        Update: Partial<Pick<PlatformSettingsRow, 'contact_phone' | 'contact_telegram' | 'updated_at'>>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      submit_teacher_application: {
        Args: {
          p_full_name: string;
          p_phone: string;
          p_students_count: number | null;
          p_telegram_username: string;
          p_city: string;
          p_center_name: string;
          p_heard_from: string;
          p_tariff_id: string | null;
          p_note: string;
        };
        Returns: void;
      };
      student_accounts: {
        Args: NoArgs;
        Returns: Pick<
          ProfileRow,
          | 'id'
          | 'username'
          | 'first_name'
          | 'last_name'
          | 'birth_year'
          | 'level_group'
          | 'avatar_url'
          | 'last_active_at'
        >[];
      };
      my_features: { Args: NoArgs; Returns: string[] };
      my_teacher_account: { Args: NoArgs; Returns: Json };
      update_my_teacher_profile: {
        Args: { p_first_name: string; p_last_name: string; p_phone: string; p_center_name: string };
        Returns: void;
      };
      admin_teacher_overview: { Args: { p_from: string; p_to: string }; Returns: TeacherOverviewRow[] };
      admin_update_teacher: {
        Args: {
          p_teacher: string;
          p_first_name: string;
          p_last_name: string;
          p_phone: string;
          p_center_name: string;
          p_tariff_id: string;
          p_billing_starts_on: string | null;
          p_disabled: boolean;
        };
        Returns: void;
      };
      place_order: { Args: { p_item_id: string }; Returns: string };
      update_student_profile: {
        Args: {
          student_id: string;
          first_name?: string | null;
          last_name?: string | null;
          birth_year?: number | null;
          level_group?: string | null;
        };
        Returns: void;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
