<script setup lang="ts">
import { ref } from "vue";
import { useSupabaseClient } from "#imports";
import { useUserId } from "~/composables/useUserId";
import { useTrading } from "~/composables/useTrading";
import { useSubAccounts } from "~/composables/useSubAccounts";
import type { Database } from "~/types/database.types";
import type { UserSubAccount } from "~/types/database.friendly.types";

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const supabase = useSupabaseClient<Database>();
const userId = useUserId();
const { refreshTrading } = useTrading();
const {
  subAccounts,
  refreshSubAccounts,
  activeSubAccount,
  setActiveSubAccount,
  selectedSubAccountId,
} = useSubAccounts();
const toast = useToast();

const isCreateModalOpen = ref(false);
const isEditModalOpen = ref(false);
const newLabel = ref("");
const newApiKey = ref("");
const newWalletAddress = ref("");
const editAccountId = ref<string | null>(null);
const editLabel = ref("");
const editApiKey = ref("");
const editWalletAddress = ref("");

const createSubAccount = async () => {
  if (!userId.value) return;
  const label = newLabel.value.trim();
  const apiKey = newApiKey.value.trim();
  const walletAddress = newWalletAddress.value.trim();
  if (!label || !apiKey || !walletAddress) {
    toast.add({
      title: "Missing fields",
      description: "Label, API key, and wallet address are required.",
      color: "error",
    });
    return;
  }

  const { data, error } = await supabase
    .from("user_sub_accounts")
    .insert({
      user_id: userId.value,
      label,
      hl_api_key: apiKey,
      hl_wallet_address: walletAddress,
    })
    .select()
    .single();

  if (error || !data) {
    toast.add({
      title: "Error",
      description: error?.message ?? "Failed to create sub-account.",
      color: "error",
    });
    return;
  }

  await refreshSubAccounts();
  setActiveSubAccount(data.id);
  await refreshTrading();
  emit("refresh");
  resetCreateForm();
  isCreateModalOpen.value = false;
  toast.add({
    title: "Sub-account created",
    description: "Your account has been created and selected.",
    color: "success",
  });
};

const resetCreateForm = () => {
  newLabel.value = "";
  newApiKey.value = "";
  newWalletAddress.value = "";
};

const startEdit = (account: UserSubAccount) => {
  editAccountId.value = account.id;
  editLabel.value = account.label;
  editApiKey.value = account.hl_api_key;
  editWalletAddress.value = account.hl_wallet_address;
  isEditModalOpen.value = true;
};

const cancelEdit = () => {
  isEditModalOpen.value = false;
  editAccountId.value = null;
  editLabel.value = "";
  editApiKey.value = "";
  editWalletAddress.value = "";
};

const saveEdit = async () => {
  if (!editAccountId.value) return;
  const label = editLabel.value.trim();
  const apiKey = editApiKey.value.trim();
  const walletAddress = editWalletAddress.value.trim();
  if (!label || !apiKey || !walletAddress) {
    toast.add({
      title: "Missing fields",
      description: "Label, API key, and wallet address are required.",
      color: "error",
    });
    return;
  }

  const { error } = await supabase
    .from("user_sub_accounts")
    .update({
      label,
      hl_api_key: apiKey,
      hl_wallet_address: walletAddress,
    })
    .eq("id", editAccountId.value);

  if (error) {
    toast.add({
      title: "Error",
      description: error.message,
      color: "error",
    });
    return;
  }

  await refreshSubAccounts();
  await refreshTrading();
  emit("refresh");
  cancelEdit();
  toast.add({
    title: "Sub-account updated",
    description: "Changes saved successfully.",
    color: "success",
  });
};

const deleteSubAccount = async (account: UserSubAccount) => {
  if (!confirm(`Delete sub-account "${account.label}"?`)) return;
  const { error } = await supabase
    .from("user_sub_accounts")
    .delete()
    .eq("id", account.id);

  if (error) {
    toast.add({
      title: "Error",
      description: error.message,
      color: "error",
    });
    return;
  }

  if (selectedSubAccountId.value === account.id) {
    selectedSubAccountId.value = null;
  }

  await refreshSubAccounts();
  await refreshTrading();
  emit("refresh");
  toast.add({
    title: "Sub-account deleted",
    description: "The account has been removed.",
    color: "success",
  });
};
</script>

<template>
  <UCard title="Hyperliquid Sub-Accounts">
    <template #header>
      <h2 class="text-xl font-bold">Hyperliquid Sub-Accounts</h2>
    </template>

    <div class="space-y-4">
      <div class="text-sm text-gray-500">
        Active account:
        <span class="font-medium text-gray-900 dark:text-white">
          {{ activeSubAccount?.label || "None" }}
        </span>
      </div>

      <div
        v-for="account in subAccounts || []"
        :key="account.id"
        class="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="font-semibold">{{ account.label }}</div>
            <div class="text-xs text-gray-500">
              {{ account.hl_wallet_address }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              color="primary"
              variant="soft"
              :disabled="activeSubAccount?.id === account.id"
              @click="setActiveSubAccount(account.id)"
            >
              {{ activeSubAccount?.id === account.id ? "Active" : "Select" }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="startEdit(account)"
            >
              Edit
            </UButton>
            <UButton
              size="xs"
              color="error"
              variant="soft"
              @click="deleteSubAccount(account)"
            >
              Delete
            </UButton>
          </div>
        </div>
      </div>

      <div
        v-if="!subAccounts || subAccounts.length === 0"
        class="text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4"
      >
        No sub-accounts yet. Create one to enable trading features.
      </div>

      <div class="flex justify-end">
        <UButton color="primary" block @click="isCreateModalOpen = true">
          Create New Sub-Account
        </UButton>
      </div>

      <UModal
        :open="isCreateModalOpen"
        description="Add a new account to use for wallet info and trading."
        @update:open="isCreateModalOpen = $event"
      >
        <template #title>
          <span class="font-semibold">Create New Sub-Account</span>
        </template>

        <template #body>
          <div class="space-y-3">
            <UFormField label="Label">
              <UInput v-model="newLabel" class="w-full" placeholder="Main account" />
            </UFormField>
            <UFormField label="Wallet address">
              <UInput v-model="newWalletAddress" class="w-full" placeholder="0x..." />
            </UFormField>
            <UFormField label="API key">
              <UInput v-model="newApiKey" class="w-full" type="password" placeholder="0x..." />
            </UFormField>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton
              color="neutral"
              variant="soft"
              @click="
                isCreateModalOpen = false;
                resetCreateForm();
              "
            >
              Cancel
            </UButton>
            <UButton color="primary" @click="createSubAccount"
              >Create Account</UButton
            >
          </div>
        </template>
      </UModal>

      <UModal
        :open="isEditModalOpen"
        description="Update this account's label, wallet address, and API key."
        @update:open="
          if (!$event) {
            cancelEdit();
          }
        "
      >
        <template #title>
          <span class="font-semibold">Update Sub-Account</span>
        </template>

        <template #body>
          <div class="space-y-3">
            <UFormField label="Label">
              <UInput v-model="editLabel" class="w-full" placeholder="Main account" />
            </UFormField>
            <UFormField label="Wallet address">
              <UInput v-model="editWalletAddress" class="w-full" placeholder="0x..." />
            </UFormField>
            <UFormField label="API key">
              <UInput
                v-model="editApiKey"
                class="w-full"
                type="password"
                placeholder="0x..."
              />
            </UFormField>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              @click="cancelEdit"
            >
              Cancel
            </UButton>
            <UButton size="sm" color="primary" @click="saveEdit">Save</UButton>
          </div>
        </template>
      </UModal>
    </div>
  </UCard>
</template>
