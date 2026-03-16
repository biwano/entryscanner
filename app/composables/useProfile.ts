import { useSupabaseClient, useSupabaseUser } from "#imports";
import { useAsyncData } from "#app";
import type { Database } from "~/types/database.types.js";
import type { Profile } from "~/types/database.friendly.types.js";
import { useUserId } from "./useUserId.js";

export const useProfile = () => {
  const supabase = useSupabaseClient<Database>();
  const userId = useUserId();

  const { data: profile, refresh: refreshProfile, pending: pendingProfile } = useAsyncData<Profile | null>(
    "profile",
    async () => {
      if (!userId.value) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId.value)
        .single();
      return data;
    },
    {
      watch: [userId],
    }
  );

  return {
    profile,
    refreshProfile,
    pendingProfile,
  };
};
