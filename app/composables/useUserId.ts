import { useSupabaseUser, computed } from "#imports";

/**
 * Returns the current Supabase user's sub claim.
 * NOTE: We explicitly use user.value.sub here and not user.value.id 
 * as per the project's requirement/database schema consistency.
 */
export const useUserId = () => {
  const user = useSupabaseUser();
  return computed(() => user.value?.sub ?? null);
};
