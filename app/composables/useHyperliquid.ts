import { useQuery } from '@tanstack/vue-query';
import { createInfoClient, fetchAllMids, fetchMetaAndAssetCtxs } from '#shared/hyperliquid';

export const useHyperliquid = () => {
  const client = createInfoClient();

  const useAllMids = () => {
    return useQuery({
      queryKey: ['allMids'],
      queryFn: () => fetchAllMids(client),
      refetchInterval: 50000, // Poll every 50 seconds
    });
  };

  const useMetaAndAssetCtxs = () => {
    return useQuery({
      queryKey: ['metaAndAssetCtxs'],
      queryFn: () => fetchMetaAndAssetCtxs(client),
      refetchInterval: 100000, // Poll every 100 seconds
    });
  };

  return {
    useAllMids,
    useMetaAndAssetCtxs,
  };
};
