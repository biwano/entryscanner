import { defineStore } from 'pinia';

export const useUIStore = defineStore('ui', {
  state: () => ({
    isSidebarOpen: false,
    colorMode: 'system' as 'light' | 'dark' | 'system',
  }),
  actions: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen;
    },
    setColorMode(mode: 'light' | 'dark' | 'system') {
      this.colorMode = mode;
    }
  }
});
