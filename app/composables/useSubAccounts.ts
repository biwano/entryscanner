import { computed, watch } from "vue";
import { useAsyncData } from "#app";
import { useSupabaseClient } from "#imports";
import type { Database } from "~/types/database.types";
import type { UserSubAccount } from "~/types/database.friendly.types";
import { useLocalStorage } from "~/composables/useLocalStorage";
import { useUserId } from "~/composables/useUserId";

const LAST_SUB_ACCOUNT_KEY = "last_used_sub_account_id";

export const useSubAccounts = () => {
  const supabase = useSupabaseClient<Database>();
  const userId = useUserId();
  const selectedSubAccountId = useLocalStorage<string | null>(
    LAST_SUB_ACCOUNT_KEY,
    null
  );

  const {
    data: subAccounts,
    refresh: refreshSubAccounts,
    pending: pendingSubAccounts,
  } = useAsyncData<UserSubAccount[]>(
    "user_sub_accounts",
    async () => {
      if (!userId.value) return [];
      const { data } = await supabase
        .from("user_sub_accounts")
        .select("*")
        .eq("user_id", userId.value)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    {
      watch: [userId],
    }
  );

  watch(
    [userId, subAccounts],
    () => {
      if (!userId.value) {
        selectedSubAccountId.value = null;
        return;
      }

      const accounts = subAccounts.value ?? [];
      if (accounts.length === 0) {
        selectedSubAccountId.value = null;
        return;
      }

      const selectedExists = accounts.some(
        (account) => account.id === selectedSubAccountId.value
      );
      if (!selectedExists) {
        selectedSubAccountId.value = accounts[0]?.id ?? null;
      }
    },
    { immediate: true }
  );

  const activeSubAccount = computed(() => {
    if (!selectedSubAccountId.value) return null;
    return (
      subAccounts.value?.find(
        (account) => account.id === selectedSubAccountId.value
      ) ?? null
    );
  });

  const setActiveSubAccount = (id: string) => {
    selectedSubAccountId.value = id;
  };

  return {
    subAccounts,
    refreshSubAccounts,
    pendingSubAccounts,
    selectedSubAccountId,
    activeSubAccount,
    setActiveSubAccount,
  };
};
