<script setup lang="ts">
import { ref } from 'vue';
import { useAsyncData } from '#app';
import { useSupabaseClient, useSupabaseUser } from '#imports';

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const { data: profile, refresh: refreshProfile } = await useAsyncData('profile', async () => {
  if (!user.value) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.value.id).single();
  return data;
});

const { data: subscriptions, refresh: refreshSubscriptions } = await useAsyncData('subscriptions', async () => {
  if (!user.value) return [];
  const { data } = await supabase.from('user_subscriptions').select('*').eq('user_id', user.value.id);
  return data || [];
});

const { data: notifications } = await useAsyncData('notification_history_profile', async () => {
  if (!user.value) return [];
  const { data } = await supabase
    .from('notification_history')
    .select(`
      *,
      trend:trends (*)
    `)
    .eq('user_id', user.value.id)
    .order('triggered_at', { ascending: false });
  return data || [];
});

const discordWebhookUrl = ref(profile.value?.discord_webhook_url || '');
const walletAddress = ref(profile.value?.wallet_address || '');

const saveProfile = async () => {
    if (!user.value) return;
    await supabase.from('profiles').update({
        discord_webhook_url: discordWebhookUrl.value,
        wallet_address: walletAddress.value
    }).eq('id', user.value.id);
    await refreshProfile();
    // Show success notification
}

const connectWallet = async () => {
    if ((window as any).ethereum) {
        try {
            const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
                walletAddress.value = accounts[0];
            }
        } catch (err) {
            console.error('Wallet connection failed:', err);
        }
    } else {
        alert('MetaMask or Rabby not found!');
    }
}

const loginWithGithub = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'github' });
}

const logout = async () => {
    await supabase.auth.signOut();
}

const formatRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
    return `${diffHours}h`;
}
</script>

<template>
  <div class="space-y-8">
    <div v-if="!user" class="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <UIcon name="i-lucide-lock" class="w-12 h-12 text-gray-400" />
      <h1 class="text-2xl font-bold">Authentication Required</h1>
      <p class="text-gray-500 max-w-sm">Sign in to manage your subscriptions and notification settings.</p>
      <UButton size="lg" color="neutral" icon="i-lucide-github" @click="loginWithGithub">Continue with GitHub</UButton>
    </div>

    <div v-else class="space-y-8">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">Your Profile</h1>
        <UButton color="red" variant="subtle" icon="i-lucide-log-out" @click="logout">Logout</UButton>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-8">
          <UCard title="Notification Settings">
            <template #header>
              <h2 class="text-xl font-bold">Notification Settings</h2>
            </template>
            <div class="space-y-4">
              <UFormField label="Discord Webhook URL" description="Get alerts directly in your Discord channel.">
                <UInput v-model="discordWebhookUrl" placeholder="https://discord.com/api/webhooks/..." />
              </UFormField>
              
              <UFormField label="Wallet Address" description="Connect your Web3 wallet (MetaMask, Rabby).">
                <div class="flex gap-2">
                  <UInput v-model="walletAddress" placeholder="0x..." class="flex-grow" />
                  <UButton color="neutral" variant="outline" icon="i-lucide-wallet" @click="connectWallet">Connect</UButton>
                </div>
              </UFormField>

              <UButton color="primary" block @click="saveProfile">Save Changes</UButton>
            </div>
          </UCard>

          <UCard title="Active Subscriptions">
            <template #header>
              <h2 class="text-xl font-bold">Active Subscriptions</h2>
            </template>
            <div class="divide-y divide-gray-100 dark:divide-gray-800">
              <div v-for="sub in subscriptions" :key="sub.id" class="flex items-center justify-between py-3">
                <div class="flex items-center gap-3">
                  <span class="font-bold">{{ sub.coin }}</span>
                  <UBadge size="xs" color="neutral" variant="outline">{{ sub.timeframe }}</UBadge>
                </div>
                <UButton size="xs" color="red" variant="ghost" icon="i-lucide-trash" />
              </div>
              <div v-if="subscriptions.length === 0" class="py-10 text-center text-gray-500 text-sm">
                No active subscriptions. Go to the dashboard to subscribe to trend flips.
              </div>
            </div>
          </UCard>
        </div>

        <div class="space-y-8">
          <UCard title="Notification History">
            <template #header>
              <h2 class="text-xl font-bold">Notification History</h2>
            </template>
            <div class="space-y-4 max-h-[600px] overflow-y-auto">
              <div v-for="notif in notifications" :key="notif.id" class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <div class="flex justify-between items-start">
                  <span class="text-xs text-gray-500">{{ formatRelativeTime(notif.triggered_at) }} ago</span>
                  <UBadge :color="notif.trend?.status === 'bullish' ? 'green' : 'red'" size="xs" variant="subtle">
                    {{ notif.trend?.status?.toUpperCase() }}
                  </UBadge>
                </div>
                <p class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ notif.message }}</p>
                <div class="mt-1 text-[10px] text-gray-400 font-mono">{{ notif.id }}</div>
              </div>
              
              <div v-if="notifications.length === 0" class="py-10 text-center text-gray-500 text-sm">
                No notifications triggered yet.
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
