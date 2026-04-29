<script setup lang="ts">
import { ref, watch } from "vue";
import { useSupabaseClient } from "#imports";
import { useUserId } from "~/composables/useUserId";
import { useProfile } from "~/composables/useProfile";
import type { Database } from "~/types/database.types";
import type { Profile } from "~/types/database.friendly.types";
import SubAccountsSettings from "~/features/user-profile/SubAccountsSettings.vue";

const props = defineProps<{
  profile: Profile | null;
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const supabase = useSupabaseClient<Database>();
const userId = useUserId();
const { refreshProfile } = useProfile();
const toast = useToast();

const discordWebhookUrl = ref(props.profile?.discord_webhook_url || "");

watch(
  () => props.profile,
  (newProfile) => {
    if (newProfile) {
      discordWebhookUrl.value = newProfile.discord_webhook_url || "";
    }
  },
  { immediate: true }
);

const saveProfile = async () => {
  if (!userId.value) return;
  const { error } = await supabase
    .from("profiles")
    .update({
      discord_webhook_url: discordWebhookUrl.value,
    })
    .eq("id", userId.value);

  if (error) {
    toast.add({
      title: "Error",
      description: error.message,
      color: "error",
    });
    return;
  }

  await refreshProfile();
  emit("refresh");
  toast.add({
    title: "Profile Updated",
    description: "Your settings have been saved.",
    color: "success",
  });
};
</script>

<template>
  <div class="space-y-8">
    <UCard title="Notification Settings">
      <template #header>
        <h2 class="text-xl font-bold">Notification Settings</h2>
      </template>
      <div class="space-y-4">
        <UFormField
          label="Discord Webhook URL"
          description="Get alerts directly in your Discord channel."
        >
          <UInput
            v-model="discordWebhookUrl"
            placeholder="https://discord.com/api/webhooks/..."
          />
        </UFormField>

        <UButton color="primary" block @click="saveProfile">Save Changes</UButton>
      </div>
    </UCard>

    <SubAccountsSettings @refresh="emit('refresh')" />
  </div>
</template>
