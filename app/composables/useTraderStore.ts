import { useLocalStorage } from "~/composables/useLocalStorage";

export interface TraderLog {
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

// State defined outside the composable to make it shared/global
const logs = useLocalStorage<TraderLog[]>("trader_logs", []);

export const useTraderStore = () => {
  function addLog(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
    replacePrefix?: string
  ) {
    if (
      replacePrefix &&
      logs.value[0] &&
      logs.value[0].message.startsWith(replacePrefix)
    ) {
      logs.value[0] = {
        timestamp: new Date().toISOString(),
        message,
        type,
      };
      return;
    }
    logs.value.unshift({
      timestamp: new Date().toISOString(),
      message,
      type,
    });
    // Keep only last 100 logs
    if (logs.value.length > 100) {
      logs.value = logs.value.slice(0, 100);
    }
  }

  function clearLogs() {
    logs.value = [];
  }

  return {
    logs,
    addLog,
    clearLogs,
  };
};
