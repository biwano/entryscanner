<script setup lang="ts">
import { ref } from "vue";
import { useSupabaseClient } from "#imports";
import { useUserId } from "~/composables/useUserId.js";
import type { Database } from "~/types/database.types.js";
import type { Profile } from "~/types/database.friendly.types.js";

const props = defineProps<{
  profile: Profile | null;
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const supabase = useSupabaseClient<Database>();
const userId = useUserId();
const toast = useToast();

const discordWebhookUrl = ref(props.profile?.discord_webhook_url || "");

const saveProfile = async () => {
  if (!userId.value) return;
  await supabase.from("profiles")
    .update({
      discord_webhook_url: discordWebhookUrl.value,
    })
    .eq("id", userId.value);
  emit("refresh");
  toast.add({
    title: "Profile Updated",
    description: "Your Discord webhook URL has been saved.",
    color: "success",
  });
};
</script>

<template>
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

      <UButton color="primary" block @click="saveProfile"
        >Save Changes</UButton
      >
    </div>
  </UCard>
</template>
