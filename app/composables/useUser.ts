import { useSupabaseClient, useSupabaseUser } from "#imports";
import { useAsyncData } from "#app";
import { computed } from "vue";
import type { Database } from "~/types/database.types";
import type { UserSystem } from "~/types/database.friendly.types";

export const useUser = () => {
  const supabase = useSupabaseClient<Database>();
  const user = useSupabaseUser();

  const { data: userSystem, refresh: refreshUserSystem } =
    useAsyncData<UserSystem | null>(
      "user_system",
      async () => {
        if (!user.value) return null;
        const { data } = await supabase
          .from("user_system")
          .select("*")
          .eq("user_id", user.value.sub)
          .single();
        return data;
      },
      {
        watch: [user],
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
