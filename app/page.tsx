import { CoachingDashboard } from "@/components/coaching-dashboard";

export default function Home() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return <CoachingDashboard configured={configured} />;
}
