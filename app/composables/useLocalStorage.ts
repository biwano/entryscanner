import { ref, watch } from "#imports";

const localStorageRefs = new Map<string, ReturnType<typeof ref>>();

/**
 * A simple hook for persisting a value to localStorage.
 * Only works on the client-side.
 *
 * @param key The localStorage key to use.
 * @param initialValue The initial value to use if no value is found in localStorage.
 * @returns A reactive ref containing the persisted value.
 */
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const existingRef = localStorageRefs.get(key);
  if (existingRef) {
    return existingRef;
  }

  const storedValue = ref<T>(initialValue);

  // Initialize from localStorage immediately if on client-side
  if (import.meta.client) {
    const savedValue = localStorage.getItem(key);
    if (savedValue) {
      try {
        storedValue.value = JSON.parse(savedValue);
      } catch (e) {
        console.error(
          `[useLocalStorage] Failed to parse saved value for key "${key}"`,
          e
        );
      }
    }
  }

  // Watch for changes and persist to localStorage
  watch(
    storedValue,
    (newValue) => {
      if (import.meta.client) {
        localStorage.setItem(key, JSON.stringify(newValue));
      }
    },
    { deep: true }
  );

  localStorageRefs.set(key, storedValue);

  return storedValue;
};
