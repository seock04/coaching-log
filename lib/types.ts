export type CoachingSession = {
  id: string;
  user_id?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  paid_minutes: number;
  free_minutes: number;
  received_coach_the_coach_minutes: number;
  coaching_format: string;
  given_coach_the_coach_minutes: number;
  mentor_coaching_minutes: number;
  milestone: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
};

export type CoachingSessionInput = Omit<CoachingSession, "id" | "user_id" | "created_at" | "updated_at">;
