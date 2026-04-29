import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types.js";

export const getSupabaseServiceClient = () => {
  const config = useRuntimeConfig();
  const url = config.public.supabase?.url;
  const envServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const serviceKey =
    typeof envServiceKey === "string" && envServiceKey.length > 0
      ? envServiceKey
      : config.supabase?.serviceKey;

  if (typeof url !== "string" || typeof serviceKey !== "string") {
    throw new Error("Supabase URL or service key is missing from runtime config");
  }

  return createClient<Database>(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};
