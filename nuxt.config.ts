import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  alias: {
    '#shared': fileURLToPath(new URL('./shared', import.meta.url))
  },
  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
  ],
  supabase: {
    redirect: false, // For now, we'll handle redirects manually if needed
  },
  nitro: {
    experimental: {
      tasks: true
    },
    scheduledTasks: {
      '*/5 * * * *': ['trend-worker'], // Every 5 minutes
      '*/10 * * * *': ['notification-dispatcher'] // Every 10 minutes
    }
  },
  devtools: { enabled: true }
})
