<script setup lang="ts">
/**
 * A reusable sort button component for UTable (TanStack Table) headers.
 */
type SortDirection = "asc" | "desc" | false;
type SortableColumn = {
  getIsSorted: () => SortDirection;
  toggleSorting: (desc: boolean) => void;
};

defineProps<{
  /** The column object provided by the header slot */
  column: SortableColumn;
  /** The text label to display on the button */
  label: string;
}>();
</script>

<template>
  <UButton
    color="neutral"
    variant="ghost"
    :label="label"
    :icon="
      column.getIsSorted()
        ? column.getIsSorted() === 'asc'
          ? 'i-lucide-arrow-up-narrow-wide'
          : 'i-lucide-arrow-down-wide-narrow'
        : 'i-lucide-arrow-up-down'
    "
    class="-mx-2.5"
    @click="column.toggleSorting(column.getIsSorted() === 'asc')"
  />
</template>
