<script setup lang="ts">
import { computed } from "vue";
import { useSupabaseClient } from "#imports";
import { useUserId } from "~/composables/useUserId.js";
import type { Database } from "~/types/database.types.js";
import type { UserSubscription } from "~/types/database.friendly.types.js";

const props = defineProps<{
  coin: string;
  timeframe: "D1" | "W1";
  subscriptions: UserSubscription[];
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const supabase = useSupabaseClient<Database>();
const userId = useUserId();

const isSubscribed = computed(() => {
  return props.subscriptions.some(
    (s) => s.coin === props.coin && s.timeframe === props.timeframe
  );
});

const toggleSubscription = async () => {
  if (!userId.value) {
    alert("Please log in to subscribe to alerts!");
    return;
  }

  if (isSubscribed.value) {
    const sub = props.subscriptions.find(
      (s) => s.coin === props.coin && s.timeframe === props.timeframe
    );
    if (sub) {
      await supabase.from("user_subscriptions")
        .delete()
        .eq("id", sub.id);
    }
  } else {
    await supabase.from("user_subscriptions").insert({
      user_id: userId.value,
      coin: props.coin,
      timeframe: props.timeframe,
    });
  }
  emit("refresh");
};
</script>

<template>
  <UButton
    size="xs"
    :color="isSubscribed ? 'primary' : 'neutral'"
    :variant="isSubscribed ? 'solid' : 'ghost'"
    :icon="isSubscribed ? 'i-lucide-bell' : 'i-lucide-bell-off'"
    @click="toggleSubscription"
  >
    {{ timeframe }}
  </UButton>
</template>
