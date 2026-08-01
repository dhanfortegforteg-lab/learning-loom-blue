import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { REWARD_BY_ID, isEarned } from "./rewards";
import { fetchRewardStats } from "./rewards.server";

export const getRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const stats = await fetchRewardStats(supabase as any, userId);
    const { data: claims } = await supabase.from("reward_claims").select("reward_id, xp, created_at").eq("user_id", userId);
    return { stats, claims: claims ?? [] };
  });

export const claimReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rewardId: string }) => z.object({ rewardId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const reward = REWARD_BY_ID.get(data.rewardId);
    if (!reward) throw new Error("Recompensa inválida");

    const stats = await fetchRewardStats(supabase as any, userId);
    if (!isEarned(reward, stats)) throw new Error("Missão ainda não concluída");

    const { error } = await supabase
      .from("reward_claims")
      .insert({ user_id: userId, reward_id: reward.id, kind: reward.kind, xp: reward.xp });
    if (error) {
      if (error.code === "23505") throw new Error("Recompensa já resgatada");
      throw new Error(error.message);
    }

    const newXp = (stats.xp ?? 0) + reward.xp;
    await supabase
      .from("profiles")
      .update({ xp: newXp, level: Math.floor(newXp / 250) + 1 })
      .eq("id", userId);

    return { xp: reward.xp, totalXp: newXp };
  });
