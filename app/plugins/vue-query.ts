import { VueQueryPlugin, QueryClient, hydrate, dehydrate, type DehydratedState } from '@tanstack/vue-query'
import { defineNuxtPlugin, useState } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5000,
      },
    },
  })
  const vueQueryState = useState<DehydratedState | undefined>('vue-query-state')

  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })

  if (import.meta.server) {
    nuxtApp.hooks.hook('app:rendered', () => {
      vueQueryState.value = dehydrate(queryClient)
    })
  }

  if (import.meta.client) {
    hydrate(queryClient, vueQueryState.value)
  }
})
