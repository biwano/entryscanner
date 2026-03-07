<script setup lang="ts">
import { useAsyncData } from "#app";
import { useSupabaseClient, useSupabaseUser } from "#imports";
import { Auth } from "@supa-kit/auth-ui-vue";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import type { Database } from "~/types/database.types.js";
import type { 
  Profile, 
  UserSubscription, 
  NotificationHistory 
} from "~/types/database.friendly.types.js";
import ProfileSettings from "~/features/user-profile/ProfileSettings.vue";
import SubscriptionList from "~/features/subscriptions/SubscriptionList.vue";
import NotificationHistoryComponent from "~/features/user-profile/NotificationHistory.vue";

const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();
const userId = useUserId();
const colorMode = useColorMode();

const { data: profile, refresh: refreshProfile } = await useAsyncData<Profile | null>(
  "profile",
  async () => {
    if (!userId.value) return null;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId.value)
      .single();
    return data;
  }
);

const { data: subscriptions, refresh: refreshSubscriptions } =
  await useAsyncData<UserSubscription[]>("subscriptions", async () => {
    if (!userId.value) return [];
    const { data } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId.value);
    return data || [];
  });

type NotificationWithEvent = NotificationHistory & {
  event: {
    status: string;
  } | null;
};

const { data: notifications } = await useAsyncData<NotificationWithEvent[]>(
  "notification_history_profile",
  async () => {
    if (!userId.value) return [];
    const { data } = await supabase
      .from("notification_history")
      .select(
        `
      *,
      event:events (status)
    `
      )
      .eq("user_id", userId.value)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .returns<NotificationWithEvent[]>();
    return data || [];
  }
);

const logout = async () => {
  await supabase.auth.signOut();
};
</script>

<template>
  <div class="space-y-8">
    <div
      v-if="!user"
      class="flex flex-col items-center justify-center py-20 text-center space-y-6"
    >
      <UIcon name="i-lucide-lock" class="w-12 h-12 text-gray-400" />
      <div class="space-y-2">
        <h1 class="text-2xl font-bold">Authentication Required</h1>
        <p class="text-gray-500 max-w-sm">
          Sign in to manage your subscriptions and notification settings.
        </p>
      </div>

      <UCard class="w-full max-w-sm p-4">
        <Auth
          :supabase-client="supabase"
          :providers="[]"
          :dark="colorMode.value === 'dark'"
          :appearance="{
            theme: ThemeSupa,
            brand: 'fuchsia',
          }"
          theme="default"
        />
      </UCard>
    </div>

    <div v-else class="space-y-8">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">Your Profile</h1>
        <UButton
          color="error"
          variant="subtle"
          icon="i-lucide-log-out"
          @click="logout"
          >Logout</UButton
        >
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-8">
          <ProfileSettings
            :profile="profile || null"
            @refresh="refreshProfile"
          />

          <SubscriptionList
            :subscriptions="subscriptions || []"
            @refresh="refreshSubscriptions"
          />
        </div>

        <div class="space-y-8">
          <NotificationHistoryComponent
            :notifications="notifications || []"
          />
        </div>
      </div>
    </div>
  </div>
</template>
