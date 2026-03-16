<script setup lang="ts">
import { ref, onMounted } from "vue";
const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const password = ref("");
const confirmPassword = ref("");
const isLoading = ref(false);

onMounted(async () => {
  const code = route.query.code as string;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      toast.add({
        title: "Reset Link Invalid",
        description: "The password reset link is invalid or has expired. Please request a new one.",
        color: "error",
      });
      router.push("/profile");
    }
  } else {
    // If no code, check if we already have a session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/profile");
    }
  }
});

const resetPassword = async () => {
  if (password.value !== confirmPassword.value) {
    toast.add({
      title: "Error",
      description: "Passwords do not match.",
      color: "error",
    });
    return;
  }

  isLoading.value = true;
  const { error } = await supabase.auth.updateUser({
    password: password.value,
  });

  isLoading.value = false;

  if (error) {
    toast.add({
      title: "Error",
      description: error.message,
      color: "error",
    });
    return;
  }

  toast.add({
    title: "Password Updated",
    description: "Your password has been successfully reset. You can now log in.",
    color: "success",
  });

  router.push("/profile");
};
</script>

<template>
  <div class="flex flex-col items-center justify-center py-20">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="flex flex-col items-center text-center space-y-2">
          <UIcon name="i-lucide-key-round" class="w-10 h-10 text-primary" />
          <h1 class="text-2xl font-bold">Reset Password</h1>
          <p class="text-gray-500">Enter your new password below.</p>
        </div>
      </template>

      <form @submit.prevent="resetPassword" class="space-y-4">
        <UFormField label="New Password">
          <UInput
            v-model="password"
            type="password"
            placeholder="Min 6 characters"
            required
          />
        </UFormField>

        <UFormField label="Confirm New Password">
          <UInput
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            required
          />
        </UFormField>

        <UButton
          type="submit"
          block
          color="primary"
          :loading="isLoading"
        >
          Update Password
        </UButton>
      </form>
    </UCard>
  </div>
</template>
