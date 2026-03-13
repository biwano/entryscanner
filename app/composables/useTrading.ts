import { computed } from "vue";
import { useProfile } from "~/composables/useProfile";
import { PrivateKeySigner } from "@nktkas/hyperliquid/signing";
import { HyperliquidClient } from "~~shared/hyperliquid";
import { useAsyncData } from "#app";

export const useTrading = () => {
  const { profile } = useProfile();
  const hlClient = new HyperliquidClient();

  const wallet = computed(() => {
    if (!profile.value?.hl_api_key) return null;
    try {
      return new PrivateKeySigner(profile.value.hl_api_key);
    } catch (e) {
      console.error("Invalid HL API key", e);
      return null;
    }
  });

  const address = computed(() => {
    return profile?.value?.hl_wallet_address ?? null;
  });

  const {
    data: clearinghouse,
    refresh: refreshClearinghouse,
    status: chStatus,
  } = useAsyncData(
    "trading_clearinghouse",
    async () => {
      if (!address.value) return null;
      return await hlClient.fetchClearinghouseState(address.value);
    },
    {
      watch: [address],
    }
  );

  const {
    data: openOrders,
    refresh: refreshOpenOrders,
    status: ooStatus,
  } = useAsyncData(
    "trading_open_orders",
    async () => {
      if (!address.value) return null;
      return await hlClient.fetchOpenOrders(address.value);
    },
    {
      watch: [address],
    }
  );

  const isLoading = computed(
    () => chStatus.value === "pending" || ooStatus.value === "pending"
  );

  const refreshTrading = async () => {
    await Promise.all([refreshClearinghouse(), refreshOpenOrders()]);
  };

  return {
    wallet,
    address,
    clearinghouse,
    openOrders,
    isLoading,
    refreshTrading,
  };
};
