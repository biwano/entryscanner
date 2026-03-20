import dayjs from "dayjs";

export const formatPrice = (price: string | number) => {
  const val = Number(price);
  if (isNaN(val)) return "$0.000";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumSignificantDigits: 4,
    maximumSignificantDigits: 8,
  }).format(val);
};

export const formatPriceNumber = (price: string | number) => {
  const val = Number(price);
  if (isNaN(val)) return "0.000";

  return new Intl.NumberFormat("en-US", {
    useGrouping: false,
    minimumSignificantDigits: 4,
    maximumSignificantDigits: 8,
  }).format(val);
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

/**
 * Ensures a price is formatted correctly for the Hyperliquid API:
 * 1. Max 5 significant figures
 * 2. Max decimal places = Math.max(0, 6 - szDecimals)
 * 3. Integer prices are always valid
 */
export const formatPriceForHL = (price: number, szDecimals: number): string => {
  if (isNaN(price)) return "0.0";

  // Integer prices are always valid, regardless of significant figures
  if (Number.isInteger(price)) {
    return price.toString();
  }

  // 1. Limit to 5 significant figures
  // Use toPrecision(5) which returns a string, then parse back to number
  const sigFigPrice = parseFloat(price.toPrecision(5));

  // 2. Limit decimals: MAX_DECIMALS - szDecimals
  // MAX_DECIMALS = 6 for perpetuals
  const maxDecimals = Math.max(0, 6 - szDecimals);
  const factor = Math.pow(10, maxDecimals);

  // Rounding to the allowed decimal precision
  const roundedPrice = Math.round(sigFigPrice * factor) / factor;

  // Use toFixed to ensure we don't use scientific notation and have the correct precision
  const formatted = roundedPrice.toFixed(maxDecimals);

  // Remove trailing zeros and possible decimal point for a clean output
  return formatted.replace(/\.?0+$/, "");
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
  return dayjs(isoString).format("MM/DD HH:mm:ss");
};
