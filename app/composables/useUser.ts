import { useSupabaseClient, useSupabaseUser } from '#imports';
import { useAsyncData } from '#app';
import { computed } from 'vue';

interface UserSystem {
  id: string;
  user_id: string;
  is_admin: boolean;
  created_at: string;
}

export const useUser = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const { data: userSystem, refresh: refreshUserSystem } = useAsyncData('user_system', async () => {
    if (!user.value) return null;
    const { data } = await supabase
      .from('user_system')
      .select('*')
      .eq('user_id', user.value.id)
      .single();
    return data as UserSystem | null;
  }, {
    watch: [user]
  });

  const isAdmin = computed(() => {
    return userSystem.value?.is_admin === true;
  });

  return {
    user,
    userSystem,
    isAdmin,
    refreshUserSystem
  };
};
