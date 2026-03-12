import { ref } from "vue";

const isSidebarOpen = ref(false);
const colorMode = ref<"light" | "dark" | "system">("system");

export const useUIStore = () => {
  function toggleSidebar() {
    isSidebarOpen.value = !isSidebarOpen.value;
  }

  function setColorMode(mode: "light" | "dark" | "system") {
    colorMode.value = mode;
  }

  return {
    isSidebarOpen,
    colorMode,
    toggleSidebar,
    setColorMode,
  };
};
