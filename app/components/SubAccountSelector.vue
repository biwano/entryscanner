<script setup lang="ts">
import { computed } from "vue";
import type { SelectMenuItem } from "@nuxt/ui";
import { useSubAccounts } from "~/composables/useSubAccounts";

type SubAccountOption = SelectMenuItem & { value: string };

const { subAccounts, activeSubAccount, setActiveSubAccount } = useSubAccounts();

const selected = computed<SubAccountOption | null>({
  get() {
    if (!activeSubAccount.value) return null;
    return {
      label: activeSubAccount.value.label,
      value: activeSubAccount.value.id,
    };
  },
  set(option) {
    if (option?.value) {
      setActiveSubAccount(option.value);
    }
  },
});

const options = computed(() => {
  return (subAccounts.value ?? []).map((account) => ({
    label: account.label,
    value: account.id,
  })) satisfies SubAccountOption[];
});
</script>

<template>
  <div v-if="options.length > 0" class="w-44">
    <USelectMenu
      v-model="selected"
      :items="options"
      placeholder="Select account"
      value-key="value"
      class="w-full"
    />
  </div>
</template>
