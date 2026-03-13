<script setup lang="ts">
import { ref } from "vue";
import { useSupabaseClient } from "#imports";
import { useUserId } from "~/composables/useUserId";
import { useTrading } from "~/composables/useTrading";
import { useProfile } from "~/composables/useProfile";
import type { Database } from "~/types/database.types";
import type { Profile } from "~/types/database.friendly.types";

const props = defineProps<{
  profile: Profile | null;
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const supabase = useSupabaseClient<Database>();
const userId = useUserId();
const { refreshProfile } = useProfile();
const { refreshTrading } = useTrading();
const toast = useToast();

const discordWebhookUrl = ref(props.profile?.discord_webhook_url || "");
const hlApiKey = ref(props.profile?.hl_api_key || "");
const hlWalletAddress = ref(props.profile?.hl_wallet_address || "");

const saveProfile = async () => {
  if (!userId.value) return;
  const { error } = await supabase
    .from("profiles")
    .update({
      discord_webhook_url: discordWebhookUrl.value,
      hl_api_key: hlApiKey.value,
      hl_wallet_address: hlWalletAddress.value,
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
  await refreshTrading();
  emit("refresh");
  toast.add({
    title: "Profile Updated",
    description: "Your settings have been saved.",
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

      <UFormField
        label="Hyperliquid Wallet Address"
        description="Your public wallet address for read-only requests."
      >
        <UInput v-model="hlWalletAddress" placeholder="0x..." />
      </UFormField>

      <UFormField
        label="Hyperliquid API Key"
        description="Enter your Hyperliquid API wallet private key to sign actions (optional)."
      >
        <UInput v-model="hlApiKey" type="password" placeholder="0x..." />
      </UFormField>

      <UButton color="primary" block @click="saveProfile">Save Changes</UButton>
    </div>
  </UCard>
</template>
