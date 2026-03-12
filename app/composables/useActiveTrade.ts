import { useSupabaseClient, useSupabaseUser } from "#imports";
import { useAsyncData } from "#app";
import type {
  UserTrade,
  UserTradeUpdate,
} from "~/types/database.friendly.types";

export const useActiveTrade = () => {
  const supabase = useSupabaseClient();
  const userId = useUserId();

  const { data: activeTrade, refresh: refreshActiveTrade } =
    useAsyncData<UserTrade | null>(
      "active_trade",
      async () => {
        if (!userId.value) return null;
        const { data, error } = await supabase
          .from("user_trades")
          .select("*")
          .eq("id", userId.value)
          .maybeSingle();

        if (error) {
          console.error("Error fetching active trade:", error);
          return null;
        }
        return data;
      },
      {
        watch: [userId],
      }
    );

  const updateTrade = async (updates: UserTradeUpdate) => {
    if (!userId.value) return { error: "User not authenticated" };

    const { error } = await supabase
      .from("user_trades")
      .update({
        id: userId.value,
        ...updates,
      })
      .eq("id", userId.value);

    if (!error) {
      await refreshActiveTrade();
    }

    return { error };
  };

  return {
    activeTrade,
    refreshActiveTrade,
    updateTrade,
  };
};
