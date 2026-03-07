import { useSupabaseClient, useSupabaseUser } from "#imports";
import { useAsyncData } from "#app";
import { computed } from "vue";
import type { Database } from "~/types/database.types.js";
import type { UserSystem } from "~/types/database.friendly.types.js";

export const useUser = () => {
  const supabase = useSupabaseClient<Database>();
  const user = useSupabaseUser();
  const userId = useUserId();

  const { data: userSystem, refresh: refreshUserSystem } =
    useAsyncData<UserSystem | null>(
      "user_system",
      async () => {
        if (!userId.value) return null;
        const { data } = await supabase
          .from("user_system")
          .select("*")
          .eq("user_id", userId.value)
          .single();
        return data;
      },
      {
        watch: [userId],
      }
    );

  const isAdmin = computed(() => {
    return userSystem.value?.is_admin === true;
  });

  return {
    user,
    userSystem,
    isAdmin,
    refreshUserSystem,
  };
};
