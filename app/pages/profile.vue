<script setup lang="ts">
import { useAsyncData } from "#app";
import { useSupabaseClient, useSupabaseUser } from "#imports";
import { Auth } from "@supa-kit/auth-ui-vue";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import type { Database } from "~/types/database.types";
import type { 
  Profile, 
  UserSubscription, 
  NotificationHistory 
} from "~/types/database.friendly.types.js";
import ProfileSettings from "~/features/user-profile/ProfileSettings.vue";
import SubscriptionList from "~/features/subscriptions/SubscriptionList.vue";
import NotificationHistoryComponent from "~/features/user-profile/NotificationHistory.vue";

import { useProfile } from "~/composables/useProfile";

const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();
const userId = useUserId();
const colorMode = useColorMode();

const { profile, refreshProfile, pendingProfile } = useProfile();
const url = useRequestURL();
const redirectTo = `${url.origin}/auth/reset-password`;

const { data: subscriptions, refresh: refreshSubscriptions, pending: pendingSubscriptions } =
  useAsyncData<UserSubscription[]>("subscriptions", async () => {
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

const { data: notifications, pending: pendingNotifications } = useAsyncData<NotificationWithEvent[]>(
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
          :redirect-to="redirectTo"
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
          <UCard v-if="pendingProfile">
            <template #header>
              <USkeleton class="h-7 w-48" />
            </template>
            <div class="space-y-6">
              <div v-for="i in 3" :key="i" class="space-y-2">
                <USkeleton class="h-4 w-32" />
                <USkeleton class="h-10 w-full" />
              </div>
              <USkeleton class="h-10 w-full mt-4" />
            </div>
          </UCard>
          <ProfileSettings
            v-else
            :profile="profile || null"
            @refresh="refreshProfile"
          />

          <UCard v-if="pendingSubscriptions">
            <template #header>
              <USkeleton class="h-7 w-48" />
            </template>
            <div class="divide-y divide-gray-100 dark:divide-gray-800">
              <div
                v-for="i in 3"
                :key="i"
                class="flex items-center justify-between py-3"
              >
                <div class="flex items-center gap-3">
                  <USkeleton class="h-5 w-12" />
                  <USkeleton class="h-5 w-8 rounded-full" />
                </div>
                <USkeleton class="h-8 w-8 rounded-md" />
              </div>
            </div>
          </UCard>
          <SubscriptionList
            v-else
            :subscriptions="subscriptions || []"
            @refresh="refreshSubscriptions"
          />
        </div>

        <div class="space-y-8">
          <UCard v-if="pendingNotifications">
            <template #header>
              <USkeleton class="h-7 w-48" />
            </template>
            <div class="space-y-4">
              <div
                v-for="i in 4"
                :key="i"
                class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 space-y-3"
              >
                <div class="flex justify-between items-start">
                  <USkeleton class="h-3 w-20" />
                  <USkeleton class="h-5 w-16 rounded-full" />
                </div>
                <USkeleton class="h-4 w-3/4" />
              </div>
            </div>
          </UCard>
          <NotificationHistoryComponent
            v-else
            :notifications="notifications || []"
          />
        </div>
      </div>
    </div>
  </div>
</template>
