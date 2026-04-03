export const calculateROI = (
  price: number | undefined,
  base: number,
  lev: number,
  dir: "long" | "short",
  type: "tp" | "sl" = "tp"
) => {
  if (!price || !base || !lev) return 0;
  let move = 0;
  if (type === "tp") {
    move = dir === "long" ? (price - base) / base : (base - price) / base;
  } else {
    move = dir === "long" ? (base - price) / base : (price - base) / base;
  }
  return Math.max(0, move * lev * 100);
};
