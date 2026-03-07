<script setup lang="ts">
import { computed } from "vue";
/**
 * A reusable component to display a coin's avatar (first letter) and name.
 */
const props = withDefaults(
  defineProps<{
    /** The name of the coin (e.g., 'BTC', 'ETH') */
    coin: string;
    /** The size of the avatar and text */
    size?: "sm" | "md" | "lg" | "xl";
    /** If true, the coin name will be hidden, only showing the avatar */
    hideName?: boolean;
    /** Additional classes for the name text */
    nameClass?: string;
  }>(),
  {
    size: "md",
    hideName: false,
    nameClass: "",
  }
);

const containerClasses = computed(() => {
  switch (props.size) {
    case "sm":
      return "gap-2";
    case "lg":
      return "gap-4";
    case "xl":
      return "gap-5";
    default:
      return "gap-3";
  }
});

const avatarClasses = computed(() => {
  switch (props.size) {
    case "sm":
      return "w-6 h-6 text-[10px]";
    case "lg":
      return "w-10 h-10 text-sm";
    case "xl":
      return "w-12 h-12 text-base";
    default:
      return "w-8 h-8 text-xs";
  }
});

const nameClasses = computed(() => {
  if (props.nameClass) return props.nameClass;
  switch (props.size) {
    case "sm":
      return "text-sm";
    case "lg":
      return "text-2xl font-bold";
    case "xl":
      return "text-3xl font-bold";
    default:
      return "font-semibold text-gray-900 dark:text-white";
  }
});
</script>

<template>
  <div class="flex items-center" :class="containerClasses">
    <div
      class="rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary"
      :class="avatarClasses"
    >
      {{ coin[0] }}
    </div>
    <span v-if="!hideName" :class="nameClasses">
      {{ coin }}
    </span>
  </div>
</template>
