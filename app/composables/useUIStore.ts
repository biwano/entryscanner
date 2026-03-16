import { ref } from "vue";
import { useLocalStorage } from "@vueuse/core";

const isSidebarOpen = ref(false);
const colorMode = ref<"light" | "dark" | "system">("system");
const isPrivacyMode = useLocalStorage("privacy-mode", false);

export const useUIStore = () => {
  function toggleSidebar() {
    isSidebarOpen.value = !isSidebarOpen.value;
  }

  function setColorMode(mode: "light" | "dark" | "system") {
    colorMode.value = mode;
  }

  function togglePrivacyMode() {
    isPrivacyMode.value = !isPrivacyMode.value;
  }

  return {
    isSidebarOpen,
    colorMode,
    isPrivacyMode,
    toggleSidebar,
    setColorMode,
    togglePrivacyMode,
  };
};
