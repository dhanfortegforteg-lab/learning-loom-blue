import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyStats, type RewardStats } from "./rewards";

export async function fetchRewardStats(supabase: SupabaseClient<any>, userId: string): Promise<RewardStats> {
  const [profile, materials, answers, sessions, writings, exams, tracks, notes, events, fox] = await Promise.all([
    supabase.from("profiles").select("xp, level, streak_days").eq("id", userId).maybeSingle(),
    supabase.from("materials").select("kind").eq("user_id", userId),
    supabase.from("answers").select("is_correct").eq("user_id", userId),
    supabase.from("study_sessions").select("minutes").eq("user_id", userId),
    supabase.from("writings").select("score").eq("user_id", userId),
    supabase.from("exam_scores").select("score, max_score").eq("user_id", userId),
    supabase.from("track_contents").select("completed").eq("user_id", userId),
    supabase.from("notes").select("id").eq("user_id", userId),
    supabase.from("events").select("id").eq("user_id", userId),
    supabase.from("fox_rewards").select("day").eq("user_id", userId),
  ]);

  const ans = answers.data ?? [];
  const correct = ans.filter((a: any) => a.is_correct).length;
  const w = (writings.data ?? []).map((x: any) => Number(x.score) || 0);
  const ex = (exams.data ?? []).map((x: any) => {
    const max = Number(x.max_score) || 10;
    return (Number(x.score) || 0) * (10 / max);
  });

  return {
    ...emptyStats,
    xp: profile.data?.xp ?? 0,
    level: profile.data?.level ?? 1,
    streak: profile.data?.streak_days ?? 0,
    materials: (materials.data ?? []).length,
    materialKinds: new Set((materials.data ?? []).map((x: any) => x.kind)).size,
    answers: ans.length,
    correct,
    wrong: ans.length - correct,
    minutes: (sessions.data ?? []).reduce((a: number, b: any) => a + (b.minutes ?? 0), 0),
    writings: w.length,
    bestWriting: w.length ? Math.max(...w) : 0,
    exams: ex.length,
    bestExam: ex.length ? Math.max(...ex) : 0,
    examAvg: ex.length ? ex.reduce((a, b) => a + b, 0) / ex.length : 0,
    tracksDone: (tracks.data ?? []).filter((x: any) => x.completed).length,
    notes: (notes.data ?? []).length,
    events: (events.data ?? []).length,
    foxHappyDays: (fox.data ?? []).length,
  };
}
