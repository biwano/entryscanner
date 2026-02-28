import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

export const getSupabaseServiceClient = () => {
  const config = useRuntimeConfig();
  const publicConfig = config.public as any;
  const privateConfig = config as any;

  return createClient<Database>(
    publicConfig.supabase.url,
    process.env.SUPABASE_SERVICE_KEY || privateConfig.supabase.serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};
