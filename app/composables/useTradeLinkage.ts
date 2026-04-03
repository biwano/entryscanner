import { ref, watch, type Ref } from "vue";
import { calculateROI } from "~/utils/trading/trading";

export interface TradeLinkageOptions {
  basePrice: Ref<number>;
  leverage: Ref<number>;
  direction: Ref<"long" | "short">;
  initialTpPct?: number;
  initialSlPct?: number;
  initialTpPrice?: number;
  initialSlPrice?: number;
}

export function useTradeLinkage(linkageOptions: TradeLinkageOptions) {
  const tpPrice = ref<number | undefined>(linkageOptions.initialTpPrice || 0);
  const slPrice = ref<number | undefined>(linkageOptions.initialSlPrice || 0);
  const tpPct = ref(linkageOptions.initialTpPct ?? 50);
  const slPct = ref(linkageOptions.initialSlPct ?? 10);
  const activeInput = ref<"pct" | "price">(
    (linkageOptions.initialTpPrice && linkageOptions.initialTpPrice > 0) ||
      (linkageOptions.initialSlPrice && linkageOptions.initialSlPrice > 0)
      ? "price"
      : "pct"
  );

  const updatePricesFromPcts = () => {
    const base = linkageOptions.basePrice.value;
    if (!base) return;

    const lev = linkageOptions.leverage.value;
    const dir = linkageOptions.direction.value;

    const tpMove = tpPct.value / 100 / (lev || 1);
    tpPrice.value = dir === "long" ? base * (1 + tpMove) : base * (1 - tpMove);

    const slMove = slPct.value / 100 / (lev || 1);
    slPrice.value = dir === "long" ? base * (1 - slMove) : base * (1 + slMove);
  };

  const updatePctsFromPrices = () => {
    const base = linkageOptions.basePrice.value;
    if (!base || !linkageOptions.leverage.value) return;

    const lev = linkageOptions.leverage.value;
    const dir = linkageOptions.direction.value;

    if (tpPrice.value) {
      tpPct.value = calculateROI(tpPrice.value, base, lev, dir, "tp");
    }

    if (slPrice.value) {
      slPct.value = calculateROI(slPrice.value, base, lev, dir, "sl");
    }
  };

  watch([tpPct, slPct], () => {
    if (activeInput.value === "pct") updatePricesFromPcts();
  });

  watch([tpPrice, slPrice], () => {
    if (activeInput.value === "price") updatePctsFromPrices();
  });

  watch(linkageOptions.leverage, () => {
    updatePctsFromPrices();
  });

  // Watch basePrice for initial setup in TradingControls
  watch(linkageOptions.basePrice, (newBase, oldBase) => {
    if (newBase && !oldBase && activeInput.value === "pct") {
      updatePricesFromPcts();
    }
  });

  return {
    tpPrice,
    slPrice,
    tpPct,
    slPct,
    activeInput,
    updatePricesFromPcts,
    updatePctsFromPrices,
  };
}
