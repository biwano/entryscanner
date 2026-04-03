import { ref, watch, type Ref } from "vue";

export interface TradeLinkageOptions {
  basePrice: Ref<number>;
  leverage: Ref<number>;
  direction: Ref<"long" | "short">;
  initialTpPct?: number;
  initialSlPct?: number;
  initialTpPrice?: number;
  initialSlPrice?: number;
}

export function useTradeLinkage(options: TradeLinkageOptions) {
  const tpPrice = ref<number | undefined>(options.initialTpPrice);
  const slPrice = ref<number | undefined>(options.initialSlPrice);
  const tpPct = ref(options.initialTpPct ?? 50);
  const slPct = ref(options.initialSlPct ?? 10);
  const activeInput = ref<"pct" | "price">(
    options.initialTpPrice || options.initialSlPrice ? "price" : "pct"
  );

  const updatePricesFromPcts = () => {
    const base = options.basePrice.value;
    if (!base) return;

    const lev = options.leverage.value;
    const dir = options.direction.value;

    const tpMove = tpPct.value / 100 / (lev || 1);
    tpPrice.value = dir === "long" ? base * (1 + tpMove) : base * (1 - tpMove);

    const slMove = slPct.value / 100 / (lev || 1);
    slPrice.value = dir === "long" ? base * (1 - slMove) : base * (1 + slMove);
  };

  const updatePctsFromPrices = () => {
    const base = options.basePrice.value;
    if (!base || !options.leverage.value) return;

    const lev = options.leverage.value;
    const dir = options.direction.value;

    if (tpPrice.value) {
      const tpMove =
        dir === "long"
          ? (tpPrice.value - base) / base
          : (base - tpPrice.value) / base;
      tpPct.value = Math.max(0, tpMove * lev * 100);
    }

    if (slPrice.value) {
      const slMove =
        dir === "long"
          ? (base - slPrice.value) / base
          : (slPrice.value - base) / base;
      slPct.value = Math.max(0, slMove * lev * 100);
    }
  };

  watch([tpPct, slPct], () => {
    if (activeInput.value === "pct") updatePricesFromPcts();
  });

  watch([tpPrice, slPrice], () => {
    if (activeInput.value === "price") updatePctsFromPrices();
  });

  watch(options.leverage, () => {
    updatePctsFromPrices();
  });

  // Watch basePrice for initial setup in TradingControls
  watch(options.basePrice, (newBase, oldBase) => {
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
