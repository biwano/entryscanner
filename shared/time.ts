import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import localizedFormat from "dayjs/plugin/localizedFormat.js";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

export const formatRelativeTime = (timestamp?: string | number | null) => {
  if (!timestamp) return "N/A";
  return dayjs(timestamp).fromNow(true);
};

export const formatDate = (
  timestamp?: string | number | null,
  formatStr: string = "YYYY-MM-DD HH:mm:ss"
) => {
  if (!timestamp) return "N/A";
  return dayjs(timestamp).format(formatStr);
};
