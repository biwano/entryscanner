import dayjs from "dayjs";

export const formatPrice = (price: string | number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(price));
};

export const formatVolume = (vol: string | number) => {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(vol));
};

export const formatPercentChange = (
  current: string | number,
  base: string | number
) => {
  const cur = Number(current);
  const b = Number(base);
  if (!b || isNaN(cur) || isNaN(b)) return "0.00%";

  const change = ((cur - b) / b) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
};

export const calculatePercentChange = (
  current: string | number,
  base: string | number
): number => {
  const cur = Number(current);
  const b = Number(base);
  if (!b || isNaN(cur) || isNaN(b)) return 0;

  return ((cur - b) / b) * 100;
};

export const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTime = (isoString: string) => {
  return dayjs(isoString).format("HH:mm:ss");
};
